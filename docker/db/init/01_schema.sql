CREATE SCHEMA IF NOT EXISTS auth;

-- Stubs to make Supabase-auth-dependent SQL parse on plain Postgres
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated'::text $$;

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Stub for Supabase net.http_post so local Postgres init doesn't fail
CREATE SCHEMA IF NOT EXISTS net;
CREATE OR REPLACE FUNCTION net.http_post(url text, headers jsonb, body jsonb)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN;
END;
$$;

-- ===== 20251111152947_055dbccf-0269-4d2d-92e0-b4218c54f016.sql =====

-- AutoParts ERP Schema with RLS

-- Create enum types
CREATE TYPE public.app_role AS ENUM ('admin', 'service_advisor', 'technician', 'warehouse', 'procurement', 'finance', 'viewer');
CREATE TYPE public.wo_status AS ENUM ('draft', 'scheduled', 'in_progress', 'waiting_parts', 'qa', 'ready_to_bill', 'closed');
CREATE TYPE public.so_status AS ENUM ('draft', 'confirmed', 'reserved', 'fulfilled', 'invoiced', 'closed');
CREATE TYPE public.po_status AS ENUM ('draft', 'approved', 'sent', 'partial_received', 'received', 'closed');
CREATE TYPE public.invoice_status AS ENUM ('open', 'partial', 'paid', 'overdue', 'written_off');
CREATE TYPE public.cost_method AS ENUM ('fifo', 'avg');
CREATE TYPE public.trx_type AS ENUM ('GRN', 'ISSUE_WO', 'SHIP_SO', 'ADJ+', 'ADJ-', 'TRANSFER');
CREATE TYPE public.doc_type AS ENUM ('SO', 'WO');
CREATE TYPE public.gl_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');

-- Organizations table (multi-tenant)

-- Minimal stub for Supabase auth schema/table (for local dev)
CREATE TABLE IF NOT EXISTS auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  encrypted_password text NOT NULL DEFAULT '',
  raw_user_meta_data jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
CREATE TABLE public.orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ensure demo org exists for legacy seed/migrations that reference this constant UUID
INSERT INTO public.orgs (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Organization')
ON CONFLICT (id) DO NOTHING;

-- Users table (linked to auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  role public.app_role NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(email)
);

CREATE INDEX idx_users_org_id ON public.users(org_id);
CREATE INDEX idx_users_role ON public.users(role);

-- Customers
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  tax_id TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_org_id ON public.customers(org_id);

-- Vehicles
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  plate TEXT NOT NULL,
  vin TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_vehicles_org_id ON public.vehicles(org_id);
CREATE INDEX idx_vehicles_customer_id ON public.vehicles(customer_id);
CREATE INDEX idx_vehicles_plate ON public.vehicles(plate);

-- Suppliers
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  lead_time_days INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_suppliers_org_id ON public.suppliers(org_id);

-- Warehouses
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, code)
);

CREATE INDEX idx_warehouses_org_id ON public.warehouses(org_id);

-- Bins (storage locations within warehouses)
CREATE TABLE public.bins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses ON DELETE CASCADE,
  code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(warehouse_id, code)
);

CREATE INDEX idx_bins_org_id ON public.bins(org_id);
CREATE INDEX idx_bins_warehouse_id ON public.bins(warehouse_id);

-- Tax codes
CREATE TABLE public.tax_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  code TEXT NOT NULL,
  rate NUMERIC(5,2) NOT NULL,
  UNIQUE(org_id, code)
);

CREATE INDEX idx_tax_codes_org_id ON public.tax_codes(org_id);

-- Items (parts and services)
CREATE TABLE public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  is_stock BOOLEAN DEFAULT true,
  uom TEXT DEFAULT 'unit',
  sell_price NUMERIC(18,2) DEFAULT 0,
  cost_method public.cost_method DEFAULT 'avg',
  tax_code_id UUID REFERENCES public.tax_codes,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, sku)
);

CREATE INDEX idx_items_org_id ON public.items(org_id);
CREATE INDEX idx_items_sku ON public.items(sku);
CREATE INDEX idx_items_is_stock ON public.items(is_stock);

-- Price tiers
CREATE TABLE public.price_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  name TEXT NOT NULL,
  multiplier NUMERIC(6,3) DEFAULT 1.000
);

CREATE INDEX idx_price_tiers_org_id ON public.price_tiers(org_id);

-- Sales Orders
CREATE TABLE public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  status public.so_status DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_orders_org_id ON public.sales_orders(org_id);
CREATE INDEX idx_sales_orders_customer_id ON public.sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON public.sales_orders(status);

-- Sales Order Lines
CREATE TABLE public.sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items,
  qty NUMERIC(18,2) NOT NULL,
  unit_price NUMERIC(18,2) NOT NULL,
  tax_code_id UUID REFERENCES public.tax_codes,
  is_service BOOLEAN DEFAULT false
);

CREATE INDEX idx_sales_order_lines_org_id ON public.sales_order_lines(org_id);
CREATE INDEX idx_sales_order_lines_so_id ON public.sales_order_lines(sales_order_id);

-- Work Orders
CREATE TABLE public.work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.vehicles ON DELETE CASCADE,
  status public.wo_status DEFAULT 'draft',
  advisor_id UUID REFERENCES public.users,
  technician_id UUID REFERENCES public.users,
  scheduled_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_work_orders_org_id ON public.work_orders(org_id);
CREATE INDEX idx_work_orders_customer_id ON public.work_orders(customer_id);
CREATE INDEX idx_work_orders_vehicle_id ON public.work_orders(vehicle_id);
CREATE INDEX idx_work_orders_status ON public.work_orders(status);
CREATE INDEX idx_work_orders_technician_id ON public.work_orders(technician_id);

-- Work Order Labor
CREATE TABLE public.work_order_labor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders ON DELETE CASCADE,
  description TEXT NOT NULL,
  hours NUMERIC(10,2) NOT NULL,
  labor_rate NUMERIC(18,2) NOT NULL,
  line_total NUMERIC(18,2) NOT NULL
);

CREATE INDEX idx_work_order_labor_org_id ON public.work_order_labor(org_id);
CREATE INDEX idx_work_order_labor_wo_id ON public.work_order_labor(work_order_id);

