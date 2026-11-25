# Multi-tenant rollout

## Safety baseline
- Existing production tenant is `royal` (slug: `royal`).
- Existing collections remain in the same `royal_menu` database.
- Existing documents are preserved; migration is additive only.
- No collection was dropped, renamed, truncated, or copied.
- Legacy root routes and APIs must remain compatible until tenant-aware routes are fully deployed.

## Database foundation applied
- Created `tenants` collection with the stable tenant document `_id: "royal"`, `slug: "royal"`, `name: "رويال"`, `status: "active"`.
- Added `tenantId: "royal"` only where missing in `products`, `orders`, `categories`, `settings`, and `counters`.
- Verified counts after migration: products=1, orders=2, categories=1, settings=1, counters=1 tagged to royal.
- Added compound tenant-scoped indexes for products, orders, categories, plus tenantId indexes for settings and counters, and a slug index for tenants.
- Existing orderNumber and requestId unique indexes are retained.

## Required application rollout
1. Introduce a server-side tenant resolver using the URL slug and active tenant record. Never trust a client-provided tenantId.
2. Scope every public data query and every admin query/mutation by the resolved tenantId.
3. Replace the single global admin session with role-aware sessions: platform super-admin and tenant admin. Tenant admin sessions must be bound to one tenant.
4. Keep the existing root Royal experience working during transition; add `/royal` and `/royal/admin` aliases before considering any root redirect.
5. Add super-admin tenant provisioning and tenant-admin account management.
6. Add tenant branding settings (logo, banner, phone, WhatsApp, social links) and tenant-specific delivery/pickup options.
7. Add tests proving tenant A cannot read or mutate tenant B data, including reports, product images, order deletion, settings, QR links, and counters.

## Deployment gates
- Do not deploy a partially tenant-aware build.
- Before switching traffic, test the current Royal public menu, admin login, products, categories, orders, reports, image routes, QR, and order creation.
- Create and verify a database backup before any future destructive migration. This foundation migration is additive and non-destructive.
