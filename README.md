# Bengkelku ERP (MVP)

Bengkelku is an inventory-first ERP MVP for **small workshops (bengkel)** and **internal maintenance teams**.

Core promise:

> Never stop work because a part is missing.

This repository is intentionally scoped to operational inventory and procurement flows. It avoids complex accounting and work-order-heavy features for faster adoption.

---

## 0. SaaS Execution Tracker

For weekly SaaS roadmap tracking and launch readiness:

- `SAAS_LAUNCH_PLAN.md`

---

## 1. Product Scope

### 1.1 Included in MVP
- Parts catalog (items)
- Warehouses
- Suppliers
- Purchase Orders (PO)
- Receive stock / goods receipt behavior
- Issue / Consumption flow (built on `delivery-orders`)
- Inventory movement log (audit trail)
- Low-stock visibility and reorder candidates
- Parts CSV import/export
- Role-based access control (RBAC)

### 1.2 Hidden in MVP UI (not deleted from backend)
- Customers
- Invoices, payments, chart of accounts, cashflow/accounting flows
- Tax codes
- Advanced reservations workflows

### 1.3 Out of scope (intentional)
- Full work order management
- Advanced accounting workflows
- Multi-tenant SaaS platform-level features

---

## 2. Dashboard Analytics and Charts

Dashboard includes operational cards and analytics:

- KPI cards:
  - Open Purchase Orders
  - Pending Issues/Consumption
  - Low Stock Parts
  - Active Parts

- Operational widgets:
  - Low Stock Widget (top parts requiring replenishment)
  - Recent Issues / Consumption

- Charts:
  - **Issue Status Distribution** (Pie chart)
  - **14-Day Stock Movement Trend** (Line chart: stock-in vs stock-out)

Notes:
- Open PO card supports multiple status variants for compatibility: `draft`, `submitted`, `approved`, `reserved`, `pending`, `sent`, `partial_delivery`, `partial_received`.
- Low-stock logic uses threshold:
  - `threshold = max(min_stock, reorder_point)`
  - Candidate when `current_stock <= threshold`

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React + TypeScript + Vite + TanStack Query + Tailwind |
| Backend | NestJS + Prisma |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| Infra | Docker + Docker Compose |
| Production web serving | Nginx |
| Charts | Recharts |

---

## 4. Roles and Access

Current normalized MVP roles:

- `admin`: full access
- `storekeeper`: parts, warehouses, suppliers, receiving, PO, reports
- `technician`: create/view issue requests and view parts
- `viewer`: read-only

Backward compatibility is still accepted for legacy values such as `procurement`, `warehouse`, `finance`.

---

## 5. High-Level Architecture

```text
React (Vite SPA)
  -> /api/*
NestJS API (apps/api)
  -> Prisma Client
PostgreSQL (public + auth schemas)
```

Key backend modules:
- `auth`
- `items`
- `warehouses`
- `suppliers`
- `purchase-orders`
- `delivery-orders` (used as issue/consumption flow)
- `inventory`
- `inventory-transactions`
- `reports`
- `users`

---

## 6. Repository Structure

```text
.
|-- apps/
|   `-- api/                        # NestJS API
|       |-- prisma/schema.prisma
|       `-- src/
|           |-- auth/
|           |-- items/
|           |-- warehouses/
|           |-- suppliers/
|           |-- purchase-orders/
|           |-- delivery-orders/
|           |-- inventory/
|           |-- inventory-transactions/
|           |-- reports/
|           `-- users/
|-- src/                            # React frontend
|   |-- components/
|   |-- hooks/
|   |-- lib/api.ts
|   `-- pages/
|-- docker/
|   `-- db/init/                    # DB init schema + baseline seed
|-- docker-compose.dev.yml
|-- docker-compose.prod.yml
|-- SEED_DATA.sql                   # broad seed
`-- SEED_MVP_DEMO.sql               # MVP demo operations + reorder data
```

---

## 7. Environment Variables

### 7.1 Backend (`apps/api/.env`)

```env
DATABASE_URL=postgresql://partflow:partflow@localhost:5432/partflow?schema=public
PORT=3001
CORS_ORIGINS=http://localhost:5173,http://localhost:8080
JWT_ACCESS_SECRET=dev-access-secret
JWT_REFRESH_SECRET=dev-refresh-secret
JWT_ACCESS_TTL=900s
JWT_REFRESH_TTL=7d
FEATURE_FINANCE=false
ALLOW_NEGATIVE_STOCK=false
```

### 7.2 Frontend (`.env.local`)

```env
VITE_API_URL=http://localhost:3001/api
```

Feature flags:
- `FEATURE_FINANCE=false`: skip finance/journal side effects in issue processing
- `ALLOW_NEGATIVE_STOCK=false`: block stock-out if on-hand is insufficient

---

## 8. Run Locally

## 8.1 Option A (recommended): Full Docker dev stack

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Services:
- DB: `localhost:5432`
- API: `localhost:3001`
- Web: `localhost:5173`

If web image gets dependency issues, reset volumes and rebuild:

