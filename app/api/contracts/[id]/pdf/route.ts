import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderContractPdf } from "@/lib/pdf/renderContract";

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
    const contract = await prisma.contract.findUnique({
      where: { id },
      select: { number: true, pdfUrl: true },
    });
    if (!contract) {
      return NextResponse.json(
        { error: "Contract not found" },
        { status: 404 },
      );
    }

    const filename = `${contract.number}.pdf`;
    const disposition = download ? "attachment" : "inline";

    // Импортированный договор: отдаём загруженный PDF как есть (не рендерим).
    if (contract.pdfUrl) {
      const upstream = await fetch(contract.pdfUrl);
      if (!upstream.ok) {
        return NextResponse.json(
          { error: "Загруженный PDF недоступен" },
          { status: 502 },
        );
      }
      const ab = await upstream.arrayBuffer();
      return new NextResponse(new Uint8Array(ab), {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `${disposition}; filename="${filename}"`,
          "Cache-Control": "private, no-store",
        },
      });
    }

    const buffer = await renderContractPdf(id);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("contract pdf failed", err);
    const message =
      err instanceof Error ? err.message : "Не удалось сгенерировать PDF";
    const status = message === "Contract not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
