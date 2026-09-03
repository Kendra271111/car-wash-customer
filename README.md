# WASHINGTON — Customer Web

Customer-facing web app for the **WASHINGTON** car wash platform.  
Customers can register, manage vehicles, book wash services, pay online (Midtrans), and track order progress from **Waiting → In Progress → Completed**.

> Companion apps: Express API (`backend`) and staff/admin web (separate repo or folder).

---

## Features

| Area | What customers can do |
|------|------------------------|
| **Auth** | Register / login (JWT), protected routes |
| **Dashboard** | Snapshot of recent orders & quick actions |
| **Vehicles** | List, add, and manage personal vehicles |
| **Orders** | Create bookings with searchable vehicle & services cart |
| **Order detail** | Visual progress (Waiting → In Progress → Completed), payment status, print ticket |
| **Payments** | Cash (manual) or non-cash via **Midtrans Snap** (QRIS, transfer, e-money, etc.) |
| **History** | Past / completed orders |
| **Profile** | View & edit profile; delete account |

**Staff workflow (admin app):** Start washing → Complete wash (order status is not auto-changed by payment alone).

---

## Tech stack

**Frontend (`customer-web`)**
- React 18 + TypeScript
- Vite
- React Router
- Tailwind CSS + DaisyUI
- Axios
- Material Icons
- Midtrans Snap (client)

**Backend (`backend`)**
- Node.js + Express + TypeScript
- Prisma ORM
- PostgreSQL (local or **Supabase**)
- JWT auth (`bcryptjs`)
- Midtrans (Snap + notification webhook)
- Multer (optional profile uploads)

---

## Project structure

```text
car-wash-customer/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/     # auth, orders, vehicles, payments, …
│   │   ├── middlewares/
│   │   ├── libs/            # prisma, midtrans, multer
│   │   └── routes/
│   └── .env
└── customer-web/
    ├── src/
    │   ├── api/             # axios instance, token helpers
    │   ├── components/pages/
    │   │   ├── auth/        # login, register
    │   │   ├── orders/      # list, create, view, payment
    │   │   ├── vehicles/
    │   │   ├── profile/
    │   │   └── index.tsx    # dashboard
    │   ├── hooks/           # useAuth, useOrder, useVehicles, …
    │   └── assets/img/bg/   # login/register carousel images
    └── .env
```
---

## Prerequisites

- Node.js 18+
- npm or pnpm
- PostgreSQL (or a Supabase project)
- Midtrans sandbox account (for non-cash payments)

---

## Environment variables

### Backend (`backend/.env`)

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB?schema=public"
JWT_SECRET="your-long-random-secret"
PORT=3000

# Midtrans
MIDTRANS_SERVER_KEY="SB-Mid-server-xxxx"
MIDTRANS_CLIENT_KEY="SB-Mid-client-xxxx"
MIDTRANS_IS_PRODUCTION=false

# Public URL of this API (for Midtrans notification / finish redirects)
FRONTEND_URL="http://localhost:5173"
# Optional: explicit notification base if different from tunnel

Use the **direct** Supabase connection string for migrations when the pooler is slow or times out; use the pooler for the app if you prefer.

### Customer web (`customer-web/.env`)

```env
VITE_API_URL=http://localhost:3000/api
VITE_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxx

# Optional — only if using Supabase Realtime from the browser
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Never commit real secrets. Prefer `.env.example` in the repo.

---

## Setup

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push   # or: npx prisma migrate dev
npm run dev          # e.g. http://localhost:3000
```

### 2. Customer web

```bash
cd customer-web
npm install
npm run dev          # e.g. http://localhost:5173
```

Point `VITE_API_URL` at the running API (LAN IP is fine for phone testing).

---

## Customer booking flow

```text
Login / Register
    → Dashboard
    → Vehicles (add vehicle if needed)
    → Orders → Create order
         • Customer name (from account)
         • Vehicle (searchable dropdown — own vehicles only)
         • Services (add rows → pick service → subtotal & duration)
         • Optional note → Create
    → View order
         • Progress: Waiting → In Progress → Completed
         • Pay if unpaid → Payment page
              • Cash → mark paid (admin/cash flow)
              • QRIS / E-Money / Transfer → Midtrans Snap
    → Webhook updates payment to PAID (order status still manual on staff side)
```

**Important:** Payment success should **not** force order status from Waiting → In Progress unless you intentionally add that rule. Staff advances status in the admin app (**Start washing** → **Complete wash**).

---

## API surface (high level)

| Method | Path | Notes |
|--------|------|--------|
| `POST` | `/api/auth/register` or customer register route | Name, email, password, phone |
| `POST` | `/api/auth/cLogin` (or your customer login path) | Returns `token` + `user` |
| `GET`  | `/api/vehicles?customerId=` | **Must filter by customer** |
| `POST` | `/api/vehicles` | Create vehicle for customer |
| `GET`  | `/api/orders` | Prefer filter by authenticated customer |
| `POST` | `/api/orders` | Nested `order_items` |
| `GET`  | `/api/orders/:id` | Include vehicle, items, payments |
| `PATCH`| `/api/orders/:id/status` | Staff: PENDING → PROCESSING → COMPLETED |
| `POST` | `/api/payments` | Cash / manual |
| `POST` | `/api/payments/snap` (or equivalent) | Create Midtrans Snap token |
| `POST` | `/api/payments/midtrans/notification` | Webhook (verify signature) |
| `GET`  | `/api/payments/order/:id` | Prefer **PAID** row when multiple exist |

Vehicle list without `customerId` filtering is a common bug — always scope by the logged-in customer.

---

## Midtrans (sandbox)

1. Create a Midtrans sandbox account and copy **Server** + **Client** keys.  
2. Backend creates Snap token with unique `order_id` (e.g. `ORDER-{id}-{timestamp}`).  
3. Frontend loads Snap.js and calls `snap.pay(token)`.  
4. Set **Payment notification URL** to a **public HTTPS** URL, e.g.:

   `https://<your-tunnel>/api/payments/midtrans/notification`

5. Webhook must verify `signature_key` and update the matching payment row to `PAID`.  
6. Local testing: Cloudflare Tunnel or ngrok → point Midtrans at the tunnel URL.

UI should prefer any **PAID** payment row over an older PENDING Snap row when displaying status.

---

## Scripts (examples)

**Backend**

```bash
npm run dev
npm run build
npx prisma studio
npx prisma db push
```

**Customer web**

```bash
npm run dev
npm run build
npm run preview
```

---

## Security notes

- Store JWT in `localStorage` only for this SPA pattern; send `Authorization: Bearer <token>`.  
- Hash passwords with bcrypt; never return password hashes in API responses.  
- Restrict destructive actions (delete account, staff CRUD) by role middleware.  
- Validate Midtrans notifications with SHA-512 signature before updating DB.  
- Keep `JWT_SECRET` and Midtrans server key server-side only.

---

## Responsive design

UI targets mobile-first customer use (thumb-friendly actions, stacked cards) and scales to desktop (split login/register, wider order tables where useful). Tailwind + DaisyUI utilities drive layout.

---

## Known design decisions

- **Order status** vs **payment status** are separate.  
- Multiple payment rows per order are possible (Snap PENDING + later PAID); always **prefer PAID** in UI.  
- Customer cannot cancel like a food-delivery app mid-fulfillment (by product choice).  
- Create-order vehicle dropdown loads **only** `GET /vehicles?customerId=<current user>`.

---

## License

Private / unpublished — all rights reserved unless otherwise stated by the project owner.

---

## Authors

Built for the WASHINGTON car wash product (customer portal + Express API).
```