```bash
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

## 8.2 Option B: Hybrid local (DB in Docker, API/Web on host)

1. Start DB only:
```bash
docker-compose -f docker-compose.dev.yml up db -d
```

2. API:
```bash
cd apps/api
npm install
npm run prisma:generate
npm run start:dev
```

3. Web (project root):
```bash
npm install
npm run dev
```

---

## 9. Seed and Demo Data

Two seed files are provided:

- `SEED_DATA.sql`: broad data seed
- `SEED_MVP_DEMO.sql`: operational MVP demo seed including:
  - PO and issue/consumption examples
  - stock movement history for charts
  - explicit low-stock/reorder candidates
  - compatibility patch for `po_lines.created_at` if missing

### 9.1 Apply MVP seed (PowerShell)

```powershell
Get-Content -Raw SEED_MVP_DEMO.sql | docker exec -i partflow-db-dev psql -U partflow -d partflow
```

### 9.2 Apply MVP seed (bash)

```bash
cat SEED_MVP_DEMO.sql | docker exec -i partflow-db-dev psql -U partflow -d partflow
```

### 9.3 Verify reorder candidates quickly

```sql
SELECT sku, min_stock
FROM public.items
WHERE sku IN ('OIL-001','FILTER-OIL','BRAKE-PAD','COOLANT','BATTERY-12V');
```

Then check API:

- `GET /api/items/low-stock`
- `GET /api/reports/low-stock`

---

## 10. Authentication and Demo Login

Use existing user accounts in your DB.

If no user exists, register from UI (`/auth`) or call:

```http
POST /api/auth/register
{
  "email": "admin@example.com",
  "password": "StrongPass#123",
  "full_name": "Admin"
}
```

For existing local setups, a previously created superadmin may exist:
- `superadmin@partflow.local`

(Password depends on your local seed/manual setup history.)

---

## 11. Core API Endpoints (MVP)

Authentication:
- `POST /api/auth/login`
- `POST /api/auth/register`
- `GET /api/auth/me`

Parts:
- `GET /api/items`
- `GET /api/items/low-stock`
- `GET /api/items/export/csv`
- `POST /api/items/import/csv`
- `POST /api/items`
- `PUT /api/items/:id`
- `DELETE /api/items/:id`

Purchase Orders:
- `GET /api/purchase-orders`
- `POST /api/purchase-orders`
- `PUT /api/purchase-orders/:id`
- `PUT /api/purchase-orders/:id/status`
- `POST /api/purchase-orders/:id/reserve`
- `DELETE /api/purchase-orders/:id`

Issues / Consumption (`delivery-orders`):
- `GET /api/delivery-orders`
- `POST /api/delivery-orders`
- `PUT /api/delivery-orders/:id`
- `POST /api/delivery-orders/:id/process` (canonical consume action)
- `DELETE /api/delivery-orders/:id`

Movements and reports:
- `GET /api/inventory-transactions`
- `GET /api/reports/stock-movements`
- `GET /api/reports/low-stock`

Users (admin):
- `GET /api/users`
- `POST /api/users/create`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`
- `POST /api/users/update-password`

---

## 12. Process Flow: Consume Parts

`POST /api/delivery-orders/:id/process` does:

1. Validate issue request and lines
2. Check stock availability (unless `ALLOW_NEGATIVE_STOCK=true`)
3. Write stock-out movement transactions (`SHIP_PO`, negative qty)
4. Release reservations if present
5. Update issue status to `delivered`
6. Update related PO status as needed
7. Skip finance journals when `FEATURE_FINANCE=false`

---

## 13. CSV Format (Parts)

Expected columns:
- `sku` (required)
- `name` (required)
- `uom`
- `base_cost`
- `is_stock`
- `category`
- `min_stock`
- `reorder_point`

Import behavior:
- Existing `sku` in same org: update
- New `sku`: create
- Invalid/empty rows: skipped and counted

---

## 14. Scripts Reference

### 14.1 Root (web)
- `npm run dev`
- `npm run build`
- `npm run preview`
- `npm run lint`

### 14.2 API (`apps/api`)
- `npm run start:dev`
- `npm run build`
- `npm run test`
- `npm run prisma:generate`
- `npm run prisma:validate`
- `npm run prisma:db:pull`

---

## 15. Troubleshooting

### 15.1 `404` on known API routes
Usually stale API process/build. Restart API container or dev server.

### 15.2 Users page re-render/toast loop
Ensure error toasts are handled in effects (not in render).

### 15.3 `/purchase-orders` returns `500` with `po_lines.created_at`
Run `SEED_MVP_DEMO.sql` once. It includes safe compatibility SQL:
- `ALTER TABLE public.po_lines ADD COLUMN IF NOT EXISTS created_at ...`

### 15.4 Low Stock page is empty
- Verify thresholds (`min_stock` / `reorder_point`) are set
- Verify stock on hand from movements
- Re-run `SEED_MVP_DEMO.sql`
- Hard refresh browser (`Ctrl+Shift+R`)

---

## 16. 3-Minute Demo Script

1. Login and open Dashboard.
   - Show KPI cards + pie and movement trend charts.
2. Open Low Stock page.
   - Show reorder candidates and shortage values.
3. Open Purchase Orders and Receive Stock flow.
   - Show status progression.
4. Open Issues/Consumption and process one issue.
   - Return to Movement Log and Dashboard to show updated analytics.

---

## 17. License

MIT