-- Work Order Parts
CREATE TABLE public.work_order_parts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  work_order_id UUID NOT NULL REFERENCES public.work_orders ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items,
  qty NUMERIC(18,2) NOT NULL,
  reserve_id UUID,
  line_total NUMERIC(18,2) NOT NULL
);

CREATE INDEX idx_work_order_parts_org_id ON public.work_order_parts(org_id);
CREATE INDEX idx_work_order_parts_wo_id ON public.work_order_parts(work_order_id);

-- Reservations (stock holds)
CREATE TABLE public.reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  doc_type public.doc_type NOT NULL,
  doc_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.items,
  qty NUMERIC(18,2) NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reservations_org_id ON public.reservations(org_id);
CREATE INDEX idx_reservations_doc ON public.reservations(doc_type, doc_id);
CREATE INDEX idx_reservations_item_id ON public.reservations(item_id);

-- Purchase Orders
CREATE TABLE public.purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers ON DELETE CASCADE,
  status public.po_status DEFAULT 'draft',
  eta_date DATE,
  created_by UUID NOT NULL REFERENCES public.users,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_purchase_orders_org_id ON public.purchase_orders(org_id);
CREATE INDEX idx_purchase_orders_supplier_id ON public.purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders(status);

-- PO Lines
CREATE TABLE public.po_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items,
  qty NUMERIC(18,2) NOT NULL,
  unit_cost NUMERIC(18,2) NOT NULL
);

CREATE INDEX idx_po_lines_org_id ON public.po_lines(org_id);
CREATE INDEX idx_po_lines_po_id ON public.po_lines(purchase_order_id);

-- Goods Receipts
CREATE TABLE public.goods_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  received_by UUID NOT NULL REFERENCES public.users
);

CREATE INDEX idx_goods_receipts_org_id ON public.goods_receipts(org_id);
CREATE INDEX idx_goods_receipts_po_id ON public.goods_receipts(purchase_order_id);

-- Inventory Transactions (immutable ledger)
CREATE TABLE public.inventory_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.items,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses,
  bin_id UUID REFERENCES public.bins,
  trx_type public.trx_type NOT NULL,
  ref_table TEXT,
  ref_id UUID,
  qty NUMERIC(18,2) NOT NULL,
  unit_cost NUMERIC(18,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_inventory_transactions_org_id ON public.inventory_transactions(org_id);
CREATE INDEX idx_inventory_transactions_item_id ON public.inventory_transactions(item_id);
CREATE INDEX idx_inventory_transactions_warehouse_id ON public.inventory_transactions(warehouse_id);
CREATE INDEX idx_inventory_transactions_ref ON public.inventory_transactions(ref_table, ref_id);

-- Invoices
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  source_type TEXT CHECK(source_type IN ('SO', 'WO')),
  source_id UUID,
  status public.invoice_status DEFAULT 'open',
  subtotal NUMERIC(18,2) DEFAULT 0,
  tax_total NUMERIC(18,2) DEFAULT 0,
  grand_total NUMERIC(18,2) DEFAULT 0,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  due_at TIMESTAMPTZ
);

CREATE INDEX idx_invoices_org_id ON public.invoices(org_id);
CREATE INDEX idx_invoices_customer_id ON public.invoices(customer_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_source ON public.invoices(source_type, source_id);

-- Invoice Lines
CREATE TABLE public.invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices ON DELETE CASCADE,
  item_id UUID REFERENCES public.items,
  description TEXT NOT NULL,
  qty NUMERIC(18,2) NOT NULL,
  unit_price NUMERIC(18,2) NOT NULL,
  tax_code_id UUID REFERENCES public.tax_codes,
  line_total NUMERIC(18,2) NOT NULL,
  is_service BOOLEAN DEFAULT false
);

CREATE INDEX idx_invoice_lines_org_id ON public.invoice_lines(org_id);
CREATE INDEX idx_invoice_lines_invoice_id ON public.invoice_lines(invoice_id);

-- Payments
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL,
  method TEXT,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payments_org_id ON public.payments(org_id);
CREATE INDEX idx_payments_customer_id ON public.payments(customer_id);

-- Payment Allocations
CREATE TABLE public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.payments ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.invoices ON DELETE CASCADE,
  amount NUMERIC(18,2) NOT NULL
);

CREATE INDEX idx_payment_allocations_org_id ON public.payment_allocations(org_id);
CREATE INDEX idx_payment_allocations_payment_id ON public.payment_allocations(payment_id);
CREATE INDEX idx_payment_allocations_invoice_id ON public.payment_allocations(invoice_id);

-- GL Accounts
CREATE TABLE public.gl_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  type public.gl_type NOT NULL,
  UNIQUE(org_id, code)
);

CREATE INDEX idx_gl_accounts_org_id ON public.gl_accounts(org_id);

-- Journal Entries
CREATE TABLE public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  memo TEXT,
  posted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_journal_entries_org_id ON public.journal_entries(org_id);

-- Journal Lines
CREATE TABLE public.journal_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.orgs ON DELETE CASCADE,
  entry_id UUID NOT NULL REFERENCES public.journal_entries ON DELETE CASCADE,
  gl_account_id UUID NOT NULL REFERENCES public.gl_accounts,
  dr NUMERIC(18,2) DEFAULT 0,
  cr NUMERIC(18,2) DEFAULT 0
);

CREATE INDEX idx_journal_lines_org_id ON public.journal_lines(org_id);
CREATE INDEX idx_journal_lines_entry_id ON public.journal_lines(entry_id);

-- Create view for inventory on-hand
CREATE OR REPLACE VIEW public.v_inventory_onhand AS
SELECT
  org_id,
  item_id,
  warehouse_id,
  SUM(CASE WHEN trx_type IN ('GRN', 'ADJ+', 'TRANSFER') THEN qty ELSE -qty END) as qty_onhand
FROM public.inventory_transactions
GROUP BY org_id, item_id, warehouse_id;

-- Enable RLS on all tables
ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_labor ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.po_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gl_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- Create helper function to get user's org_id
CREATE OR REPLACE FUNCTION public.get_user_org_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.users WHERE id = auth.uid();
$$;

-- Create helper function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = _role
      AND is_active = true
  );
