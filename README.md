# Bloom E-commerce Template

A modern **e-commerce web application** built with **Next.js**, **React**, **Tailwind CSS**, and **TypeScript**, backed by **Supabase** for data/auth and **Midtrans** for payments.

---

## 🚀 Tech Stack

- **Next.js 16** (App Router, SSR/SSG, Image Optimization)
- **React 19**
- **Tailwind CSS 4** (OKLCH colors, custom design system)
- **TypeScript 5**
- **Supabase** (database, auth, realtime)
- **NextAuth** (Google OAuth)
- **Midtrans** (payment gateway)
- **Resend** (transactional/email notifications)
- **Zustand** (state management)
- **Radix UI** & **Shadcn UI** components
- **React Hook Form** + **Zod** (forms & validation)
- **Recharts** (admin analytics)

---

## 🛠 Features

- Product catalog with categories, detail pages, and search
- Shopping cart synced with Supabase
- Checkout flow integrated with Midtrans payment gateway
- Order tracking, cancellation, and cancel-request flow
- Email confirmation/notifications after payment (via Resend)
- Realtime updates via WebSocket
- Authentication with email/password and Google OAuth (NextAuth)
- Admin dashboard: manage products, categories, and orders
- Responsive, mobile-first UI built with Shadcn UI components

---

## 📦 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and fill in your own values:

```bash
cp .env.example .env.local
```

See [Environment Variables](#-environment-variables) below for details on each key.

### 3. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔑 Environment Variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Supabase publishable/anon key (new API key format) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only, keep secret) |
| `NEXT_PUBLIC_SITE_URL` | Public base URL of the site |
| `NEXT_PUBLIC_APP_URL` | Public app URL, used for redirects/callbacks |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (for NextAuth) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret (for NextAuth) |
| `NEXTAUTH_URL` | Base URL used by NextAuth |
| `NEXTAUTH_SECRET` | Secret used by NextAuth to sign/encrypt tokens |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | Midtrans client key (used in the browser Snap.js) |
| `MIDTRANS_SERVER_KEY` | Midtrans server key (server-side only, keep secret) |
| `MIDTRANS_IS_PRODUCTION` | `true`/`false` — toggles Midtrans sandbox vs production |
| `RESEND_API_KEY` | API key for Resend (email notifications) |
| `EMAIL_FROM` | Sender email address used for outgoing emails |

> ⚠️ Never commit `.env.local` or any file containing real secrets. Only `.env.example` should be tracked in git.

---

## 📁 Project Structure

```
app/
  admin/         # Admin dashboard (products, categories, orders)
  api/           # API routes (cart, checkout, orders, midtrans, payment)
  auth/          # Auth callback routes
  product(s)/    # Product listing & detail pages
  cart/          # Cart page
  checkout/      # Checkout flow
  orders/        # Order history & confirmation
  login/ signup/ # Authentication pages
components/      # Reusable UI components
hooks/           # Custom React hooks
lib/             # Shared utilities (Supabase client, Midtrans, email, etc.)
stores/          # Zustand state stores
types/           # Shared TypeScript types
validator/       # Zod validation schemas
```

---

## 📝 Customization

- Update product/category data via the admin dashboard or directly in Supabase
- Change theme colors in `/app/globals.css`
- Add new sections or pages under `/app`
- Extend UI using Shadcn UI components in `/components`

---

## 📬 Contact

Feel free to reach out if you need support or customization help.

---

**MIT License**
