import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Search, Loader2, FileText, Filter } from "lucide-react";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { PurchaseOrderForm } from "@/components/PurchaseOrderForm";
import { StatusBadge } from "@/components/StatusBadge";
import { BulkActionsBar } from "@/components/BulkActionsBar";
import { useBulkOperations } from "@/hooks/useBulkOperations";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { purchaseOrdersApi } from "@/lib/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PO_STATUSES = [
  { value: "all", label: "Semua Status" },
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Disetujui" },
  { value: "sent", label: "Terkirim" },
  { value: "partial_received", label: "Sebagian Diterima" },
  { value: "received", label: "Diterima" },
  { value: "closed", label: "Selesai" },
];

const RECEIVE_STATUSES = [
  { value: "all", label: "Semua Status" },
  { value: "approved", label: "Disetujui" },
  { value: "pending", label: "Menunggu" },
  { value: "partial_received", label: "Sebagian Diterima" },
  { value: "received", label: "Diterima" },
];

export default function PurchaseOrders() {
  const [searchQuery, setSearchQuery] = useState("");
  const location = useLocation();
  const isReceiveMode = location.pathname.startsWith("/receive-stock");
  const [statusFilter, setStatusFilter] = useState(isReceiveMode ? "approved" : "all");
  const [showPOForm, setShowPOForm] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { purchaseOrders, isLoading } = usePurchaseOrders();
  const {
    selectedItems,
    toggleItem,
    toggleAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useBulkOperations();

  useEffect(() => {
    setStatusFilter(isReceiveMode ? "approved" : "all");
    clearSelection();
  }, [isReceiveMode]);

  const statusOptions = useMemo(
    () => (isReceiveMode ? RECEIVE_STATUSES : PO_STATUSES),
    [isReceiveMode],
  );

  const filteredOrders = purchaseOrders?.filter(order => {
    const matchesSearch = 
      order.supplier?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.po_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  }) || [];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleBulkDelete = async () => {
    try {
      const selectedIds = Array.from(selectedItems);
      await Promise.all(selectedIds.map((id) => purchaseOrdersApi.delete(id)));

      toast({
        title: "Berhasil",
        description: `${selectedItems.size} Purchase Order berhasil dihapus`,
      });

      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    try {
      const selectedIds = Array.from(selectedItems);
      await Promise.all(
        selectedIds.map((id) => purchaseOrdersApi.updateStatus(id, newStatus))
      );

      toast({
        title: "Berhasil",
        description: `${selectedItems.size} PO diupdate ke status ${newStatus}`,
      });

      clearSelection();
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // Calculate total for each PO
  const getOrderTotal = (order: any) => {
    if (!order.po_lines) return 0;
    return order.po_lines.reduce((sum: number, line: any) => sum + (line.qty * line.unit_cost), 0);
  };

  return (
    <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{isReceiveMode ? "Receive Stock" : "Purchase Orders"}</h1>
            <p className="text-muted-foreground">
              {isReceiveMode
                ? "Pilih PO lalu buka detail untuk mencatat barang masuk"
                : "Kelola order pembelian dan pengadaan"}
            </p>
          </div>
          {isReceiveMode ? (
            <Button variant="outline" onClick={() => navigate("/purchase-orders")}>
              Lihat Semua PO
            </Button>
          ) : (
            <Button onClick={() => setShowPOForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Buat PO Baru
            </Button>
          )}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{isReceiveMode ? "Daftar PO Untuk Penerimaan" : "Daftar Purchase Order"}</CardTitle>
                <CardDescription>
                  {isReceiveMode ? "Filter status lalu pilih PO untuk proses penerimaan" : "Lihat dan kelola purchase order"}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Filter Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder={isReceiveMode ? "Cari PO untuk penerimaan..." : "Cari PO..."} 
                    className="pl-8 w-[300px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Belum ada purchase order. Buat PO pertama Anda.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected(filteredOrders)}
                        onCheckedChange={() => toggleAll(filteredOrders)}
                      />
                    </TableHead>
                    <TableHead>No. PO</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>ETA</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id} className="hover:bg-muted/50">
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected(order.id)}
                          onCheckedChange={() => toggleItem(order.id)}
                        />
                      </TableCell>
                      <TableCell 
                        className="font-mono text-sm cursor-pointer font-medium text-primary"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        {order.po_number || `#${order.id.slice(0, 8)}`}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        <div>
                          <p className="font-medium">{order.supplier?.name}</p>
                          {order.supplier?.phone && (
                            <p className="text-sm text-muted-foreground">{order.supplier.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        {formatDate(order.created_at)}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        {order.eta_date ? formatDate(order.eta_date) : '-'}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer font-medium"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        {formatCurrency(getOrderTotal(order))}
                      </TableCell>
                      <TableCell 
                        className="cursor-pointer"
                        onClick={() => navigate(`/purchase-orders/${order.id}`)}
                      >
                        <StatusBadge status={order.status || 'draft'} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <PurchaseOrderForm open={showPOForm} onOpenChange={setShowPOForm} />
        
        {!isReceiveMode && (
          <BulkActionsBar
            selectedCount={selectedItems.size}
            onClear={clearSelection}
            onDelete={handleBulkDelete}
          >
            <Select onValueChange={handleBulkStatusUpdate}>
              <SelectTrigger className="w-[180px] bg-background text-foreground">
                <SelectValue placeholder="Update Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="approved">Disetujui</SelectItem>
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="received">Diterima</SelectItem>
                <SelectItem value="closed">Selesai</SelectItem>
              </SelectContent>
            </Select>
          </BulkActionsBar>
        )}
    </div>
  );
}
