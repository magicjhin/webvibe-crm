import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { renderContractPdf } from "@/lib/pdf/renderContract";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

function hashToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Public, token-scoped PDF preview for the signing page (/sign/[token]).
 * No auth — access is gated by a valid, non-expired, still-pending sign token,
 * NOT by a bare contract id (which would be an IDOR). Mirrors the same
 * hash + TTL + status='sent' check as the sign page / signContract consume.
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  const hash = hashToken(token);

  try {
    const contract = await prisma.contract.findFirst({
      where: {
        signTokenHash: hash,
        signTokenExpiresAt: { gt: new Date() },
        status: "sent",
      },
      select: { id: true, number: true },
    });
    if (!contract) {
      return NextResponse.json(
        { error: "Nuoroda nebegalioja" },
        { status: 404 },
      );
    }

    const buffer = await renderContractPdf(contract.id);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${contract.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("public sign pdf failed", err);
    return NextResponse.json(
      { error: "Nepavyko sugeneruoti PDF" },
      { status: 500 },
    );
  }
}
