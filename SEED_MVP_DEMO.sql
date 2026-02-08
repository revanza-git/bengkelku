-- MVP demo operational data seed (idempotent)
-- Safe to run multiple times.

DO $$
DECLARE
  v_org_id uuid := '00000000-0000-0000-0000-000000000001';
  v_warehouse_id uuid := '00000000-0000-0000-0000-000000000201';
  v_supplier_id uuid := '00000000-0000-0000-0000-000000000701';
  v_created_by uuid;
BEGIN
  SELECT u.id
  INTO v_created_by
  FROM public.users u
  WHERE u.org_id = v_org_id AND u.role = 'admin'
  ORDER BY u.created_at
  LIMIT 1;

  IF v_created_by IS NULL THEN
    SELECT u.id
    INTO v_created_by
    FROM public.users u
    WHERE u.org_id = v_org_id
    ORDER BY u.created_at
    LIMIT 1;
  END IF;

  IF v_created_by IS NULL THEN
    RAISE EXCEPTION 'No users found for org %. Create at least one user first.', v_org_id;
  END IF;

  -- Keep local DB compatible with Prisma model used by API.
  ALTER TABLE public.po_lines
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT NOW();

  INSERT INTO public.purchase_orders (
    id, org_id, supplier_id, status, eta_date, created_by, created_at,
    po_number, planned_delivery_start, currency, notes, customer_id, is_deleted
  )
  VALUES
    (
      '10000000-0000-0000-0000-000000000901', v_org_id, v_supplier_id,
      'approved'::public.po_status,
      NOW() + INTERVAL '3 day',
      v_created_by,
      NOW() - INTERVAL '10 day',
      'PO-MVP-001',
      NOW() - INTERVAL '10 day',
      'IDR',
      'Demo PO - approved and waiting receiving',
      NULL,
      FALSE
    ),
    (
      '10000000-0000-0000-0000-000000000902', v_org_id, v_supplier_id,
      'pending'::public.po_status,
      NOW() + INTERVAL '1 day',
      v_created_by,
      NOW() - INTERVAL '8 day',
      'PO-MVP-002',
      NOW() - INTERVAL '8 day',
      'IDR',
      'Demo PO - partially delivered',
      NULL,
      FALSE
    ),
    (
      '10000000-0000-0000-0000-000000000903', v_org_id, v_supplier_id,
      'closed'::public.po_status,
      NOW() - INTERVAL '1 day',
      v_created_by,
      NOW() - INTERVAL '6 day',
      'PO-MVP-003',
      NOW() - INTERVAL '6 day',
      'IDR',
      'Demo PO - fully delivered',
      NULL,
      FALSE
    )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    eta_date = EXCLUDED.eta_date,
    planned_delivery_start = EXCLUDED.planned_delivery_start,
    actual_delivery_date = EXCLUDED.actual_delivery_date,
    notes = EXCLUDED.notes,
    is_deleted = FALSE,
    deleted_at = NULL;

  INSERT INTO public.po_lines (id, org_id, purchase_order_id, item_id, qty, unit_cost)
  VALUES
    ('10000000-0000-0000-0000-000000000911', v_org_id, '10000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000401', 20, 70000),
    ('10000000-0000-0000-0000-000000000912', v_org_id, '10000000-0000-0000-0000-000000000901', '00000000-0000-0000-0000-000000000402', 12, 39000),
    ('10000000-0000-0000-0000-000000000913', v_org_id, '10000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000403', 6, 210000),
    ('10000000-0000-0000-0000-000000000914', v_org_id, '10000000-0000-0000-0000-000000000902', '00000000-0000-0000-0000-000000000407', 10, 52000),
    ('10000000-0000-0000-0000-000000000915', v_org_id, '10000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000410', 3, 640000),
    ('10000000-0000-0000-0000-000000000916', v_org_id, '10000000-0000-0000-0000-000000000903', '00000000-0000-0000-0000-000000000411', 8, 98000)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.delivery_orders (
    id, org_id, delivery_number, purchase_order_id, customer_id, delivery_date,
    actual_delivery_date, status, notes, created_by, created_at
  )
  VALUES
    (
      '10000000-0000-0000-0000-000000000921', v_org_id, 'ISS-2026-0001',
      '10000000-0000-0000-0000-000000000902', NULL,
      NOW() - INTERVAL '2 day', NOW() - INTERVAL '1 day',
      'delivered'::public.delivery_status,
      'Demo consumption processed',
      v_created_by,
      NOW() - INTERVAL '2 day'
    ),
    (
      '10000000-0000-0000-0000-000000000922', v_org_id, 'ISS-2026-0002',
      '10000000-0000-0000-0000-000000000901', NULL,
      NOW(), NULL,
      'confirmed'::public.delivery_status,
      'Demo issue request pending process',
      v_created_by,
      NOW() - INTERVAL '4 hour'
    )
  ON CONFLICT (id) DO UPDATE SET
    status = EXCLUDED.status,
    actual_delivery_date = EXCLUDED.actual_delivery_date,
    notes = EXCLUDED.notes;

  INSERT INTO public.delivery_order_lines (
    id, org_id, delivery_order_id, po_line_id, item_id, qty_ordered, qty_delivered, warehouse_id, created_at
  )
  VALUES
    (
      '10000000-0000-0000-0000-000000000931', v_org_id,
      '10000000-0000-0000-0000-000000000921',
      '10000000-0000-0000-0000-000000000913',
      '00000000-0000-0000-0000-000000000403',
      4, 4, v_warehouse_id, NOW() - INTERVAL '2 day'
    ),
    (
      '10000000-0000-0000-0000-000000000932', v_org_id,
      '10000000-0000-0000-0000-000000000921',
      '10000000-0000-0000-0000-000000000914',
      '00000000-0000-0000-0000-000000000407',
      6, 6, v_warehouse_id, NOW() - INTERVAL '2 day'
    ),
    (
      '10000000-0000-0000-0000-000000000933', v_org_id,
      '10000000-0000-0000-0000-000000000922',
      '10000000-0000-0000-0000-000000000911',
      '00000000-0000-0000-0000-000000000401',
      5, 0, v_warehouse_id, NOW() - INTERVAL '4 hour'
    )
  ON CONFLICT (id) DO UPDATE SET
    qty_ordered = EXCLUDED.qty_ordered,
    qty_delivered = EXCLUDED.qty_delivered,
    warehouse_id = EXCLUDED.warehouse_id;

  INSERT INTO public.inventory_transactions (
    id, org_id, item_id, warehouse_id, trx_type, ref_table, ref_id, qty, unit_cost, created_at
  )
  VALUES
    ('10000000-0000-0000-0000-000000000941', v_org_id, '00000000-0000-0000-0000-000000000401', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000901', 8, 69000, NOW() - INTERVAL '12 day'),
    ('10000000-0000-0000-0000-000000000942', v_org_id, '00000000-0000-0000-0000-000000000402', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000901', 6, 38000, NOW() - INTERVAL '11 day'),
    ('10000000-0000-0000-0000-000000000943', v_org_id, '00000000-0000-0000-0000-000000000403', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000902', 4, 205000, NOW() - INTERVAL '10 day'),
    ('10000000-0000-0000-0000-000000000944', v_org_id, '00000000-0000-0000-0000-000000000407', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000902', 7, 51000, NOW() - INTERVAL '9 day'),
    ('10000000-0000-0000-0000-000000000945', v_org_id, '00000000-0000-0000-0000-000000000411', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000903', 5, 97000, NOW() - INTERVAL '8 day'),
    ('10000000-0000-0000-0000-000000000946', v_org_id, '00000000-0000-0000-0000-000000000410', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000903', 2, 635000, NOW() - INTERVAL '7 day'),
    ('10000000-0000-0000-0000-000000000947', v_org_id, '00000000-0000-0000-0000-000000000403', v_warehouse_id, 'SHIP_PO', 'delivery_orders', '10000000-0000-0000-0000-000000000921', -2, 205000, NOW() - INTERVAL '6 day'),
    ('10000000-0000-0000-0000-000000000948', v_org_id, '00000000-0000-0000-0000-000000000407', v_warehouse_id, 'SHIP_PO', 'delivery_orders', '10000000-0000-0000-0000-000000000921', -2, 51000, NOW() - INTERVAL '5 day'),
    ('10000000-0000-0000-0000-000000000949', v_org_id, '00000000-0000-0000-0000-000000000401', v_warehouse_id, 'GRN', 'purchase_orders', '10000000-0000-0000-0000-000000000901', 4, 70000, NOW() - INTERVAL '4 day'),
    ('10000000-0000-0000-0000-000000000950', v_org_id, '00000000-0000-0000-0000-000000000402', v_warehouse_id, 'SHIP_PO', 'delivery_orders', '10000000-0000-0000-0000-000000000922', -1, 39000, NOW() - INTERVAL '3 day'),
    ('10000000-0000-0000-0000-000000000951', v_org_id, '00000000-0000-0000-0000-000000000403', v_warehouse_id, 'SHIP_PO', 'delivery_orders', '10000000-0000-0000-0000-000000000921', -2, 205000, NOW() - INTERVAL '2 day'),
    ('10000000-0000-0000-0000-000000000952', v_org_id, '00000000-0000-0000-0000-000000000407', v_warehouse_id, 'SHIP_PO', 'delivery_orders', '10000000-0000-0000-0000-000000000921', -4, 51000, NOW() - INTERVAL '1 day')
  ON CONFLICT (id) DO NOTHING;

  -- Force reorder candidates for demo: thresholds intentionally above on-hand.
  UPDATE public.items
  SET min_stock = CASE sku
    WHEN 'OIL-001' THEN 40
    WHEN 'FILTER-OIL' THEN 25
    WHEN 'BRAKE-PAD' THEN 12
    WHEN 'COOLANT' THEN 22
    WHEN 'BATTERY-12V' THEN 8
    ELSE min_stock
  END
  WHERE org_id = v_org_id
    AND sku IN ('OIL-001', 'FILTER-OIL', 'BRAKE-PAD', 'COOLANT', 'BATTERY-12V');

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'items'
      AND column_name = 'reorder_point'
  ) THEN
    EXECUTE '
      UPDATE public.items
      SET reorder_point = CASE sku
        WHEN ''OIL-001'' THEN 45
        WHEN ''FILTER-OIL'' THEN 28
        WHEN ''BRAKE-PAD'' THEN 14
        WHEN ''COOLANT'' THEN 25
        WHEN ''BATTERY-12V'' THEN 10
        ELSE reorder_point
      END
      WHERE org_id = $1
        AND sku IN (''OIL-001'', ''FILTER-OIL'', ''BRAKE-PAD'', ''COOLANT'', ''BATTERY-12V'')
    ' USING v_org_id;
  END IF;
END $$;

SELECT
  (SELECT COUNT(*) FROM public.purchase_orders WHERE po_number LIKE 'PO-MVP-%') AS mvp_purchase_orders,
  (SELECT COUNT(*) FROM public.delivery_orders WHERE delivery_number LIKE 'ISS-2026-%') AS mvp_issue_orders,
  (SELECT COUNT(*) FROM public.inventory_transactions WHERE id::text LIKE '10000000-0000-0000-0000-00000000094%') AS mvp_movement_rows,
  (
    SELECT COUNT(*)
    FROM (
      SELECT i.id, COALESCE(SUM(it.qty), 0) AS on_hand, COALESCE(i.min_stock, 0) AS min_stock
      FROM public.items i
      LEFT JOIN public.inventory_transactions it ON it.item_id = i.id
      WHERE i.org_id = '00000000-0000-0000-0000-000000000001'::uuid
        AND i.is_stock = true
      GROUP BY i.id, i.min_stock
    ) s
    WHERE s.min_stock > 0
      AND s.on_hand <= s.min_stock
  ) AS reorder_candidates;