$$;

-- RLS Policies (org isolation + role-based access)

-- Organizations
CREATE POLICY "Users can view their org" ON public.orgs
  FOR SELECT USING (id = public.get_user_org_id());

-- Users
CREATE POLICY "Users can view users in their org" ON public.users
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage users" ON public.users
  FOR ALL USING (public.has_role('admin'));

-- Customers
CREATE POLICY "Users can view customers in their org" ON public.customers
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage customers" ON public.customers
  FOR ALL USING (org_id = public.get_user_org_id() AND public.has_role('service_advisor'));

CREATE POLICY "Admins can manage customers" ON public.customers
  FOR ALL USING (public.has_role('admin'));

-- Vehicles
CREATE POLICY "Users can view vehicles in their org" ON public.vehicles
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage vehicles" ON public.vehicles
  FOR ALL USING (org_id = public.get_user_org_id() AND public.has_role('service_advisor'));

CREATE POLICY "Admins can manage vehicles" ON public.vehicles
  FOR ALL USING (public.has_role('admin'));

-- Suppliers
CREATE POLICY "Users can view suppliers in their org" ON public.suppliers
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Procurement can manage suppliers" ON public.suppliers
  FOR ALL USING (org_id = public.get_user_org_id() AND public.has_role('procurement'));

CREATE POLICY "Admins can manage suppliers" ON public.suppliers
  FOR ALL USING (public.has_role('admin'));

-- Warehouses
CREATE POLICY "Users can view warehouses in their org" ON public.warehouses
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Warehouse can manage warehouses" ON public.warehouses
  FOR ALL USING (org_id = public.get_user_org_id() AND public.has_role('warehouse'));

CREATE POLICY "Admins can manage warehouses" ON public.warehouses
  FOR ALL USING (public.has_role('admin'));

-- Bins
CREATE POLICY "Users can view bins in their org" ON public.bins
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Warehouse can manage bins" ON public.bins
  FOR ALL USING (org_id = public.get_user_org_id() AND public.has_role('warehouse'));

CREATE POLICY "Admins can manage bins" ON public.bins
  FOR ALL USING (public.has_role('admin'));

-- Tax codes
CREATE POLICY "Users can view tax codes in their org" ON public.tax_codes
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage tax codes" ON public.tax_codes
  FOR ALL USING (public.has_role('admin'));

-- Items
CREATE POLICY "Users can view items in their org" ON public.items
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage items" ON public.items
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('admin')));

-- Work Orders
CREATE POLICY "Users can view work orders in their org" ON public.work_orders
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage work orders" ON public.work_orders
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('admin')));

CREATE POLICY "Technicians can view assigned work orders" ON public.work_orders
  FOR SELECT USING (org_id = public.get_user_org_id() AND (technician_id = auth.uid() OR public.has_role('technician')));

-- Work Order Labor
CREATE POLICY "Users can view labor in their org" ON public.work_order_labor
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage labor" ON public.work_order_labor
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('technician') OR public.has_role('admin')));

-- Work Order Parts
CREATE POLICY "Users can view parts in their org" ON public.work_order_parts
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage parts" ON public.work_order_parts
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('technician') OR public.has_role('admin')));

-- Sales Orders
CREATE POLICY "Users can view sales orders in their org" ON public.sales_orders
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage sales orders" ON public.sales_orders
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('admin')));

-- Sales Order Lines
CREATE POLICY "Users can view sales order lines in their org" ON public.sales_order_lines
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage sales order lines" ON public.sales_order_lines
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('admin')));

-- Purchase Orders
CREATE POLICY "Users can view purchase orders in their org" ON public.purchase_orders
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Procurement can manage purchase orders" ON public.purchase_orders
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('procurement') OR public.has_role('admin')));

-- PO Lines
CREATE POLICY "Users can view po lines in their org" ON public.po_lines
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Procurement can manage po lines" ON public.po_lines
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('procurement') OR public.has_role('admin')));

-- Goods Receipts
CREATE POLICY "Users can view goods receipts in their org" ON public.goods_receipts
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Warehouse can manage goods receipts" ON public.goods_receipts
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('warehouse') OR public.has_role('admin')));

-- Inventory Transactions
CREATE POLICY "Users can view inventory transactions in their org" ON public.inventory_transactions
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Warehouse can create inventory transactions" ON public.inventory_transactions
  FOR INSERT WITH CHECK (org_id = public.get_user_org_id() AND (public.has_role('warehouse') OR public.has_role('admin')));

-- Reservations
CREATE POLICY "Users can view reservations in their org" ON public.reservations
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Service advisors can manage reservations" ON public.reservations
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('service_advisor') OR public.has_role('warehouse') OR public.has_role('admin')));

-- Invoices
CREATE POLICY "Users can view invoices in their org" ON public.invoices
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage invoices" ON public.invoices
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- Invoice Lines
CREATE POLICY "Users can view invoice lines in their org" ON public.invoice_lines
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage invoice lines" ON public.invoice_lines
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- Payments
CREATE POLICY "Users can view payments in their org" ON public.payments
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage payments" ON public.payments
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- Payment Allocations
CREATE POLICY "Users can view payment allocations in their org" ON public.payment_allocations
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage payment allocations" ON public.payment_allocations
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- GL Accounts
CREATE POLICY "Users can view gl accounts in their org" ON public.gl_accounts
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage gl accounts" ON public.gl_accounts
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- Journal Entries
CREATE POLICY "Users can view journal entries in their org" ON public.journal_entries
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage journal entries" ON public.journal_entries
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- Journal Lines
CREATE POLICY "Users can view journal lines in their org" ON public.journal_lines
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Finance can manage journal lines" ON public.journal_lines
  FOR ALL USING (org_id = public.get_user_org_id() AND (public.has_role('finance') OR public.has_role('admin')));

-- Price Tiers
CREATE POLICY "Users can view price tiers in their org" ON public.price_tiers
  FOR SELECT USING (org_id = public.get_user_org_id());

CREATE POLICY "Admins can manage price tiers" ON public.price_tiers
  FOR ALL USING (public.has_role('admin'));

-- ===== 20251111154841_b13b25b0-4fa2-49eb-8853-5f3bdba0f4d9.sql =====

