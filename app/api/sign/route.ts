import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";

import { signContract } from "@/lib/actions/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Public signature endpoint (no auth — guarded by the one-time sign token).
 * Flow (WORKFLOW §6):
 *   1. Client POSTs { token, signerName, signaturePng (data URL) }.
 *   2. We upload the PNG to Vercel Blob server-side (token stays on the server).
 *   3. We call signContract with the resulting Blob URL + ip/userAgent from headers.
 *   4. If signContract fails (token consumed/expired/invalid) we delete the
 *      orphan PNG from Blob and return 410.
 */
type Body = {
  token?: unknown;
  signerName?: unknown;
  signaturePng?: unknown; // data URL "data:image/png;base64,…"
  agreed?: unknown;
};

// ADR-023: подпись — небольшой PNG. Кап на server-side, т.к. endpoint публичный
// (unauthenticated upload surface). 2 MB с запасом покрывает любой canvas-PNG.
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

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Невалидный запрос" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token : "";
  const signerName = typeof body.signerName === "string" ? body.signerName : "";
  const signaturePng = typeof body.signaturePng === "string" ? body.signaturePng : "";

  if (!token || signerName.trim().length < 2 || !signaturePng) {
    return NextResponse.json(
      { ok: false, error: "Užpildykite vardą ir pasirašykite" },
      { status: 400 },
    );
  }

  // Consent must be validated server-side, not just in the client checkbox —
  // a direct POST must not be able to sign without agreement (legal workflow).
  if (body.agreed !== true) {
    return NextResponse.json(
      { ok: false, error: "Reikia sutikti su sutarties sąlygomis" },
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
      { ok: false, error: "Parašo failas per didelis" },
      { status: 413 },
    );
  }

  // Upload the signature PNG to Vercel Blob. BLOB_READ_WRITE_TOKEN must be set
  // (in dev it can be absent — surface a clear message in that case).
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

  const result = await signContract({
    token,
    signerName: signerName.trim(),
    signaturePng: blobUrl,
    ip: clientIp(req),
    userAgent: req.headers.get("user-agent"),
  });

  if (!result.ok) {
    // Orphan cleanup — the token was consumed/expired between upload and consume.
    try {
      await del(blobUrl);
    } catch (err) {
      console.error("orphan blob cleanup failed", err);
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 410 });
  }

  return NextResponse.json({ ok: true, data: result.data }, { status: 200 });
}
