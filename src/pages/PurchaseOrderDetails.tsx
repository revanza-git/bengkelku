import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, ArrowLeft, Loader2, Package, Trash2, FileText, CheckCircle, Truck, RefreshCw, Wallet } from "lucide-react";
import { usePurchaseOrderDetails, usePurchaseOrderLines } from "@/hooks/usePurchaseOrders";
import { useDeliveryOrdersByPO } from "@/hooks/useDeliveryOrders";
import { useInvoiceByPO } from "@/hooks/useInvoices";
import { useDeliveryExpensesByPO } from "@/hooks/useDeliveryExpenses";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { invoicesApi, purchaseOrdersApi } from "@/lib/api";
import { StatusBadge } from "@/components/StatusBadge";
import { GoodsReceiptForm } from "@/components/GoodsReceiptForm";
import { Badge } from "@/components/ui/badge";
import { useAvailableStock, getAvailableQty } from "@/hooks/useAvailableStock";
import { useWarehouses } from "@/hooks/useWarehouses";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function PurchaseOrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: po, isLoading: isLoadingPO } = usePurchaseOrderDetails(id);
  const { data: lines, isLoading: isLoadingLines } = usePurchaseOrderLines(id);
  const { data: deliveryOrders } = useDeliveryOrdersByPO(id);
  const { data: deliveryExpenses } = useDeliveryExpensesByPO(id);
  const { data: existingInvoice } = useInvoiceByPO(id);
  const { data: availableStock } = useAvailableStock();
  const { warehouses } = useWarehouses();
  const [showGRNForm, setShowGRNForm] = useState(false);
  const [isGeneratingInvoice, setIsGeneratingInvoice] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const financeEnabled = false;
  
  const [isReserving, setIsReserving] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMMM yyyy", { locale: idLocale });
  };

  const formatDateTime = (date: string | null) => {
    if (!date) return "-";
    return format(new Date(date), "dd MMM yyyy, HH:mm", { locale: idLocale });
  };

  const calculateTotal = () => {
    if (!lines) return 0;
    return lines.reduce((sum, line) => sum + (Number(line.qty) * Number(line.unit_cost)), 0);
  };

  // handleSubmitPO removed - Draft now goes directly to Approved/Pending via handleApprovePO

  const handleApprovePO = async () => {
    if (!po || !lines || !selectedWarehouse) {
      toast({
        title: "Error",
        description: "Pilih gudang terlebih dahulu untuk cek stock",
        variant: "destructive",
      });
      return;
    }

    setIsApproving(true);
    setIsReserving(true);
    try {
      const stockStatus = getTotalStockStatus();
      if (!stockStatus.sufficient) {
        toast({
          title: "Stock Tidak Cukup",
          description: stockStatus.issues.map(issue => `${issue.item} (${issue.available}/${issue.needed})`).join(", "),
          variant: "destructive",
        });
        return;
      }

      await purchaseOrdersApi.updateStatus(po.id, "approved");
      await purchaseOrdersApi.reserve(po.id);

      toast({
        title: "Berhasil",
        description: "PO diapprove dan stock telah direserve",
      });

      queryClient.invalidateQueries({ queryKey: ["purchase-order", id] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["available-stock"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
      setIsReserving(false);
    }
  };

  // Get total stock info for all lines
  const getLineStockInfo = (itemId: string) => {
    if (!selectedWarehouse) return null;
    return getAvailableQty(availableStock, itemId, selectedWarehouse);
  };

  const getTotalStockStatus = () => {
    if (!lines || !selectedWarehouse) return { sufficient: true, issues: [] };
    
    const issues: { item: string; needed: number; available: number }[] = [];
    
    for (const line of lines) {
      const stock = getLineStockInfo(line.item_id);
      if (stock && Number(line.qty) > stock.available) {
        issues.push({
          item: line.item?.name || 'Unknown',
          needed: Number(line.qty),
          available: stock.available,
        });
      }
    }
    
    return { sufficient: issues.length === 0, issues };
  };

  // Check if delivery orders exist and are confirmed (with actual_delivery_date)
  const getDeliveryStatus = () => {
    if (!deliveryOrders || deliveryOrders.length === 0) {
      return { 
        hasDeliveryOrders: false, 
        allConfirmed: false,
        allDelivered: false, 
        confirmedCount: 0,
        deliveredCount: 0, 
        totalCount: 0 
      };
    }
    
    // Surat Jalan dianggap siap untuk invoice jika sudah confirmed ATAU delivered
    const confirmedCount = deliveryOrders.filter(d => 
      d.status === 'confirmed' || d.status === 'delivered'
    ).length;
    const allConfirmed = deliveryOrders.every(d => 
      d.status === 'confirmed' || d.status === 'delivered'
    );
    const deliveredCount = deliveryOrders.filter(d => d.status === 'delivered').length;
    const allDelivered = deliveryOrders.every(d => d.status === 'delivered');
    
    return {
      hasDeliveryOrders: true,
      allConfirmed,
      allDelivered,
      confirmedCount,
      deliveredCount,
      totalCount: deliveryOrders.length,
    };
  };

  const deliveryStatus = getDeliveryStatus();
  // Invoice bisa dibuat jika semua Surat Jalan sudah terkonfirmasi (tidak harus delivered)
  const canCreateInvoice = financeEnabled && deliveryStatus.hasDeliveryOrders && deliveryStatus.allConfirmed;

  const handleDelete = async () => {
    if (!po) return;

    try {
      await purchaseOrdersApi.delete(po.id);

      toast({
        title: "Berhasil",
        description: "Purchase order berhasil dihapus",
      });

      navigate("/purchase-orders");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleGenerateInvoice = async () => {
    if (!po) return;

    setIsGeneratingInvoice(true);
    try {
      const invoice = await invoicesApi.generateFromPO(po.id);
      const invoiceId = invoice?.id || invoice?.invoice_id;

      toast({
        title: "Berhasil",
        description: `Invoice ${invoice?.invoice_number || ''} telah dibuat`,
      });

      if (invoiceId) {
        navigate(`/invoices/${invoiceId}`);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGeneratingInvoice(false);
    }
  };

  if (isLoadingPO || isLoadingLines) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase order not found</p>
        <Button onClick={() => navigate("/purchase-orders")} className="mt-4">
          Back to Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => navigate("/purchase-orders")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">
                {(po as any).po_number || `PO #${po.id.slice(0, 8)}`}
              </h1>
              <p className="text-muted-foreground">Detail Purchase Order</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={po.status} />
            
            {/* Draft: Setujui PO button (langsung ke Approved/Pending) */}
            {po.status === "draft" && (
              <>
                <Button 
                  onClick={handleApprovePO} 
                  disabled={isApproving || isReserving || !selectedWarehouse}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isApproving || isReserving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle className="mr-2 h-4 w-4" />
                  )}
                  {isReserving ? "Reserving Stock..." : "Setujui PO"}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Hapus
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus Purchase Order?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ini akan menghapus PO dan semua line items secara permanen. Tindakan ini tidak dapat dibatalkan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete}>
                        Hapus
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {/* Pending: Retry Reserve button */}
            {po.status === "pending" && (
              <Button 
                onClick={handleApprovePO} 
                disabled={isApproving || isReserving || !selectedWarehouse}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isApproving || isReserving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                {isReserving ? "Mencoba Reserve..." : "Retry Reserve Stock"}
              </Button>
            )}

            {/* Approved: Create Delivery Order & Invoice buttons */}
            {po.status === "approved" && (
              <>
                <Button 
                  onClick={() => navigate(`/delivery-orders/new?po=${po.id}`)}
                  variant="outline"
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Create Issue / Consumption
                </Button>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span>Create and process issue requests to consume parts.</span>
                </div>
              </>
            )}

            {/* Received/Partial: issue guidance */}
            {(po.status === "received" || po.status === "partial_received") && (
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Finance features are hidden in MVP mode.</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Informasi Supplier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="text-sm text-muted-foreground">Nama</p>
                <p className="font-medium">{po.supplier?.name}</p>
              </div>
              {po.supplier?.email && (
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{po.supplier.email}</p>
                </div>
              )}
              {po.supplier?.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Telepon</p>
                  <p className="font-medium">{po.supplier.phone}</p>
                </div>
              )}
              {po.supplier?.address && (
                <div>
                  <p className="text-sm text-muted-foreground">Alamat</p>
                  <p className="font-medium">{po.supplier.address}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Informasi Order</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Tanggal Dibuat</p>
                  <p className="font-medium">{formatDate(po.created_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dibuat Oleh</p>
                  <p className="font-medium">{po.created_by_user?.full_name || '-'}</p>
                </div>
                {po.eta_date && (
                  <div>
                    <p className="text-sm text-muted-foreground">Estimasi Pengiriman</p>
                    <p className="font-medium">{formatDate(po.eta_date)}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">Mata Uang</p>
                  <p className="font-medium">{(po as any).currency || 'IDR'}</p>
                </div>
              </div>

              {/* Approval Info */}
              {(po as any).approved_by && (
                <div className="pt-3 border-t">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Approved</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Diapprove Oleh</p>
                      <p className="font-medium">{(po as any).approved_by_user?.full_name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tanggal Approval</p>
                      <p className="font-medium">{formatDateTime((po as any).approved_at)}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {(po as any).notes && (
                <div className="pt-3 border-t">
                  <p className="text-sm text-muted-foreground">Catatan</p>
                  <p className="font-medium">{(po as any).notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stock Check Section - Show for draft status (before approval) */}
        {po.status === "draft" && (
          <Card className="border-primary/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Pilih Gudang untuk Persetujuan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium">Pilih Gudang untuk Cek Stock</label>
                  <select
                    className="w-full mt-1 p-2 border rounded-md bg-background"
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                  >
                    <option value="">-- Pilih Gudang --</option>
                    {warehouses?.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.code} - {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!selectedWarehouse && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Pilih gudang terlebih dahulu untuk menyetujui PO
                </p>
              )}

              {selectedWarehouse && (
                <div className="space-y-2">
                  {(() => {
                    const stockStatus = getTotalStockStatus();
                    return (
                      <>
                        {stockStatus.sufficient ? (
                          <Badge className="bg-green-600">Stock Cukup untuk Semua Item</Badge>
                        ) : (
                          <div className="space-y-1">
                            <Badge variant="destructive">Stock Tidak Cukup</Badge>
                            <ul className="text-sm text-destructive ml-4 list-disc">
                              {stockStatus.issues.map((issue, idx) => (
                                <li key={idx}>
                                  {issue.item}: butuh {issue.needed}, tersedia {issue.available}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Item Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Harga Satuan</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  {selectedWarehouse && <TableHead className="text-right">Stock Tersedia</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines?.map((line) => {
                  const stockInfo = getLineStockInfo(line.item_id);
                  const isInsufficient = stockInfo && Number(line.qty) > stockInfo.available;
                  
                  return (
                    <TableRow key={line.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{line.item?.name}</p>
                          <p className="text-sm text-muted-foreground">{line.item?.uom}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{line.item?.sku}</TableCell>
                      <TableCell className="text-right">{Number(line.qty)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(Number(line.unit_cost))}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(line.qty) * Number(line.unit_cost))}
                      </TableCell>
                      {selectedWarehouse && (
                        <TableCell className="text-right">
                          <Badge variant={isInsufficient ? "destructive" : "secondary"}>
                            {stockInfo?.available ?? 0}
                          </Badge>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Delivery Expenses Section */}
        {deliveryExpenses && deliveryExpenses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Beban Pengiriman
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Surat Jalan</TableHead>
                    <TableHead>Jenis Beban</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveryExpenses.map((expense: any) => (
                    <TableRow key={expense.id}>
                      <TableCell>
                        <Badge variant="outline">{expense.delivery_order?.delivery_number}</Badge>
                      </TableCell>
                      <TableCell>{expense.expense_type?.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(Number(expense.amount))}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex justify-end pt-4 border-t mt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Beban</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(deliveryExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-6 space-y-2">
            {/* Subtotal Items */}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal Item</span>
              <span>{formatCurrency(calculateTotal())}</span>
            </div>
            
            {/* Total Beban - only show if exists */}
            {deliveryExpenses && deliveryExpenses.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Beban Pengiriman</span>
                <span>{formatCurrency(deliveryExpenses.reduce((sum: number, e: any) => sum + Number(e.amount), 0))}</span>
              </div>
            )}
            
            {/* Grand Total */}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Grand Total</span>
              <span>{formatCurrency(calculateTotal() + (deliveryExpenses?.reduce((sum: number, e: any) => sum + Number(e.amount), 0) || 0))}</span>
            </div>
          </CardContent>
        </Card>

        <GoodsReceiptForm
          open={showGRNForm}
          onOpenChange={setShowGRNForm}
          purchaseOrderId={po.id}
          poLines={lines || []}
          poNumber={po.po_number || undefined}
        />
    </div>
  );
}
