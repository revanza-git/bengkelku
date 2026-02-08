import { useState } from "react";
import { Link } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StockAdjustmentForm } from "@/components/StockAdjustmentForm";
import { useItems, useInventoryOnHand } from "@/hooks/useItems";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useInventoryTransactions } from "@/hooks/useInventoryTransactions";
import { useAvailableStock } from "@/hooks/useAvailableStock";
import { useReservations } from "@/hooks/useReservations";
import { useToast } from "@/hooks/use-toast";
import { Plus, AlertTriangle, Package, TrendingDown, Calendar, Lock } from "lucide-react";
import { format, subDays } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Inventory() {
  const [showAdjustmentForm, setShowAdjustmentForm] = useState(false);
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), "yyyy-MM-dd"));
  const [endDate, setEndDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const { toast } = useToast();

  const { data: items, isLoading: itemsLoading, error: itemsError } = useItems();
  const { data: inventory, isLoading: inventoryLoading, error: inventoryError } = useInventoryOnHand();
  const { data: warehouses, isLoading: warehousesLoading } = useWarehouses();
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = useInventoryTransactions(startDate, endDate);
  const { data: availableStock } = useAvailableStock();
  const { data: reservations, isLoading: reservationsLoading } = useReservations();

  if (itemsError || inventoryError) {
    toast({
      title: "Error",
      description: "Failed to load inventory data",
      variant: "destructive",
    });
  }

  const stockItems = items?.filter((item) => item.is_stock) || [];

  // Calculate inventory metrics by warehouse
  const warehouseStockLevels = warehouses?.map((warehouse) => {
    const warehouseInventory = inventory?.filter((inv) => inv.warehouse_id === warehouse.id) || [];
    const totalItems = warehouseInventory.length;
    const totalQty = warehouseInventory.reduce((sum, inv) => sum + Number(inv.qty_onhand || 0), 0);
    
    return {
      ...warehouse,
      totalItems,
      totalQty,
    };
  }) || [];

  // Calculate low stock items with reorder quantities
  const lowStockItems = stockItems.map((item) => {
    const itemInventory = inventory?.filter((inv) => inv.item_id === item.id) || [];
    const totalQty = itemInventory.reduce((sum, inv) => sum + Number(inv.qty_onhand || 0), 0);
    
    // Simple reorder logic: if stock < 10, suggest reorder of 50
    const minStock = 10;
    const reorderQty = 50;
    const isLowStock = totalQty < minStock;
    
    return {
      item,
      totalQty,
      isLowStock,
      reorderQty: isLowStock ? reorderQty : 0,
      stockPercentage: Math.min((totalQty / minStock) * 100, 100),
    };
  }).filter((item) => item.isLowStock);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTrxTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "ADJ+": "Penyesuaian (+)",
      "ADJ-": "Penyesuaian (-)",
      "GRN": "Penerimaan Barang",
      "SHIP_PO": "Pengiriman Barang",
      "TRANSFER": "Transfer",
      // Legacy labels (from old system)
      "SHIP_SO": "Pengiriman",
      "ISSUE_WO": "Pengeluaran Material",
      adjustment_in: "ADJ+",
      adjustment_out: "ADJ-",
      receipt: "Penerimaan Barang",
      issue: "Pengeluaran Material",
      transfer_in: "Transfer Masuk",
      transfer_out: "Transfer Keluar",
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">Monitor stock levels and track inventory movements</p>
        </div>
        <Button onClick={() => setShowAdjustmentForm(!showAdjustmentForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Stock Adjustment
        </Button>
      </div>

      {showAdjustmentForm && (
        <StockAdjustmentForm
          onSuccess={() => {
            setShowAdjustmentForm(false);
            refetchTransactions();
          }}
          onCancel={() => setShowAdjustmentForm(false)}
        />
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="reserved" className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Stock Reserved
            {reservations && reservations.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                {reservations.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="transactions" className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4" />
            Transaksi
          </TabsTrigger>
        </TabsList>

        {/* Tab Content: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Warehouse Stock Levels */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {warehousesLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              warehouseStockLevels.map((warehouse) => (
                <Card key={warehouse.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{warehouse.name}</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardDescription>{warehouse.code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Items</span>
                        <span className="text-2xl font-bold">{warehouse.totalItems}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Quantity</span>
                        <span className="text-lg font-semibold">{warehouse.totalQty.toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Low Stock Alerts */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <CardTitle>Low Stock Alerts</CardTitle>
              </div>
              <CardDescription>Items below minimum stock level with suggested reorder quantities</CardDescription>
            </CardHeader>
            <CardContent>
              {itemsLoading || inventoryLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                  <Skeleton className="h-16" />
                </div>
              ) : lowStockItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">All items are adequately stocked</p>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {lowStockItems.map(({ item, totalQty, reorderQty, stockPercentage }) => (
                      <div key={item.id} className="flex items-center gap-4 rounded-lg border p-4">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-muted-foreground">{item.sku}</p>
                            </div>
                            <Badge variant={totalQty === 0 ? "destructive" : "outline"} className="ml-2">
                              {totalQty.toFixed(2)} {item.uom}
                            </Badge>
                          </div>
                          <Progress value={stockPercentage} className="h-2 mb-2" />
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              Suggested reorder: <span className="font-medium text-foreground">{reorderQty} {item.uom}</span>
                            </span>
                            <span className="text-muted-foreground">
                              Est. cost: {formatCurrency(reorderQty * Number(item.base_cost || 0))}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Stock Reserved */}
        <TabsContent value="reserved" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                <CardTitle>Stock Reserved</CardTitle>
              </div>
              <CardDescription>Items currently reserved for Purchase Orders</CardDescription>
            </CardHeader>
            <CardContent>
              {reservationsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : !reservations || reservations.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada stock yang sedang di-reserve</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">Qty Reserved</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reservations.map((reservation) => (
                        <TableRow key={reservation.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{reservation.item_name}</p>
                              <p className="text-sm text-muted-foreground">{reservation.item_sku}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{reservation.warehouse_name}</p>
                              <p className="text-sm text-muted-foreground">{reservation.warehouse_code}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            {reservation.qty.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline">{reservation.doc_type}</Badge>
                              {reservation.po_number ? (
                                <Link 
                                  to={`/purchase-orders/${reservation.doc_id}`}
                                  className="text-sm text-primary hover:underline"
                                >
                                  {reservation.po_number}
                                </Link>
                              ) : (
                                <span className="text-sm text-muted-foreground">-</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(reservation.created_at), "dd MMM yyyy")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Content: Transaksi */}
        <TabsContent value="transactions" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-primary" />
                    <CardTitle>Recent Inventory Movements</CardTitle>
                  </div>
                  <CardDescription>Track all inventory transactions and adjustments</CardDescription>
                </div>
                <div className="flex gap-2 items-center">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-40"
                  />
                  <span className="text-muted-foreground">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : !transactions || transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No transactions found for the selected date range</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Item</TableHead>
                        <TableHead>Warehouse</TableHead>
                        <TableHead className="text-right">On-Hand</TableHead>
                        <TableHead className="text-right">Reserved</TableHead>
                        <TableHead className="text-right">Available</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Unit Cost</TableHead>
                        <TableHead className="text-right">Total Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((trx: any) => {
                        const stock = availableStock?.find(
                          s => s.item_id === trx.item_id && s.warehouse_id === trx.warehouse_id
                        );
                        return (
                          <TableRow key={trx.id}>
                            <TableCell className="text-sm">
                              {format(new Date(trx.created_at), "MMM dd, yyyy HH:mm")}
                            </TableCell>
                            <TableCell>
                              <Badge variant={Number(trx.qty) > 0 ? "default" : "secondary"}>
                                {getTrxTypeLabel(trx.trx_type)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{trx.item?.name}</p>
                                <p className="text-sm text-muted-foreground">{trx.item?.sku}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{trx.warehouse?.name}</p>
                                <p className="text-sm text-muted-foreground">{trx.warehouse?.code}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {stock?.on_hand.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">
                              {stock?.reserved.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className={`text-right font-mono text-sm font-medium ${
                              stock && stock.available < 0 ? "text-destructive" : 
                              stock && stock.available < 10 ? "text-warning" : 
                              ""
                            }`}>
                              {stock?.available.toFixed(2) || "0.00"}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              <span className={Number(trx.qty) > 0 ? "text-success" : "text-destructive"}>
                                {Number(trx.qty) > 0 ? "+" : ""}{Number(trx.qty).toFixed(2)}
                              </span>
                              <span className="text-muted-foreground ml-1">{trx.item?.uom}</span>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(Number(trx.unit_cost))}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(Number(trx.qty) * Number(trx.unit_cost))}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
