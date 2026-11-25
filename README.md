# Royal Digital Menu

Arabic RTL digital menu and ordering platform for Royal Restaurant.

## Stack
- Next.js App Router + TypeScript
- MongoDB Atlas
- Vercel

## Environment
Copy `.env.example` to `.env.local` and configure:
- `MONGODB_URI`
- `MONGODB_DB=royal_menu`
- `ADMIN_PASSWORD`
- `SESSION_SECRET`
- `WHATSAPP_PHONE`
- `NEXT_PUBLIC_SITE_URL`

The customer menu and cart UI are scaffolded. Admin APIs, order persistence, QR export, image upload, and final deployment are the next implementation stages. Never commit secrets.