-- Create database webhook to call edge function on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Call the edge function via HTTP request
  PERFORM
    net.http_post(
      url := 'https://dgijkdszschdztbnbbpg.supabase.co/functions/v1/handle-new-user',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
      ),
      body := jsonb_build_object('record', row_to_json(NEW))
    );
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== 20251111154915_74e70f15-4d8e-4e04-a430-3c2c761b748c.sql =====

-- Drop the previous complex trigger setup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create a simple trigger function that directly inserts into users table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  org_id_var uuid;
BEGIN
  -- Get the first organization (demo org)
  SELECT id INTO org_id_var
  FROM public.orgs
  LIMIT 1;

  -- If no org exists, raise an error
  IF org_id_var IS NULL THEN
    RAISE EXCEPTION 'No organization found. Please run seed data first.';
  END IF;

  -- Link user to organization with viewer role by default
  INSERT INTO public.users (id, org_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    org_id_var,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    'viewer',
    true
  );

  RETURN NEW;
END;
$$;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ===== 20251111170436_df445a7f-8433-4c34-81ad-cdf1b42ae0bc.sql =====

-- Backfill current authenticated user into public.users so org_id can be resolved when creating records
INSERT INTO auth.users (id, email, encrypted_password)
VALUES ('3090256e-2a4b-401d-851f-dd9bf5cfda3f'::uuid, 'revanza.raytama@gmail.com', '$2b$10$QVLWLj3.mSjPI6sCh6E5weO5kXDCit2rPjXz9QiHoc7DMinmqKUtS')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, org_id, email, full_name, role, is_active)
SELECT
  '3090256e-2a4b-401d-851f-dd9bf5cfda3f'::uuid,
  o.id,
  'revanza.raytama@gmail.com',
  'Revanza Raytama',
  'admin'::app_role,
  true
FROM public.orgs o
ORDER BY o.created_at ASC
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ===== 20251111174020_742ea3a3-a7d5-40f6-beff-93d84a924641.sql =====

-- Fix inventory on-hand view to correctly handle negative quantities
-- The issue: ADJ- transactions are stored with negative qty values,
-- but the view was negating them again, turning them positive.

DROP VIEW IF EXISTS public.v_inventory_onhand;

CREATE OR REPLACE VIEW public.v_inventory_onhand AS
SELECT
  org_id,
  item_id,
  warehouse_id,
  SUM(qty) as qty_onhand
FROM public.inventory_transactions
GROUP BY org_id, item_id, warehouse_id;

-- ===== 20251111174106_ca89b7ac-c51a-46c9-84fc-2707e970e6c4.sql =====

-- Fix security issue with v_inventory_onhand view
-- Add security_invoker=on to respect RLS policies

DROP VIEW IF EXISTS public.v_inventory_onhand;

CREATE OR REPLACE VIEW public.v_inventory_onhand
  WITH (security_invoker=on) AS
SELECT
  org_id,
  item_id,
  warehouse_id,
  SUM(qty) as qty_onhand
FROM public.inventory_transactions
GROUP BY org_id, item_id, warehouse_id;

-- ===== 20251215014425_4057c2b4-e32f-4ee5-adee-2e9841cc70bc.sql =====


-- =====================================================
-- PHASE 1: CREATE NEW ENUM TYPES
-- =====================================================

-- New PO status enum with full lifecycle
CREATE TYPE po_status_v2 AS ENUM (
  'draft', 'submitted', 'approved', 'reserved', 'pending', 
  'partial_delivery', 'delivered', 'closed', 'cancelled'
);

-- New document type for reservations (PO only now)
CREATE TYPE doc_type_v2 AS ENUM ('PO');

-- New transaction type
CREATE TYPE trx_type_v2 AS ENUM ('GRN', 'SHIP_PO', 'ADJ+', 'ADJ-', 'TRANSFER');

-- Cashflow entry type
CREATE TYPE cashflow_type AS ENUM ('cash_in', 'cash_out');

-- Cashflow status
CREATE TYPE cashflow_status AS ENUM ('planned', 'paid');

-- Delivery order status
CREATE TYPE delivery_status AS ENUM ('draft', 'confirmed', 'delivered');

-- =====================================================
-- PHASE 2: MODIFY EXISTING TABLES
-- =====================================================

-- Add new columns to purchase_orders
ALTER TABLE purchase_orders 
ADD COLUMN IF NOT EXISTS po_number TEXT,
ADD COLUMN IF NOT EXISTS planned_delivery_start DATE,
ADD COLUMN IF NOT EXISTS actual_delivery_date DATE,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'IDR',
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customers(id);

-- Add new columns to items
ALTER TABLE items 
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS min_stock NUMERIC DEFAULT 0;

-- Add NPWP to suppliers
ALTER TABLE suppliers 
ADD COLUMN IF NOT EXISTS npwp TEXT;

-- Add new columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS purchase_order_id UUID REFERENCES purchase_orders(id),
ADD COLUMN IF NOT EXISTS invoice_number TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- =====================================================
-- PHASE 3: CREATE NEW TABLES
-- =====================================================

-- Delivery Orders (Surat Jalan)
CREATE TABLE IF NOT EXISTS delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  delivery_number TEXT NOT NULL,
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
  customer_id UUID REFERENCES customers(id),
  delivery_date DATE NOT NULL,
  actual_delivery_date DATE,
  status delivery_status DEFAULT 'draft',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Delivery Order Lines
CREATE TABLE IF NOT EXISTS delivery_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  delivery_order_id UUID NOT NULL REFERENCES delivery_orders(id) ON DELETE CASCADE,
  po_line_id UUID REFERENCES po_lines(id),
  item_id UUID NOT NULL REFERENCES items(id),
  qty_ordered NUMERIC NOT NULL,
  qty_delivered NUMERIC NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cashflow Entries
CREATE TABLE IF NOT EXISTS cashflow_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  entry_number TEXT NOT NULL,
  entry_date DATE NOT NULL,
  planned_date DATE,
  actual_date DATE,
  type cashflow_type NOT NULL,
  category TEXT,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  amount NUMERIC NOT NULL,
  payment_method TEXT,
  status cashflow_status DEFAULT 'planned',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES orgs(id),
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL,
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- PHASE 4: ENABLE RLS ON NEW TABLES
-- =====================================================

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashflow_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PHASE 5: CREATE RLS POLICIES
-- =====================================================

