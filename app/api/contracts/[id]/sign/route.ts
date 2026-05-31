import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

import { auth } from "@/lib/auth";
import { signContractAsProvider } from "@/lib/actions/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * In-app signing by the owner ("Подписать самому"). Auth-protected.
 * Это подпись ИСПОЛНИТЕЛЯ — пишется в provider*-поля договора и рендерится
 * в МОЕЙ колонке (Paslaugų teikėjas). Подпись заказчика ставится отдельно —
 * через публичную ссылку /sign/[token]. Status договора не меняется.
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

  // 1) Upload PNG to Vercel Blob first.
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

  // 2) Записываем подпись исполнителя в provider*-поля договора.
  const result = await signContractAsProvider({
    contractId: id,
    signerName: signerName.trim(),
    signaturePng: blobUrl,
  });

  if (!result.ok) {
    // Запись не удалась — чистим orphan PNG из Blob.
    try {
      await del(blobUrl);
    } catch (err) {
      console.error("orphan blob cleanup failed", err);
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 });
  }

  return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
}
