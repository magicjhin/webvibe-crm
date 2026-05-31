import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderProposalPdf } from "@/lib/pdf/renderProposal";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const download = new URL(req.url).searchParams.get("download") === "1";

  try {
    const proposal = await prisma.proposal.findUnique({
      where: { id },
      select: { number: true },
    });
    if (!proposal) {
      return NextResponse.json(
        { error: "Proposal not found" },
        { status: 404 },
      );
    }

    const buffer = await renderProposalPdf(id);
    const filename = `${proposal.number}.pdf`;
    const disposition = download ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("proposal pdf failed", err);
    const message =
      err instanceof Error ? err.message : "Не удалось сгенерировать PDF";
    const status = message === "Proposal not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
