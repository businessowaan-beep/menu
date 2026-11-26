import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/platform-auth";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  const slug = String(req.nextUrl.searchParams.get("slug") || "").trim().toLowerCase();
  const format = req.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";
  if (!/^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/.test(slug)) return NextResponse.json({ error: "رابط المتجر غير صحيح" }, { status: 400 });
  try {
    const db = await getDb();
    const tenant = await db.collection("tenants").findOne({ _id: slug } as any);
    if (!tenant) return NextResponse.json({ error: "المتجر غير موجود" }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_APP_URL || "https://menustore.vercel.app";
    const menuUrl = new URL("/" + slug, origin).toString();
    if (format === "svg") {
      const svg = await QRCode.toString(menuUrl, { type: "svg", width: 900, margin: 2, errorCorrectionLevel: "H" });
      return new NextResponse(svg, { headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Content-Disposition": 'attachment; filename="' + slug + '-menu-qr.svg"', "Cache-Control": "private, no-store" } });
    }
    const png = await QRCode.toBuffer(menuUrl, { type: "png", width: 900, margin: 2, errorCorrectionLevel: "H" });
    return new NextResponse(new Uint8Array(png), { headers: { "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="' + slug + '-menu-qr.png"', "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "تعذر إنشاء رمز QR" }, { status: 500 });
  }
}