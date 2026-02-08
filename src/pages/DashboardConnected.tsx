import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Package, FileText, DollarSign, Loader2, Truck, ShoppingCart, Wallet } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useDeliveryOrders } from "@/hooks/useDeliveryOrders";
import { useItems, useInventoryOnHand } from "@/hooks/useItems";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";

export default function DashboardConnected() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: purchaseOrders, isLoading: poLoading } = usePurchaseOrders();
  const { data: deliveryOrders } = useDeliveryOrders();
  const { data: items } = useItems();
  const { data: inventory } = useInventoryOnHand();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return format(new Date(date), 'dd MMM yyyy', { locale: idLocale });
  };

  // Recent POs (last 5)
  const recentPOs = purchaseOrders?.slice(0, 5) || [];

  // Pending deliveries
  const pendingDeliveries = deliveryOrders?.filter(d => d.status !== 'delivered').slice(0, 5) || [];

  // Low stock items - tampilkan semua tanpa limit
  const lowStockItems = items
    ?.map(item => {
      const itemInventory = inventory?.filter(inv => inv.item_id === item.id) || [];
      const qty = itemInventory.reduce((sum, inv) => sum + (Number(inv.qty_onhand) || 0), 0);
      return { ...item, qty };
    })
    .filter(item => item.is_stock && (item.qty <= 0 || item.qty < (item.min_stock || 0))) || [];

  // Calculate PO totals
  const pendingPOCount = purchaseOrders?.filter(po => 
    po.status === 'draft' || po.status === 'approved' || po.status === 'sent'
  ).length || 0;

  const getOrderTotal = (po: any) => {
    return po.lines?.reduce((sum: number, line: any) => 
      sum + (Number(line.qty) * Number(line.unit_cost)), 0
    ) || 0;
  };

  if (statsLoading || poLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Ringkasan operasional procurement</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">PO Pending</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingPOCount}</div>
            <p className="text-xs text-muted-foreground">
              Total: {purchaseOrders?.length || 0} PO
            </p>
            <Link to="/purchase-orders" className="text-xs text-primary mt-1 hover:underline">
              Lihat semua →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pengiriman Pending</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingDeliveries.length}</div>
            <p className="text-xs text-muted-foreground">Menunggu konfirmasi</p>
            <Link to="/delivery-orders" className="text-xs text-primary mt-1 hover:underline">
              Lihat semua →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Item Stok Rendah</CardTitle>
            <AlertCircle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats?.lowStockItems || lowStockItems.length}</div>
            <p className="text-xs text-muted-foreground">Perlu reorder</p>
            <Link to="/items" className="text-xs text-primary mt-1 hover:underline">
              Lihat item →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoice Belum Bayar</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.pendingInvoices.amount || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingInvoices.count || 0} invoice
            </p>
            <Link to="/invoices" className="text-xs text-primary mt-1 hover:underline">
              Lihat invoice →
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cashflow Bulan Ini</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${(stats?.netCashflow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats?.netCashflow || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Masuk: {formatCurrency(stats?.monthCashIn || 0)}
            </p>
            <Link to="/cashflow" className="text-xs text-primary mt-1 hover:underline">
              Lihat cashflow →
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Purchase Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Purchase Order Terbaru</CardTitle>
                <CardDescription>PO yang baru dibuat</CardDescription>
              </div>
              <Link to="/purchase-orders">
                <span className="text-sm text-primary hover:underline">Lihat Semua</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Belum ada PO. Buat PO pertama Anda.
              </p>
            ) : (
              <div className="space-y-4">
                {recentPOs.map((po) => (
                  <Link 
                    key={po.id} 
                    to={`/purchase-orders/${po.id}`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                  >
                    <div>
                      <p className="font-medium">{po.po_number || po.id.slice(0, 8)}</p>
                      <p className="text-sm text-muted-foreground">{po.supplier?.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(po.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={po.status} />
                      <p className="text-sm font-medium mt-1">{formatCurrency(getOrderTotal(po))}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Deliveries */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Pengiriman Pending
                </CardTitle>
                <CardDescription>Surat jalan yang belum selesai</CardDescription>
              </div>
              <Link to="/delivery-orders">
                <span className="text-sm text-primary hover:underline">Lihat Semua</span>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {pendingDeliveries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Tidak ada pengiriman pending.
              </p>
            ) : (
              <div className="space-y-4">
                {pendingDeliveries.map((delivery) => (
                  <Link
                    key={delivery.id}
                    to={`/delivery-orders/${delivery.id}`}
                    className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0 hover:bg-muted/50 -mx-2 px-2 py-1 rounded"
                  >
                    <div>
                      <p className="font-medium">{delivery.delivery_number}</p>
                      <p className="text-sm text-muted-foreground">
                        PO: {delivery.purchase_order?.po_number || '-'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(delivery.delivery_date)}
                      </p>
                    </div>
                    <StatusBadge status={delivery.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        {lowStockItems.length > 0 && (
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-warning" />
                    Peringatan Stok Rendah
                  </CardTitle>
                  <CardDescription>Item di bawah batas minimum stok</CardDescription>
                </div>
                <Link to="/items">
                  <span className="text-sm text-primary hover:underline">Lihat Semua Item</span>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
                {lowStockItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-3">
                    <p className="font-medium truncate">{item.name}</p>
                    <p className="text-sm text-muted-foreground">{item.sku}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">Stok:</span>
                      <span className="text-sm font-medium text-warning">{item.qty}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Min:</span>
                      <span className="text-sm">{item.min_stock || 10}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
