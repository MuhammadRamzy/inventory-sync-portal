# B2B Digital Brochure & Inventory Sync Portal

A mobile-first B2B sales & inventory platform for distributors: a **digital
product catalog** sales reps and customers can browse to build quotations
and send them straight to WhatsApp, paired with an **admin console** for
managing inventory, bulk-syncing stock from Tally ERP exports, and
configuring the storefront — all running on Cloudflare's edge (Workers, D1,
R2) for a fast, low-maintenance, pay-as-you-go deployment.

This is a generalized/de-branded template — swap in your own company name,
logo, and colors in a few places (see [Customization](#customization)) and
it's ready to run for your own catalog.

## Features

**Sales Portal** (`/`)
- Searchable, filterable product catalog with real-time stock levels
- Cart-style "Quotation Builder" — add items, adjust quantities, add client
  name/phone/notes
- One-tap send to WhatsApp (admin, the client's own number, or any custom
  number), with a mobile swipe-to-send gesture
- Click a product image to view it full-size
- Installable as its own PWA (own icon/name, independent of the admin app)

**Admin Console** (`/admin`)
- Password-gated inventory dashboard with at-a-glance stock stats
  (total SKUs, in stock / low stock / out of stock)
- Inline edit of price, stock, category, description, and product photo,
  right from the table — responsive down to a stacked card layout on mobile
- Manual product entry form with validation and category management
  (create new categories on the fly)
- Bulk stock sync from Tally ERP exports (CSV or Excel) — auto-detects
  columns, previews every row's diff before committing, flags
  unrecognized/malformed rows
- WhatsApp contact number and admin credential configuration
- Also installable as its own separate PWA from the sales portal

## Tech stack

- **Next.js 15** (App Router) + React 18 + TypeScript + Tailwind CSS
- **Cloudflare Workers** via [OpenNext](https://opennext.js.org/cloudflare) —
  the whole app (pages + API routes) runs as a single Worker
- **Cloudflare D1** (SQLite) via [Drizzle ORM](https://orm.drizzle.team/) for
  product/settings data
- **Cloudflare R2** for product images, accessed through a native binding
  (no S3 keys, no presigned URLs) with edge-cached serving
- `papaparse` / `xlsx` for CSV/Excel stock-sync parsing

## Architecture

```
app/page.tsx            Sales portal (client component)
app/admin/page.tsx       Admin console (client component)
app/api/products/        Product CRUD + bulk-sync API routes
app/api/upload/          Image upload → R2 binding
app/api/images/[key]/    Image serving from R2, edge-cached
app/api/settings/        WhatsApp contact number settings

lib/schema.ts            Drizzle D1 schema (products, settings)
lib/cloudflare.ts        Cloudflare bindings accessor (D1 + R2)
lib/server/products.ts   Server-side product query/mutation logic
lib/api-client.ts        Client-side fetch wrappers used by both pages
lib/branding.ts          Generic/company identity config (see below)
```

Both pages are fully client-rendered ("use client") and talk to the D1/R2-
backed API routes above — there's no separate backend to deploy.

## Getting started

### 1. Prerequisites

- A [Cloudflare](https://dash.cloudflare.com) account (free tier works)
- Node 20+, npm
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (installed
  as a dev dependency, used via `npx wrangler`)

### 2. Create your D1 database and R2 bucket

```bash
npx wrangler login
npx wrangler d1 create <your-db-name>       # copy the printed database_id
npx wrangler r2 bucket create <your-bucket>
```

### 3. Configure Wrangler

```bash
cp wrangler.example.jsonc wrangler.jsonc
```

Edit `wrangler.jsonc` and fill in `name`, `database_name`/`database_id`, and
`bucket_name` with the values from step 2.

### 4. Environment variables

```bash
cp .env.example .env
```

Fill in `CLOUDFLARE_ACCOUNT_ID` and a D1 API token (Dashboard → My Profile →
API Tokens) if you want to use `drizzle-kit studio`/`push`. Everything else
is optional — see [Customization](#customization).

### 5. Install dependencies and run migrations

```bash
npm install
npm run db:generate           # only needed if you change lib/schema.ts
npx wrangler d1 migrations apply <your-db-name> --local   # local dev DB
npx wrangler d1 migrations apply <your-db-name> --remote  # real D1 database
```

### 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` for the sales portal and `/admin` for the
admin console (default login: `admin` / whatever you set — see
`getAdminCredentials()` in `app/admin/page.tsx` for the bootstrap hash, and
change it from the Config Settings tab after first login).

### 7. Deploy

```bash
npm run deploy
```

This builds the app with OpenNext and deploys it as a Cloudflare Worker.

## Customization

All company identity lives in [`lib/branding.ts`](lib/branding.ts), driven
by environment variables with generic defaults — nothing to hunt-and-replace
in the codebase:

| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_COMPANY_NAME` | `Acme Distributors` | Shown in header, footer, WhatsApp messages, PWA titles |
| `NEXT_PUBLIC_TAGLINE` | generic tagline | Sidebar description text |
| `NEXT_PUBLIC_REGION_LABEL` | `Regional Operations` | Sidebar/console location label |
| `NEXT_PUBLIC_ADMIN_DISPLAY_NAME` / `_ROLE` | `Admin User` / `Administrator` | Admin sidebar profile card |
| `NEXT_PUBLIC_DEFAULT_CATEGORIES` | `Electronics,Apparel,Hardware,Home Goods` | Starting product categories |
| `NEXT_PUBLIC_POWERED_BY_LABEL` / `_URL` | unset (hidden) | Optional footer credit line |
| `NEXT_PUBLIC_LOGO_SRC` | `/logo-demo.png` | Path to your logo image |
| `NEXT_PUBLIC_MANIFEST_PATH` / `_ADMIN_MANIFEST_PATH` | `/manifest-demo.json` / `/manifest-admin-demo.json` | PWA manifest per app |
| `BRAND_50` … `BRAND_950` | a generic navy scale | Tailwind color scale (`tailwind.config.ts`) |

To use your own logo: drop your image at `public/logo.png` (or any path)
and set `NEXT_PUBLIC_LOGO_SRC`. To use your own PWA manifests/icons, copy
`public/manifest-demo.json` → `public/manifest.json` (and the admin
equivalent), point them at your own icon files, and set the two manifest
path env vars to match.

## License

No license specified — treat as a private/portfolio template unless the
repository owner states otherwise.
