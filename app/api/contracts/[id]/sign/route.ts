import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

import { auth } from "@/lib/auth";
import {
  generateContractSignToken,
  signContract,
} from "@/lib/actions/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * In-app signing by the owner (WORKFLOW §6 "Со стороны меня — подписать свой
 * документ"). Auth-protected. Reuses the token machinery: generate a one-time
 * token (draft|sent → sent) then immediately consume it with the signature.
 */
type Body = {
  signerName?: unknown;
  signaturePng?: unknown;
};

const MAX_SIGNATURE_BYTES = 2 * 1024 * 1024;

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const match = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl.trim());
  if (!match || !match[1]) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
}

function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return req.headers.get("x-real-ip");
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Невалидный запрос" }, { status: 400 });
  }

  const signerName = typeof body.signerName === "string" ? body.signerName : "";
  const signaturePng = typeof body.signaturePng === "string" ? body.signaturePng : "";

  if (signerName.trim().length < 2 || !signaturePng) {
    return NextResponse.json(
      { ok: false, error: "Укажи имя и поставь подпись" },
      { status: 400 },
    );
  }

  const buffer = dataUrlToBuffer(signaturePng);
  if (!buffer) {
    return NextResponse.json(
      { ok: false, error: "Невалидное изображение подписи" },
      { status: 400 },
    );
  }
  if (buffer.length > MAX_SIGNATURE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Файл подписи слишком большой" },
      { status: 413 },
    );
  }

  // 1) Upload PNG FIRST. Если upload упадёт, мы ещё НЕ ротировали sign-токен,
  //    поэтому ранее выданная клиенту ссылка остаётся валидной.
  let blobUrl: string;
  try {
    const uploaded = await put(`signatures/${crypto.randomUUID()}.png`, buffer, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: false,
    });
    blobUrl = uploaded.url;
  } catch (err) {
    console.error("blob upload failed", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Не удалось сохранить подпись (хранилище недоступно). Проверь BLOB_READ_WRITE_TOKEN.",
      },
      { status: 502 },
    );
  }

  // 2) Issue a one-time token for this contract (draft|sent → sent).
  const tokenRes = await generateContractSignToken(id);
  if (!tokenRes.ok) {
    // PNG уже залит — чистим orphan, токен не ротирован.
    try {
      await del(blobUrl);
    } catch (err) {
      console.error("orphan blob cleanup failed", err);
    }
    return NextResponse.json({ ok: false, error: tokenRes.error }, { status: 409 });
  }

  // 3) Consume the token.
  const result = await signContract({
    token: tokenRes.data.token,
    signerName: signerName.trim(),
    signaturePng: blobUrl,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) {
    try {
      await del(blobUrl);
    } catch (err) {
      console.error("orphan blob cleanup failed", err);
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 410 });
  }

  return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
}
