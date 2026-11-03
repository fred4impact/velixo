# E-Commerce MVP

Monorepo: `backend/` (NestJS + Prisma + MySQL) and `frontend/` (Next.js 15).
See `spec.md` for the full long-term feature checklist — this codebase implements the phase-1 lean MVP slice of it (storefront, cart, checkout, orders, admin panel). See `deployment/strategy.md` for the Kubernetes/ArgoCD/Argo Rollouts production deployment setup.

**New here?** [how-to-use-the-project.md](how-to-use-the-project.md) is the entry point — it routes you to the right guide depending on whether you want to just run the app, stand up local Kubernetes, deploy to AWS, run the test suite, or add the observability/security electives.

> The storefront's display name is **Velixo** — that's just the demo brand shown to shoppers, not a rename of this repo/project.

## Contents

1. [Tech stack](#tech-stack)
2. [Prerequisites](#prerequisites)
3. [Quick start (Docker)](#quick-start-docker--recommended)
4. [Seeded data & credentials](#seeded-data--credentials)
5. [Using the app locally](#using-the-app-locally)
6. [Local (non-Docker) development](#local-non-docker-development)
7. [Verification](#verification)
8. [Testing](#testing)
9. [API reference](#api-reference)
10. [Project structure](#project-structure)

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + shadcn/ui |
| State/data | TanStack Query, React Hook Form + Zod |
| Backend | NestJS + TypeScript + Prisma ORM |
| Database | MySQL 8 |
| Auth | JWT (access + refresh) + Passport, bcrypt |
| Storage | MinIO (S3-compatible; real AWS S3 in stage/prod) |
| Payments | Stripe (test mode) + Cash on Delivery |
| Email | Nodemailer → Mailpit (local); real SMTP in stage/prod |

## Prerequisites

- Docker Desktop (or another local Docker daemon) — the only hard requirement for local dev
- Node.js 22+ and npm — only needed if you want to run backend/frontend outside Docker

## Quick start (Docker — recommended)

```bash
cp .env.example .env   # adjust secrets if needed; defaults work out of the box
docker compose up --build
```

This starts everything:

| Service | URL | Notes |
|---|---|---|
| Storefront + admin | http://localhost:3000 | Next.js |
| Backend API | http://localhost:4000 | NestJS |
| API docs (Swagger) | http://localhost:4000/api/docs | Every route below, with request/response schemas, "Try it out" |
| Mailpit (fake inbox) | http://localhost:8025 | Every email the app sends (verification, password reset, order confirmations) lands here — nothing is ever really emailed in dev |
| MinIO console | http://localhost:9001 | Product image storage; login with `MINIO_ACCESS_KEY`/`MINIO_SECRET_KEY` from `.env` (default `minioadmin`/`minioadmin`) |
| MySQL | localhost:3306 | `ecommerce` / `ecommerce` (see `.env`) |

The backend container runs Prisma migrations and seeds the database automatically on boot (8 demo products with real photos, categories, brands, and one admin account — see [Seeded data](#seeded-data--credentials) below).

To stop: `docker compose down` (add `-v` to also wipe the database/MinIO volumes and start fully fresh next time).

## Seeded data & credentials

| | |
|---|---|
| Admin login | `admin@ecommerce.local` / `Admin123!` |
| Demo products | 8 products (T-shirt, hoodie, jacket, cap, backpack, sunglasses, watch, sneakers) across 3 categories, with real photos |
| Customer accounts | None seeded — register one at http://localhost:3000/register |
| Stripe | Test-mode only. `.env` ships a placeholder key (`sk_test_replace_me`) — card checkout won't work until you drop in your own Stripe test keys. **Cash on Delivery works immediately with no setup.** |

Change the admin password before this ever runs anywhere but your machine.

**Resetting test-generated data.** The `robotic-tests/` suite creates customers, orders, and carts on every run and doesn't clean up after itself by design (see its own docs). To wipe all of that back to the clean seeded state (8 products, 3 categories, admin account only) without touching anything you created by hand:

```bash
docker compose exec backend npx ts-node --transpile-only prisma/reset-test-data.ts
```

## Using the app locally

- **Storefront**: browse http://localhost:3000, add items to cart (works logged-out as a guest, or register/log in first), checkout with Cash on Delivery to place a real order end-to-end.
- **Wishlist**: log in, then tap the heart on any product card/detail page to save it (http://localhost:3000/wishlist). Move items to the cart individually, or hit "Share" to copy a public read-only link anyone can view without logging in.
- **Order confirmation emails**: check http://localhost:8025 (Mailpit) — verification emails, password resets, and order confirmations all land there.
- **Admin panel**: log in with the admin credentials above, then either use the account menu → "Admin", or go straight to http://localhost:3000/admin. Covers:
  - **Dashboard** — pending orders, revenue today/this week, a 7-day revenue trend chart, out-of-stock count, total customers, low-stock alerts, recent orders
  - **Products** — create/edit/delete, upload images
  - **Categories** — create/edit/delete, with parent/subcategory nesting
  - **Brands** — create/edit/delete, upload a logo
  - **Orders** — view all orders, drill into an order's full detail (line items, shipping/billing address, payment), change status
  - **Customers** — list + detail view (profile, saved addresses, order history)
- **API docs**: http://localhost:4000/api/docs — interactive Swagger UI for every endpoint listed below; click "Authorize" and paste an access token (from `POST /auth/login`'s response) to try authenticated routes directly in the browser.

## Local (non-Docker) development

Backend:
```bash
cd backend
npm install
npx prisma migrate dev
npm run start:dev
```
Requires `mysql`, `minio`, and `mailpit` reachable per `backend/.env` — easiest way: `docker compose up -d mysql minio minio-init mailpit` and leave those running.

Frontend:
```bash
cd frontend
npm install
npm run dev
```
Requires the backend reachable at the URL in `frontend/.env.local` (defaults to `http://localhost:4000`).

## Verification

```bash
# backend
cd backend && npx tsc --noEmit -p tsconfig.build.json && npx eslint "src/**/*.ts" && npm run build

# frontend
cd frontend && npx tsc --noEmit && npx eslint . && npm run build
```

## Testing

End-to-end API + UI coverage (70 tests) lives in the sibling `robotic-tests/` repo (Robot Framework + Playwright) — setup and run instructions are in [robotic-tests/how-to-run.md](../robotic-tests/how-to-run.md), not duplicated here. Quick version once the app is running:

```bash
cd robotic-tests
source .venv/bin/activate      # after the one-time setup in how-to-run.md
robot --outputdir output tests/
```

Remember to run the [reset script](#seeded-data--credentials) afterward if you want a clean database again.

## API reference

Base URL: `http://localhost:4000`. All request/response bodies and full schemas are in Swagger at `/api/docs` — this table is a quick-reference index.

Auth column key: **Public** = no token needed · **Auth** = any logged-in user (`Authorization: Bearer <accessToken>`) · **Owner** = logged-in user, restricted to their own data · **Admin** = logged-in user with the `ADMIN` role.

### Auth — `/auth`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Create a customer account, returns `{ accessToken, refreshToken }` |
| POST | `/auth/login` | Public | Log in, returns token pair |
| POST | `/auth/refresh` | Public | Exchange a refresh token for a new token pair |
| POST | `/auth/logout` | Public | Revoke a refresh token |
| POST | `/auth/verify-email` | Public | Verify email with the token from the verification email |
| POST | `/auth/resend-verification` | Public | Resend the verification email |
| POST | `/auth/forgot-password` | Public | Send a password reset email |
| POST | `/auth/reset-password` | Public | Reset password using the emailed token |
| POST | `/auth/change-password` | Auth | Change password while logged in |

### Users — `/users`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/users/me` | Auth | Get own profile |
| PATCH | `/users/me` | Auth | Update own profile (name) |
| GET | `/users/me/addresses` | Auth | List own saved addresses |
| POST | `/users/me/addresses` | Auth | Add a saved address |
| PATCH | `/users/me/addresses/:id` | Owner | Update a saved address |
| DELETE | `/users/me/addresses/:id` | Owner | Delete a saved address |
| GET | `/users` | Admin | List all customers |
| GET | `/users/:id` | Admin | Get one customer's profile, saved addresses, and order history |

### Categories — `/categories`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/categories` | Public | List all categories (flat, each with its `children`) |
| GET | `/categories/:id` | Public | Get one category |
| POST | `/categories` | Admin | Create a category (optionally with `parentId`) |
| PATCH | `/categories/:id` | Admin | Update a category |
| DELETE | `/categories/:id` | Admin | Delete a category |

### Brands — `/brands`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/brands` | Public | List all brands |
| GET | `/brands/:id` | Public | Get one brand |
| POST | `/brands` | Admin | Create a brand |
| PATCH | `/brands/:id` | Admin | Update a brand |
| DELETE | `/brands/:id` | Admin | Delete a brand |
| POST | `/brands/:id/logo` | Admin | Upload a brand logo (`multipart/form-data`, field `file`) |

### Products — `/products`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/products` | Public | List/search products. Query: `search`, `categoryId`, `brandId`, `minPrice`, `maxPrice`, `sortBy` (`name`\|`price`\|`createdAt`), `sortOrder` (`asc`\|`desc`), `page`, `limit` |
| GET | `/products/admin` | Admin | Same as above, includes archived products |
| GET | `/products/slug/:slug` | Public | Get a product by slug |
| GET | `/products/:id` | Public | Get a product by id |
| POST | `/products` | Admin | Create a product |
| PATCH | `/products/:id` | Admin | Update a product |
| DELETE | `/products/:id` | Admin | Delete a product |
| POST | `/products/:id/images` | Admin | Upload a product image (`multipart/form-data`, field `file`) |
| DELETE | `/products/:id/images/:imageId` | Admin | Remove a product image |

### Cart — `/cart`
Works for both guests and logged-in users. Guests must send an `X-Guest-Id` header (any stable client-generated UUID); logged-in requests use the Bearer token instead. A guest cart merges into the user's cart automatically on login.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/cart` | Public/Auth | Get the current cart + computed totals |
| POST | `/cart/items` | Public/Auth | Add an item (`{ productId, quantity }`) |
| PUT | `/cart/items/:productId` | Public/Auth | Update an item's quantity |
| DELETE | `/cart/items/:productId` | Public/Auth | Remove an item |
| DELETE | `/cart` | Public/Auth | Clear the cart |

### Wishlist — `/wishlist`
Auth-only (each customer has one wishlist), except the shared read-only view.

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/wishlist` | Auth | Get (or create) the current user's wishlist |
| POST | `/wishlist/items` | Auth | Add a product (`{ productId }`) |
| DELETE | `/wishlist/items/:productId` | Auth | Remove an item |
| POST | `/wishlist/items/:productId/move-to-cart` | Auth | Move an item into the cart (adds qty 1, removes from wishlist) |
| GET | `/wishlist/shared/:token` | Public | Read-only view of a wishlist by its share token (see `shareToken` on the wishlist object) |

### Checkout — `/checkout`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/checkout` | Public/Auth | Convert the current cart into an order and initiate payment (Stripe PaymentIntent or COD) |

### Orders — `/orders`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/orders/me` | Auth | List the current user's orders |
| GET | `/orders` | Admin | List all orders |
| GET | `/orders/:id` | Owner/Admin | Get one order |
| POST | `/orders/:id/cancel` | Owner/Admin | Cancel an order (customers can only cancel while `PENDING`) |
| PATCH | `/orders/:id/status` | Admin | Update order status |

### Payments — `/payments`
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/payments/webhook` | Public* | Stripe webhook receiver (*verified via Stripe signature, not a user token) |

### Dashboard — `/admin/dashboard`
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/admin/dashboard` | Admin | Aggregated stats: pending order count, revenue today/this week, 7-day revenue trend, low-stock products, out-of-stock count, total customers (+ new this week), 5 most recent orders |

### Health
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |

## Project structure

```
ecommerce/
├── backend/            NestJS API — one module per domain (auth, users, products, orders, ...)
├── frontend/           Next.js storefront + admin panel
├── deployment/         Kubernetes/Helm/ArgoCD/Argo Rollouts GitOps setup (see deployment/strategy.md)
├── docker-compose.yml  Local dev stack (mysql, minio, mailpit, backend, frontend)
└── spec.md             Full long-term feature checklist (source of truth for what's NOT built yet)
```