-- Delivery Orders Policies
CREATE POLICY "Users can view delivery orders in their org"
ON delivery_orders FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "Procurement can manage delivery orders"
ON delivery_orders FOR ALL
USING (org_id = get_user_org_id() AND (has_role('procurement') OR has_role('warehouse') OR has_role('admin')));

-- Delivery Order Lines Policies
CREATE POLICY "Users can view delivery order lines in their org"
ON delivery_order_lines FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "Procurement can manage delivery order lines"
ON delivery_order_lines FOR ALL
USING (org_id = get_user_org_id() AND (has_role('procurement') OR has_role('warehouse') OR has_role('admin')));

-- Cashflow Entries Policies
CREATE POLICY "Users can view cashflow entries in their org"
ON cashflow_entries FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "Finance can manage cashflow entries"
ON cashflow_entries FOR ALL
USING (org_id = get_user_org_id() AND (has_role('finance') OR has_role('admin')));

-- Audit Logs Policies (read-only for all users in org)
CREATE POLICY "Users can view audit logs in their org"
ON audit_logs FOR SELECT
USING (org_id = get_user_org_id());

-- Only system can insert audit logs (via trigger or admin)
CREATE POLICY "Admins can insert audit logs"
ON audit_logs FOR INSERT
WITH CHECK (org_id = get_user_org_id() AND has_role('admin'));

