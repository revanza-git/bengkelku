import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, Loader2, Package, ShoppingCart, Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useDeliveryOrders } from "@/hooks/useDeliveryOrders";
import { useItems } from "@/hooks/useItems";
import { useLowStockReport, useStockMovementsReport } from "@/hooks/useReports";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { ResetDataDialog } from "@/components/ResetDataDialog";
import { isAdmin } from "@/lib/rbac";

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  confirmed: "Confirmed",
  delivered: "Delivered",
};

const OPEN_PO_STATUSES = new Set([
  "draft",
  "submitted",
  "approved",
  "reserved",
  "pending",
  "sent",
  "partial_delivery",
  "partial_received",
]);

const dateKey = (value: Date | string) =>
  new Intl.DateTimeFormat("sv-SE").format(new Date(value));

export default function Dashboard() {
  const { data: currentUser } = useCurrentUser();
  const { purchaseOrders, isLoading: loadingPo } = usePurchaseOrders();
  const { deliveryOrders, isLoading: loadingIssues } = useDeliveryOrders();
  const { items, isLoading: loadingItems } = useItems();
  const { data: lowStock = [], isLoading: loadingLowStock } = useLowStockReport();
  const movementRange = (() => {
    const end = new Date();
    const start = new Date(end);
    start.setDate(end.getDate() - 13);
    return {
      date_from: end < start ? dateKey(end) : dateKey(start),
      date_to: dateKey(end),
    };
  })();
  const { data: movementRows = [], isLoading: loadingMovements } = useStockMovementsReport(movementRange);

  const isLoading = loadingPo || loadingIssues || loadingItems || loadingLowStock || loadingMovements;

  const openPoCount = purchaseOrders.filter((po) => OPEN_PO_STATUSES.has(po.status)).length;
  const pendingIssues = deliveryOrders.filter((order) => order.status !== "delivered");
  const stockParts = items.filter((item) => item.is_stock);
  const issueStatusMap = deliveryOrders.reduce<Record<string, number>>((acc, row) => {
    const key = row.status || "draft";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const issueStatusData = Object.entries(issueStatusMap).map(([status, value]) => ({
    name: STATUS_LABELS[status] || status,
    value,
  }));

  const end = new Date();
  const start = new Date(end);
  start.setDate(end.getDate() - 13);
  const trendMap = new Map<string, { dateLabel: string; inbound: number; outbound: number }>();
  for (let i = 0; i < 14; i += 1) {
    const current = new Date(start);
    current.setDate(start.getDate() + i);
    const key = dateKey(current);
    trendMap.set(key, {
      dateLabel: current.toLocaleDateString("id-ID", { day: "2-digit", month: "2-digit" }),
      inbound: 0,
      outbound: 0,
    });
  }
  for (const row of movementRows as any[]) {
    const key = dateKey(row.created_at);
    const point = trendMap.get(key);
    if (!point) continue;
    const qty = Number(row.qty || 0);
    if (qty >= 0) {
      point.inbound += qty;
    } else {
      point.outbound += Math.abs(qty);
    }
  }
  const movementTrendData = Array.from(trendMap.values());

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Never stop work because a part is missing</p>
        </div>
        {isAdmin(currentUser?.role) && <ResetDataDialog />}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Purchase Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPoCount}</div>
            <Link to="/purchase-orders" className="text-xs text-primary hover:underline">
              Open purchase orders
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Issues</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingIssues.length}</div>
            <Link to="/delivery-orders" className="text-xs text-primary hover:underline">
              Review issue requests
            </Link>
          </CardContent>
        </Card>

        <Card className={lowStock.length > 0 ? "border-red-500/40" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Parts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{lowStock.length}</div>
            <Link to="/reports/low-stock" className="text-xs text-primary hover:underline">
              Open low stock report
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Parts</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stockParts.length}</div>
            <Link to="/items" className="text-xs text-primary hover:underline">
              Open parts catalog
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Widget
            </CardTitle>
            <CardDescription>Top parts that need replenishment</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">No low-stock alerts.</p>
            ) : (
              lowStock.slice(0, 5).map((row: any) => (
                <div key={row.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                  <div>
                    <div className="font-medium">{row.name}</div>
                    <div className="text-xs text-muted-foreground">{row.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-destructive">{Number(row.current_stock).toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">
                      Need {Number(row.shortage).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))
            )}
            <Link to="/reports/low-stock" className="inline-block text-sm text-primary hover:underline">
              View full report
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Boxes className="h-5 w-5" />
              Recent Issues / Consumption
            </CardTitle>
            <CardDescription>Latest stock-out transactions from issue orders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deliveryOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issues yet.</p>
            ) : (
              deliveryOrders.slice(0, 5).map((order) => (
                <Link
                  key={order.id}
                  to={`/delivery-orders/${order.id}`}
                  className="flex items-center justify-between rounded border p-2 hover:bg-muted/40"
                >
                  <div>
                    <div className="font-medium">{order.delivery_number}</div>
                    <div className="text-xs text-muted-foreground">
                      PO: {order.purchase_orders?.po_number || "-"}
                    </div>
                  </div>
                  <Badge variant={order.status === "delivered" ? "secondary" : "outline"}>
                    {order.status}
                  </Badge>
                </Link>
              ))
            )}
            <Link to="/delivery-orders" className="inline-block text-sm text-primary hover:underline">
              View all issues
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Issue Status Distribution</CardTitle>
            <CardDescription>Pie chart of issue/consumption order statuses</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {issueStatusData.length === 0 ? (
              <p className="text-sm text-muted-foreground">No issue orders yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={issueStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={95}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {issueStatusData.map((_, idx) => (
                      <Cell key={`issue-status-${idx}`} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>14-Day Stock Movement Trend</CardTitle>
            <CardDescription>Daily inbound vs outbound quantities</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={movementTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inbound" name="Stock In" stroke="hsl(var(--chart-2))" strokeWidth={2} />
                <Line type="monotone" dataKey="outbound" name="Stock Out" stroke="hsl(var(--chart-1))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
