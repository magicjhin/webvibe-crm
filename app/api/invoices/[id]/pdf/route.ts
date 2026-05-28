import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { renderInvoicePdf } from "@/lib/pdf/renderInvoice";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;

  try {
    const buffer = await renderInvoicePdf(id);
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="saskaita-${id}.pdf"`,
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
