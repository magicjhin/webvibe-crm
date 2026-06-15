import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderInvoiceDocx } from "@/lib/docx/renderInvoiceDocx";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  // Word всегда отдаём как attachment (предпросмотра .docx в браузере нет).
  const download = new URL(req.url).searchParams.get("download") !== "0";

  try {
    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { number: true, pdfUrl: true },
    });
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Импортированный счёт — только загруженный PDF, структурных данных нет.
    if (inv.pdfUrl) {
      return NextResponse.json(
        { error: "Импортированный счёт доступен только в PDF" },
        { status: 409 },
      );
    }

    const buffer = await renderInvoiceDocx(id);
    const filename = `${inv.number}.docx`;
    const disposition = download ? "attachment" : "inline";

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("invoice docx failed", err);
    const message =
      err instanceof Error ? err.message : "Не удалось сгенерировать Word";
    const status = message === "Invoice not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
