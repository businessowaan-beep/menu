import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { isSuperAdmin } from "@/lib/platform-auth";
export const runtime = "nodejs";

const clean = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);
const slugPattern = /^[a-z0-9](?:[a-z0-9-]{0,46}[a-z0-9])?$/;
const domainPattern = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;

export async function GET() {
  if (!await isSuperAdmin()) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const db = await getDb();
    const now = new Date();
    const soon = new Date(now.getTime() + 30 * 86400000).toISOString();
    const [tenants, plans, domains, themes, announcements, tickets, totalOrders, revenue, recentRevenue, totalProducts, expiring] = await Promise.all([
      db.collection("tenants").find({}).project({ adminPasswordHash: 0 }).sort({ createdAt: -1 }).toArray(),
      db.collection("platform_plans").find({}).sort({ sortOrder: 1, createdAt: 1 }).toArray(),
      db.collection("platform_domains").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("platform_themes").find({}).sort({ createdAt: -1 }).toArray(),
      db.collection("platform_announcements").find({}).sort({ createdAt: -1 }).limit(50).toArray(),
      db.collection("platform_tickets").find({}).sort({ createdAt: -1 }).limit(100).toArray(),
      db.collection("orders").countDocuments({}),
      db.collection("orders").aggregate([{ $group: { _id: null, amount: { $sum: { $convert: { input: "$total", to: "double", onError: 0, onNull: 0 } } } } }]).toArray(),
      db.collection("orders").aggregate([{ $match: { createdAt: { $gte: new Date(now.getTime() - 30 * 86400000) } } }, { $group: { _id: null, amount: { $sum: { $convert: { input: "$total", to: "double", onError: 0, onNull: 0 } } }, count: { $sum: 1 } } }]).toArray(),
      db.collection("products").countDocuments({ active: { $ne: false } }),
      db.collection("tenants").find({ "subscription.endsAt": { $lte: soon, $gte: now.toISOString() } }).project({ _id: 1, name: 1, slug: 1, subscription: 1 }).toArray()
    ]);
    const safeTenants = tenants.map((t: any) => ({ ...t, _id: String(t._id) }));
    return NextResponse.json({
      tenants: safeTenants,
      plans: plans.map((x: any) => ({ ...x, _id: String(x._id) })),
      domains: domains.map((x: any) => ({ ...x, _id: String(x._id) })),
      themes: themes.map((x: any) => ({ ...x, _id: String(x._id) })),
      announcements: announcements.map((x: any) => ({ ...x, _id: String(x._id) })),
      tickets: tickets.map((x: any) => ({ ...x, _id: String(x._id) })),
      metrics: {
        tenants: tenants.length,
        activeTenants: tenants.filter((t: any) => t.status === "active").length,
        trialTenants: tenants.filter((t: any) => t.status === "trial" || t.subscription?.status === "trial").length,
        expiredTenants: tenants.filter((t: any) => t.subscription?.endsAt && new Date(t.subscription.endsAt) < now).length,
        expiringSoon: expiring.length,
        orders: totalOrders,
        revenue: Number(revenue[0]?.amount || 0),
        last30DaysRevenue: Number(recentRevenue[0]?.amount || 0),
        last30DaysOrders: Number(recentRevenue[0]?.count || 0),
        products: totalProducts
      }
    });
  } catch {
    return NextResponse.json({ error: "تعذر تحميل بيانات إدارة المنصة" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const body = await req.json();
    const db = await getDb();
    const now = new Date().toISOString();

    if (body.action === "savePlan") {
      const id = clean(body.id, 48).toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const name = clean(body.name, 80);
      const price = Number(body.price);
      const limits = body.limits || {};
      if (!id || !name || !Number.isFinite(price) || price < 0) return NextResponse.json({ error: "أدخل اسم الباقة ومعرّفاً صحيحاً وسعراً صالحاً." }, { status: 400 });
      const plan = {
        _id: id, name, price,
        currency: clean(body.currency || "JOD", 8),
        billingPeriod: ["monthly", "yearly"].includes(body.billingPeriod) ? body.billingPeriod : "monthly",
        limits: {
          items: Math.max(0, Math.min(100000, Number(limits.items) || 0)),
          branches: Math.max(1, Math.min(1000, Number(limits.branches) || 1)),
          languages: Math.max(1, Math.min(20, Number(limits.languages) || 1)),
          users: Math.max(1, Math.min(1000, Number(limits.users) || 1))
        },
        features: {
          onlineOrders: !!body.features?.onlineOrders,
          qr: !!body.features?.qr,
          reports: !!body.features?.reports,
          customDomain: !!body.features?.customDomain,
          multipleLanguages: !!body.features?.multipleLanguages
        },
        active: body.active !== false,
        sortOrder: Number(body.sortOrder) || 0,
        updatedAt: now
      };
      const planFields = { ...plan };\ndelete (planFields as any)._id;\n      await db.collection("platform_plans").updateOne({ _id: id } as any, { $set: planFields, $setOnInsert: { createdAt: now } }, { upsert: true });
      await db.collection("platform_activity").insertOne({ type: "plan_saved", planId: id, storeName: name, createdAt: now });
      return NextResponse.json({ ok: true, plan });
    }

    if (body.action === "saveDomain") {
      const slug = clean(body.slug, 48).toLowerCase();
      const domain = clean(body.domain, 253).toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
      if (!slugPattern.test(slug) || !domainPattern.test(domain)) return NextResponse.json({ error: "أدخل رابطاً مختصراً ودومين صحيحاً بدون https." }, { status: 400 });
      const tenant = await db.collection("tenants").findOne({ _id: slug } as any);
      if (!tenant) return NextResponse.json({ error: "المتجر المحدد غير موجود." }, { status: 404 });
      const record = { slug, domain, status: "pending_dns", sslStatus: "not_configured", updatedAt: now, createdAt: now };
      const { createdAt, ...domainFields } = record;\n      await db.collection("platform_domains").updateOne({ domain }, { $set: domainFields, $setOnInsert: { createdAt } }, { upsert: true });
      await db.collection("platform_activity").insertOne({ type: "custom_domain_added", slug, storeName: tenant.name, details: { domain }, createdAt: now });
      return NextResponse.json({ ok: true, domain: record, note: "تم حفظ الدومين بانتظار إعداد DNS وربطه بمشروع Vercel." });
    }

    if (body.action === "saveTheme") {
      const id = clean(body.id, 48).toLowerCase().replace(/[^a-z0-9-]/g, "-");
      const name = clean(body.name, 80);
      if (!id || !name) return NextResponse.json({ error: "أدخل اسم القالب ومعرّفه." }, { status: 400 });
      const colors = body.colors || {};
      const validColor = (v: unknown, fallback: string) => /^#[0-9a-f]{6}$/i.test(String(v || "")) ? String(v) : fallback;
      const theme = {
        _id: id, name,
        colors: {
          primary: validColor(colors.primary, "#267448"),
          accent: validColor(colors.accent, "#F4D35E"),
          background: validColor(colors.background, "#EFF8F0"),
          card: validColor(colors.card, "#FFFFFF"),
          text: validColor(colors.text, "#173326")
        },
        direction: body.direction === "ltr" ? "ltr" : "rtl",
        active: body.active !== false,
        updatedAt: now
      };
      const themeFields = { ...theme };\ndelete (themeFields as any)._id;\n      await db.collection("platform_themes").updateOne({ _id: id } as any, { $set: themeFields, $setOnInsert: { createdAt: now } }, { upsert: true });
      return NextResponse.json({ ok: true, theme });
    }

    if (body.action === "announcement") {
      const title = clean(body.title, 120);
      const message = clean(body.message, 2000);
      if (!title || !message) return NextResponse.json({ error: "أدخل عنوان الإعلان ونصه." }, { status: 400 });
      const result = await db.collection("platform_announcements").insertOne({ title, message, audience: "all", active: true, createdAt: now, updatedAt: now });
      await db.collection("platform_activity").insertOne({ type: "announcement_created", details: { title }, createdAt: now });
      return NextResponse.json({ ok: true, id: String(result.insertedId) }, { status: 201 });
    }

    return NextResponse.json({ error: "العملية غير مدعومة." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "تعذر حفظ البيانات. تحقق من المدخلات وحاول مجدداً." }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  if (!await isSuperAdmin()) return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
  try {
    const body = await req.json();
    const db = await getDb();
    const now = new Date().toISOString();
    if (body.action === "tenant") {
      const slug = clean(body.slug, 48);
      if (!slug) return NextResponse.json({ error: "المتجر غير محدد." }, { status: 400 });
      const set: Record<string, unknown> = { updatedAt: now };
      for (const key of ["nameAr", "nameEn", "adminEmail", "phone", "city", "logoUrl"]) {
        if (typeof body[key] === "string") set[key] = clean(body[key], key === "logoUrl" ? 1000 : 160);
      }
      if (["active", "disabled", "trial", "expired", "archived"].includes(body.status)) set.status = body.status;
      const result = await db.collection("tenants").updateOne({ _id: slug } as any, { $set: set });
      if (!result.matchedCount) return NextResponse.json({ error: "المتجر غير موجود." }, { status: 404 });
      await db.collection("platform_activity").insertOne({ type: "tenant_profile_updated", slug, details: { changedFields: Object.keys(set) }, createdAt: now });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "ticket") {
      const id = clean(body.id, 80);
      const status = ["open", "in_progress", "resolved", "closed"].includes(body.status) ? body.status : "";
      if (!id || !status) return NextResponse.json({ error: "بيانات التذكرة غير صحيحة." }, { status: 400 });
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(id)) return NextResponse.json({ error: "رقم التذكرة غير صحيح." }, { status: 400 });
      await db.collection("platform_tickets").updateOne({ _id: new ObjectId(id) }, { $set: { status, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "announcement") {
      const id = clean(body.id, 80);
      const active = Boolean(body.active);
      const { ObjectId } = await import("mongodb");
      if (!ObjectId.isValid(id)) return NextResponse.json({ error: "الإعلان غير محدد." }, { status: 400 });
      await db.collection("platform_announcements").updateOne({ _id: new ObjectId(id) }, { $set: { active, updatedAt: now } });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "العملية غير مدعومة." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "تعذر تحديث البيانات." }, { status: 500 });
  }
}
