import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { renderInvoicePdf } from "@/lib/pdf/renderInvoice";

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
  // ?download=1 → attachment (браузер скачает файл).
  // Без параметра → inline (нужно для iframe preview на карточке счёта).
  const download = new URL(req.url).searchParams.get("download") === "1";

  try {
    // Берём number отдельным запросом — он нужен для имени файла, даже если
    // renderInvoicePdf успешно вернётся. Дешевле, чем парсить buffer.
    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { number: true, pdfUrl: true },
    });
    if (!inv) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const filename = `${inv.number}.pdf`;
    const disposition = download ? "attachment" : "inline";

    // Импортированный счёт: отдаём загруженный PDF как есть (не рендерим).
    if (inv.pdfUrl) {
      const upstream = await fetch(inv.pdfUrl);
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

    const buffer = await renderInvoicePdf(id);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${disposition}; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("invoice pdf failed", err);
    const message =
      err instanceof Error ? err.message : "Не удалось сгенерировать PDF";
    const status = message === "Invoice not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
