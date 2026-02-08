import { useRef, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Loader2, Pencil, Trash2, Download, Upload } from "lucide-react";
import { useItems, useInventoryOnHand, useDeleteItem, useImportItemsCsv } from "@/hooks/useItems";
import { useToast } from "@/hooks/use-toast";
import { ItemForm } from "@/components/ItemForm";
import { useAuth } from "@/hooks/useAuth";
import { canImportExportParts, canManageParts } from "@/lib/rbac";
import { itemsApi } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ItemsConnected() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { items, isLoading, error } = useItems();
  const { data: inventory } = useInventoryOnHand();
  const importItemsCsv = useImportItemsCsv();
  const { toast } = useToast();
  const deleteItem = useDeleteItem();
  const manageParts = canManageParts(user?.role);
  const importExport = canImportExportParts(user?.role);

  if (error) {
    toast({
      title: "Error loading items",
      description: error.message,
      variant: "destructive",
    });
  }

  const filteredItems = items?.filter(item => 
    item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getItemQuantity = (itemId: string) => {
    if (!inventory) return 0;
    const itemInventory = inventory.filter(inv => inv.item_id === itemId);
    return itemInventory.reduce((sum, inv) => sum + (Number(inv.qty_onhand) || 0), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleCloseForm = (open: boolean) => {
    setIsFormOpen(open);
    if (!open) {
      setEditingItem(null);
    }
  };

  const handleDeleteClick = (item: any) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (itemToDelete) {
      await deleteItem.mutateAsync(itemToDelete.id);
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    }
  };

  const handleExportCsv = async () => {
    try {
      const blob = await itemsApi.exportCsv();
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `parts-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Export failed",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  const handleImportCsv = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await importItemsCsv.mutateAsync(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parts</h1>
          <p className="text-muted-foreground">Parts catalog with stock thresholds</p>
        </div>
        <div className="flex items-center gap-2">
          {importExport && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleImportCsv}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importItemsCsv.isPending}
              >
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </Button>
              <Button variant="outline" onClick={handleExportCsv}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </>
          )}
          {manageParts && (
            <Button
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Part
            </Button>
          )}
        </div>
      </div>

      <ItemForm open={isFormOpen} onOpenChange={handleCloseForm} item={editingItem} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Part Master</CardTitle>
              <CardDescription>Manage parts and reorder thresholds</CardDescription>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                placeholder="Search parts..." 
                className="pl-8 w-[300px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No parts found.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Part</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Qty On Hand</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead>Base Cost</TableHead>
                  <TableHead>Min Stock</TableHead>
                  <TableHead>Reorder Point</TableHead>
                  {manageParts && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
              {filteredItems.map((item) => {
                  const qty = getItemQuantity(item.id);
                  const baseCost = Number(item.base_cost) || 0;
                  const minStock = Number(item.min_stock || 0);
                  const reorderPoint = Number(item.reorder_point || 0);
                  const threshold = Math.max(minStock, reorderPoint);
                  return (
                    <TableRow key={item.sku} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{item.sku}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>
                        {item.is_stock ? (
                          <Badge variant="secondary" className="bg-primary/10 text-primary">
                            <Package className="mr-1 h-3 w-3" />
                            Stock Item
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-accent/10 text-accent">
                            Service
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.is_stock ? (
                          <span className={qty <= threshold && threshold > 0 ? "text-destructive font-medium" : ""}>
                            {qty}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">{item.uom}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatCurrency(baseCost)}
                      </TableCell>
                      <TableCell>{minStock}</TableCell>
                      <TableCell>{reorderPoint}</TableCell>
                      {manageParts && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteClick(item)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