-- =====================================================
-- PHASE 6: CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_delivery_orders_org ON delivery_orders(org_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_po ON delivery_orders(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(status);
CREATE INDEX IF NOT EXISTS idx_delivery_order_lines_do ON delivery_order_lines(delivery_order_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_org ON cashflow_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_type ON cashflow_entries(type);
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_status ON cashflow_entries(status);
CREATE INDEX IF NOT EXISTS idx_cashflow_entries_date ON cashflow_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_po_customer ON purchase_orders(customer_id);

-- =====================================================
-- PHASE 7: CREATE HELPER FUNCTIONS
-- =====================================================

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(po_number, '^PO-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || today_str || '-%';
  RETURN 'PO-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

-- Function to generate delivery number
CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(delivery_number, '^SJ-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM delivery_orders
  WHERE delivery_number LIKE 'SJ-' || today_str || '-%';
  RETURN 'SJ-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '^INV-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || today_str || '-%';
  RETURN 'INV-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

-- Function to generate cashflow entry number
CREATE OR REPLACE FUNCTION generate_cashflow_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(entry_number, '^CF-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM cashflow_entries
  WHERE entry_number LIKE 'CF-' || today_str || '-%';
  RETURN 'CF-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

-- =====================================================
-- PHASE 8: UPDATE TIMESTAMP TRIGGER
-- =====================================================

-- Create update timestamp function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_delivery_orders_updated_at ON delivery_orders;
CREATE TRIGGER update_delivery_orders_updated_at
  BEFORE UPDATE ON delivery_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cashflow_entries_updated_at ON cashflow_entries;
CREATE TRIGGER update_cashflow_entries_updated_at
  BEFORE UPDATE ON cashflow_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ===== 20251215014453_96f5b264-278d-4a92-9621-dc53149ef9d0.sql =====


-- Fix function search_path security warnings

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(po_number, '^PO-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM purchase_orders
  WHERE po_number LIKE 'PO-' || today_str || '-%';
  RETURN 'PO-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_delivery_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(delivery_number, '^SJ-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM delivery_orders
  WHERE delivery_number LIKE 'SJ-' || today_str || '-%';
  RETURN 'SJ-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(invoice_number, '^INV-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM invoices
  WHERE invoice_number LIKE 'INV-' || today_str || '-%';
  RETURN 'INV-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION generate_cashflow_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  seq_num INTEGER;
  today_str TEXT;
BEGIN
  today_str := to_char(CURRENT_DATE, 'YYYYMMDD');
  SELECT COALESCE(MAX(
    CAST(NULLIF(regexp_replace(entry_number, '^CF-' || today_str || '-', ''), '') AS INTEGER)
  ), 0) + 1 INTO seq_num
  FROM cashflow_entries
  WHERE entry_number LIKE 'CF-' || today_str || '-%';
  RETURN 'CF-' || today_str || '-' || LPAD(seq_num::TEXT, 3, '0');
END;
$$;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ===== 20251215041320_6bf17e03-32c4-47e8-88ce-e536efe8ce94.sql =====

-- Drop the old constraint and add new one that includes 'PO'
ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_source_type_check;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_source_type_check 
  CHECK (source_type = ANY (ARRAY['SO'::text, 'WO'::text, 'PO'::text]));

-- ===== 20251215042343_6dacd1d1-ffce-4551-a52e-c23b95d32a32.sql =====

-- First, let's check if we need to add 'PO' to doc_type enum
-- Since doc_type only has SO and WO, we need to alter it to support PO for reservations

-- We cannot directly modify enum values, so we need to create a new approach
-- Option: Use text type for doc_type in reservations or add PO to existing enum

-- Add PO to the doc_type enum
ALTER TYPE doc_type ADD VALUE IF NOT EXISTS 'PO';

-- ===== 20251215043056_8ba0e086-2943-4161-bc1f-e8f4ebe76604.sql =====

-- Drop unused tables from old automotive workshop system
-- Order matters due to foreign key dependencies

-- Drop work order related tables first (they reference vehicles)
DROP TABLE IF EXISTS work_order_parts CASCADE;
DROP TABLE IF EXISTS work_order_labor CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;

-- Drop sales order tables
DROP TABLE IF EXISTS sales_order_lines CASCADE;
DROP TABLE IF EXISTS sales_orders CASCADE;

-- Drop vehicles table
DROP TABLE IF EXISTS vehicles CASCADE;

-- ===== 20251215043752_9d822bc1-7e3d-466c-8e0e-033dc442fcc0.sql =====

-- Add 'pending' to po_status enum
ALTER TYPE po_status ADD VALUE IF NOT EXISTS 'pending';

-- ===== 20251215064838_bd5009d5-cf8d-4cc2-9760-119d2549079e.sql =====

-- Add soft delete column to purchase_orders
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add deleted_at timestamp for audit trail
ALTER TABLE public.purchase_orders 
ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- Create index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_purchase_orders_is_deleted 
ON public.purchase_orders(is_deleted) 
WHERE is_deleted = false;

-- ===== 20251215070749_33797222-c04f-4d77-876f-cc6fdeb01235.sql =====

-- Add 'cancelled' status to invoice_status enum
ALTER TYPE invoice_status ADD VALUE 'cancelled';

-- ===== 20251215080817_d4bb2437-0b99-4bab-8491-0c8b26f0d6fd.sql =====

-- Migration: Cleanup legacy transaction types SHIP_SO and ISSUE_WO
-- SHIP_SO (Sales Order shipment) → ADJ- (stock reduction)
-- ISSUE_WO (Work Order material issue) → ADJ- (stock reduction)

-- Update SHIP_SO transactions to ADJ-
UPDATE inventory_transactions
SET trx_type = 'ADJ-'
WHERE trx_type = 'SHIP_SO';

-- Update ISSUE_WO transactions to ADJ-
UPDATE inventory_transactions
SET trx_type = 'ADJ-'
WHERE trx_type = 'ISSUE_WO';

-- ===== 20251215082811_a1866f1f-cf01-4863-8d8d-8e7e895fc79a.sql =====

-- Add base_cost column to items table
ALTER TABLE items ADD COLUMN base_cost numeric DEFAULT 0;

-- Migrate existing sell_price data to base_cost (approximate - without tax)
UPDATE items SET base_cost = COALESCE(sell_price, 0);

-- Drop sell_price and cost_method columns
ALTER TABLE items DROP COLUMN sell_price;
ALTER TABLE items DROP COLUMN cost_method;

-- ===== 20251215084248_88fca582-9f7a-4087-bd30-08a354c0e59f.sql =====

-- Bersihkan semua data transaksi untuk clean beginning balance
-- Master data (items, customers, suppliers, warehouses, tax_codes, users, orgs) TETAP dipertahankan

-- 1. Payment allocations (references payments and invoices)
DELETE FROM payment_allocations;

-- 2. Payments
DELETE FROM payments;

-- 3. Invoice lines (references invoices)
DELETE FROM invoice_lines;

-- 4. Invoices
DELETE FROM invoices;

-- 5. Cashflow entries
DELETE FROM cashflow_entries;

-- 6. Delivery order lines (references delivery_orders)
DELETE FROM delivery_order_lines;

-- 7. Delivery orders (references purchase_orders)
DELETE FROM delivery_orders;

-- 8. Reservations
DELETE FROM reservations;

-- 9. Goods receipts (references purchase_orders)
DELETE FROM goods_receipts;

-- 10. PO lines (references purchase_orders)
DELETE FROM po_lines;

-- 11. Purchase orders
DELETE FROM purchase_orders;

-- 12. Inventory transactions (this resets all stock to 0)
DELETE FROM inventory_transactions;

-- 13. Journal lines (references journal_entries)
DELETE FROM journal_lines;

-- 14. Journal entries
DELETE FROM journal_entries;

-- 15. Audit logs (optional, untuk clean slate)
DELETE FROM audit_logs;

-- ===== 20251215090820_de6df333-00fe-4aaa-a3ee-61f3cd0695ea.sql =====

-- Step 1: Update any users with old roles to 'viewer' first
UPDATE public.users SET role = 'viewer' WHERE role IN ('service_advisor', 'technician');

-- Step 2: Drop RLS policies that reference service_advisor (old policies)
DROP POLICY IF EXISTS "Service advisors can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Service advisors can manage items" ON public.items;
DROP POLICY IF EXISTS "Service advisors can manage reservations" ON public.reservations;

-- Step 3: Drop ALL dependent policies on app_role
DROP POLICY IF EXISTS "Admins can manage users" ON public.users;
DROP POLICY IF EXISTS "Admins can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Procurement can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Admins can manage suppliers" ON public.suppliers;
DROP POLICY IF EXISTS "Warehouse can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Admins can manage warehouses" ON public.warehouses;
DROP POLICY IF EXISTS "Warehouse can manage bins" ON public.bins;
DROP POLICY IF EXISTS "Admins can manage bins" ON public.bins;
DROP POLICY IF EXISTS "Admins can manage tax codes" ON public.tax_codes;
DROP POLICY IF EXISTS "Procurement can manage purchase orders" ON public.purchase_orders;
DROP POLICY IF EXISTS "Procurement can manage po lines" ON public.po_lines;
DROP POLICY IF EXISTS "Warehouse can manage goods receipts" ON public.goods_receipts;
DROP POLICY IF EXISTS "Warehouse can create inventory transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Finance can manage invoices" ON public.invoices;
DROP POLICY IF EXISTS "Finance can manage invoice lines" ON public.invoice_lines;
DROP POLICY IF EXISTS "Finance can manage payments" ON public.payments;
DROP POLICY IF EXISTS "Finance can manage payment allocations" ON public.payment_allocations;
DROP POLICY IF EXISTS "Finance can manage gl accounts" ON public.gl_accounts;
DROP POLICY IF EXISTS "Finance can manage journal entries" ON public.journal_entries;
DROP POLICY IF EXISTS "Finance can manage journal lines" ON public.journal_lines;
DROP POLICY IF EXISTS "Admins can manage price tiers" ON public.price_tiers;
DROP POLICY IF EXISTS "Procurement can manage delivery orders" ON public.delivery_orders;
DROP POLICY IF EXISTS "Procurement can manage delivery order lines" ON public.delivery_order_lines;
DROP POLICY IF EXISTS "Finance can manage cashflow entries" ON public.cashflow_entries;
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.audit_logs;

-- Step 4: Drop has_role function
DROP FUNCTION IF EXISTS public.has_role(app_role);

-- Step 5: Create new enum
CREATE TYPE app_role_new AS ENUM ('admin', 'procurement', 'warehouse', 'finance', 'viewer');

-- Step 6: Alter users table column to use new enum
ALTER TABLE public.users 
  ALTER COLUMN role DROP DEFAULT,
  ALTER COLUMN role TYPE app_role_new USING role::text::app_role_new,
  ALTER COLUMN role SET DEFAULT 'viewer'::app_role_new;

-- Step 7: Drop old enum and rename new
DROP TYPE app_role;
ALTER TYPE app_role_new RENAME TO app_role;

-- Step 8: Recreate has_role function
CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role = _role
      AND is_active = true
  );
$$;

-- Step 9: Recreate all RLS policies with new enum
CREATE POLICY "Admins can manage users" ON public.users FOR ALL USING (has_role('admin'::app_role));

CREATE POLICY "Admins can manage customers" ON public.customers FOR ALL USING (has_role('admin'::app_role));
CREATE POLICY "Procurement can manage customers" ON public.customers FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('procurement'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Procurement can manage suppliers" ON public.suppliers FOR ALL USING ((org_id = get_user_org_id()) AND has_role('procurement'::app_role));
CREATE POLICY "Admins can manage suppliers" ON public.suppliers FOR ALL USING (has_role('admin'::app_role));

CREATE POLICY "Warehouse can manage warehouses" ON public.warehouses FOR ALL USING ((org_id = get_user_org_id()) AND has_role('warehouse'::app_role));
CREATE POLICY "Admins can manage warehouses" ON public.warehouses FOR ALL USING (has_role('admin'::app_role));

CREATE POLICY "Warehouse can manage bins" ON public.bins FOR ALL USING ((org_id = get_user_org_id()) AND has_role('warehouse'::app_role));
CREATE POLICY "Admins can manage bins" ON public.bins FOR ALL USING (has_role('admin'::app_role));

CREATE POLICY "Admins can manage tax codes" ON public.tax_codes FOR ALL USING (has_role('admin'::app_role));

CREATE POLICY "Procurement can manage purchase orders" ON public.purchase_orders FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('procurement'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Procurement can manage po lines" ON public.po_lines FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('procurement'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Warehouse can manage goods receipts" ON public.goods_receipts FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('warehouse'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Warehouse can create inventory transactions" ON public.inventory_transactions FOR INSERT WITH CHECK ((org_id = get_user_org_id()) AND (has_role('warehouse'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Finance can manage invoices" ON public.invoices FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Finance can manage invoice lines" ON public.invoice_lines FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Finance can manage payments" ON public.payments FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Finance can manage payment allocations" ON public.payment_allocations FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Finance can manage gl accounts" ON public.gl_accounts FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Finance can manage journal entries" ON public.journal_entries FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Finance can manage journal lines" ON public.journal_lines FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Admins can manage price tiers" ON public.price_tiers FOR ALL USING (has_role('admin'::app_role));

CREATE POLICY "Procurement can manage delivery orders" ON public.delivery_orders FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('procurement'::app_role) OR has_role('warehouse'::app_role) OR has_role('admin'::app_role)));
CREATE POLICY "Procurement can manage delivery order lines" ON public.delivery_order_lines FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('procurement'::app_role) OR has_role('warehouse'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Finance can manage cashflow entries" ON public.cashflow_entries FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Admins can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK ((org_id = get_user_org_id()) AND has_role('admin'::app_role));

CREATE POLICY "Procurement can manage items" ON public.items FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('procurement'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Warehouse can manage reservations" ON public.reservations FOR ALL USING ((org_id = get_user_org_id()) AND (has_role('warehouse'::app_role) OR has_role('procurement'::app_role) OR has_role('admin'::app_role)));

-- ===== 20251225100136_ce4bbbfd-e7de-46c1-a8cc-5b846edc6446.sql =====

-- Create account_settings table for global mapping
CREATE TABLE public.account_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.orgs(id) ON DELETE CASCADE,
  setting_key text NOT NULL,
  gl_account_id uuid NOT NULL REFERENCES public.gl_accounts(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(org_id, setting_key)
);

-- Enable RLS
ALTER TABLE public.account_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Finance can manage account settings"
  ON public.account_settings FOR ALL
  USING ((org_id = get_user_org_id()) AND (has_role('finance'::app_role) OR has_role('admin'::app_role)));

CREATE POLICY "Users can view account settings in their org"
  ON public.account_settings FOR SELECT
  USING (org_id = get_user_org_id());

-- Create trigger for updated_at
CREATE TRIGGER update_account_settings_updated_at
  BEFORE UPDATE ON public.account_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed standard Indonesian Chart of Accounts for existing organizations
INSERT INTO public.gl_accounts (org_id, code, name, type)
SELECT o.id, seed.code, seed.name, seed.type::gl_type
FROM public.orgs o
CROSS JOIN (
  VALUES
    ('1-10001', 'Kas', 'asset'),
    ('1-10002', 'Bank', 'asset'),
    ('1-10003', 'Piutang Usaha', 'asset'),
    ('1-10004', 'Persediaan Barang', 'asset'),
    ('2-20001', 'Hutang Usaha', 'liability'),
    ('2-20002', 'PPN Keluaran', 'liability'),
    ('3-30001', 'Modal Disetor', 'equity'),
    ('4-40001', 'Pendapatan Penjualan', 'revenue'),
    ('5-50001', 'Harga Pokok Penjualan', 'expense'),
    ('5-50002', 'Beban Operasional', 'expense')
) AS seed(code, name, type)
WHERE NOT EXISTS (
  SELECT 1 FROM public.gl_accounts ga WHERE ga.org_id = o.id AND ga.code = seed.code
);

-- ===== 20251226071559_2f7562e6-14ae-4a30-892b-6da50c5cf0df.sql =====

-- Create expense_types table (Master Beban)
CREATE TABLE public.expense_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  gl_account_id UUID REFERENCES public.gl_accounts(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery_expenses table (Beban per Surat Jalan)
CREATE TABLE public.delivery_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id UUID NOT NULL REFERENCES public.orgs(id),
  delivery_order_id UUID NOT NULL REFERENCES public.delivery_orders(id) ON DELETE CASCADE,
  expense_type_id UUID NOT NULL REFERENCES public.expense_types(id),
  amount NUMERIC NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_expenses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for expense_types
CREATE POLICY "Users can view expense types in their org"
ON public.expense_types FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "Finance can manage expense types"
ON public.expense_types FOR ALL
USING (org_id = get_user_org_id() AND (has_role('finance') OR has_role('admin')));

-- RLS Policies for delivery_expenses
CREATE POLICY "Users can view delivery expenses in their org"
ON public.delivery_expenses FOR SELECT
USING (org_id = get_user_org_id());

CREATE POLICY "Procurement can manage delivery expenses"
ON public.delivery_expenses FOR ALL
USING (org_id = get_user_org_id() AND (has_role('procurement') OR has_role('warehouse') OR has_role('admin')));

-- Create indexes for performance
CREATE INDEX idx_expense_types_org_id ON public.expense_types(org_id);
CREATE INDEX idx_expense_types_code ON public.expense_types(code);
CREATE INDEX idx_delivery_expenses_org_id ON public.delivery_expenses(org_id);
CREATE INDEX idx_delivery_expenses_delivery_order_id ON public.delivery_expenses(delivery_order_id);

-- ===== 20251226090735_3b86aae3-f0c4-4b38-9109-fc7272da69b7.sql =====

-- Insert default expense types
INSERT INTO expense_types (org_id, code, name, is_active) VALUES 
  ((SELECT id FROM public.orgs ORDER BY created_at ASC LIMIT 1), 'ONGKIR', 'Ongkos Kirim', true),
  ((SELECT id FROM public.orgs ORDER BY created_at ASC LIMIT 1), 'HANDLING', 'Biaya Handling', true),
  ((SELECT id FROM public.orgs ORDER BY created_at ASC LIMIT 1), 'ASURANSI', 'Asuransi Pengiriman', true),
  ((SELECT id FROM public.orgs ORDER BY created_at ASC LIMIT 1), 'BONGKAR', 'Biaya Bongkar Muat', true),
  ((SELECT id FROM public.orgs ORDER BY created_at ASC LIMIT 1), 'PARKIR', 'Biaya Parkir', true)
ON CONFLICT DO NOTHING;

-- ===== 20251226100545_b2a2c30e-d1c8-4399-85a5-e40be0aca06d.sql =====

-- Add unique constraint for account_settings upsert
ALTER TABLE account_settings 
ADD CONSTRAINT account_settings_org_id_setting_key_unique 
UNIQUE (org_id, setting_key);

-- ===== 20251226104301_d8057b8e-eb71-49ab-af53-8f34ec682a05.sql =====

-- Add SHIP_PO to the trx_type enum if it doesn't exist
ALTER TYPE trx_type ADD VALUE IF NOT EXISTS 'SHIP_PO';

-- Update existing SHIP_SO transactions from delivery orders to a valid type (ADJ-)
-- Note: We'll update these to ADJ- since SHIP_PO won't be available until next transaction
UPDATE inventory_transactions 
SET trx_type = 'ADJ-' 
WHERE trx_type = 'SHIP_SO' 
AND ref_table = 'delivery_orders';

-- ===== 20251226104327_4ba2bdaa-8926-4265-a47f-ec1fce734ccd.sql =====

-- Update existing ADJ- transactions from delivery orders to SHIP_PO
UPDATE inventory_transactions 
SET trx_type = 'SHIP_PO' 
WHERE trx_type = 'ADJ-' 
AND ref_table = 'delivery_orders';

-- ===== 20251226105026_23fb4431-11ed-4511-80fb-5704804cab69.sql =====

-- Generate journal entries for existing ADJ+ inventory transactions
-- This will create proper double-entry bookkeeping entries:
-- DR: Persediaan Barang (1-10004) - inventory_account
-- CR: Modal Disetor (3-30001) - as equity balance for historical adjustments

DO $$
DECLARE
  trx RECORD;
  new_entry_id UUID;
  inventory_account_id UUID := '0a5c0e82-1121-4a60-b73a-ae4fd58da919';
  equity_account_id UUID := '339c5d7b-662d-4abc-9c72-7997c3d6e678';
  trx_amount NUMERIC;
  org_id_val UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Loop through all ADJ+ transactions that don't have corresponding journal entries
  FOR trx IN 
    SELECT it.id, it.qty, it.unit_cost, it.created_at, it.item_id,
           i.name as item_name
    FROM inventory_transactions it
    LEFT JOIN items i ON i.id = it.item_id
    WHERE it.trx_type = 'ADJ+'
    AND it.org_id = org_id_val
    ORDER BY it.created_at
  LOOP
    -- Calculate transaction amount
    trx_amount := trx.qty * trx.unit_cost;
    
    -- Create journal entry
    INSERT INTO journal_entries (org_id, posted_at, memo)
    VALUES (
      org_id_val,
      trx.created_at,
      'Stock Adjustment (ADJ+) - ' || COALESCE(trx.item_name, 'Item') || ' - Historical Balance'
    )
    RETURNING id INTO new_entry_id;
    
    -- Create journal lines
    -- Debit: Persediaan Barang (Inventory increases)
    INSERT INTO journal_lines (org_id, entry_id, gl_account_id, dr, cr)
    VALUES (org_id_val, new_entry_id, inventory_account_id, trx_amount, 0);
    
    -- Credit: Modal Disetor (Equity - balancing entry for historical data)
    INSERT INTO journal_lines (org_id, entry_id, gl_account_id, dr, cr)
    VALUES (org_id_val, new_entry_id, equity_account_id, 0, trx_amount);
    
    RAISE NOTICE 'Created journal entry for ADJ+ transaction: %, amount: %', trx.id, trx_amount;
  END LOOP;
  
  RAISE NOTICE 'Completed generating journal entries for ADJ+ transactions';
END $$;

-- ===== 20251226105925_37a27ccd-53fc-43b4-939e-17886be090d3.sql =====


-- Fix unbalanced journal entry for INV-20251226-002
-- The journal has DR: 565,000 (Piutang Usaha) but only CR: 540,000 (Pendapatan)
-- Missing CR: 25,000 should go to PPN Keluaran (Tax Liability)

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM journal_entries WHERE id = '8d0e6ae2-8111-4736-8d4e-21f538d16f4a') THEN
    INSERT INTO journal_lines (org_id, entry_id, gl_account_id, dr, cr)
    VALUES (
      '00000000-0000-0000-0000-000000000001',
      '8d0e6ae2-8111-4736-8d4e-21f538d16f4a',
      '32455fa1-7870-42ab-b077-8df257b11884',
      0,
      25000
    );
  END IF;
END $$;
