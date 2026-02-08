import { useState } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Loader2, TrendingUp, TrendingDown, DollarSign, Pencil, Trash2 } from "lucide-react";
import { useCashflowEntries, useDeleteCashflowEntry } from "@/hooks/useCashflowEntries";
import { CashflowEntryForm } from "@/components/CashflowEntryForm";
import { format } from "date-fns";
import { id } from "date-fns/locale";
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

export default function Cashflow() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  
  const { data: entries, isLoading } = useCashflowEntries();
  const deleteEntry = useDeleteCashflowEntry();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return format(new Date(date), 'dd-MM-yyyy', { locale: id });
  };

  const filteredEntries = entries?.filter(entry =>
    entry.entry_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    entry.category?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Calculate summary
  const totalCashIn = filteredEntries
    .filter(e => e.type === 'cash_in' && e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0);
  
  const totalCashOut = filteredEntries
    .filter(e => e.type === 'cash_out' && e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const plannedCashIn = filteredEntries
    .filter(e => e.type === 'cash_in' && e.status === 'planned')
    .reduce((sum, e) => sum + Number(e.amount), 0);

  const handleDelete = async () => {
    if (entryToDelete) {
      await deleteEntry.mutateAsync(entryToDelete);
      setEntryToDelete(null);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cashflow Management</h1>
            <p className="text-muted-foreground">Kelola arus kas masuk dan keluar</p>
          </div>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Entry
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash In</CardTitle>
              <TrendingUp className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{formatCurrency(totalCashIn)}</div>
              <p className="text-xs text-muted-foreground">Sudah dibayar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash Out</CardTitle>
              <TrendingDown className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(totalCashOut)}</div>
              <p className="text-xs text-muted-foreground">Sudah dibayar</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Planned Cash In</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">{formatCurrency(plannedCashIn)}</div>
              <p className="text-xs text-muted-foreground">Penerimaan direncanakan</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totalCashIn - totalCashOut >= 0 ? 'text-success' : 'text-destructive'}`}>
                {formatCurrency(totalCashIn - totalCashOut)}
              </div>
              <p className="text-xs text-muted-foreground">Cash In - Cash Out</p>
            </CardContent>
          </Card>
        </div>

        {/* Entries Table */}
        <Card>
          <CardHeader>
            <CardTitle>Daftar Entry Cashflow</CardTitle>
            <CardDescription>Semua transaksi arus kas</CardDescription>
            <div className="flex items-center gap-2 pt-4">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nomor, deskripsi, atau kategori..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-sm"
              />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada entry cashflow
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Entry</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Tipe</TableHead>
                    <TableHead>Kategori</TableHead>
                    <TableHead>Deskripsi</TableHead>
                    <TableHead>Metode</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Jumlah</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-medium">{entry.entry_number}</TableCell>
                      <TableCell>
                        <div>
                          <div>{formatDate(entry.entry_date)}</div>
                          {entry.planned_date && entry.status === 'planned' && (
                            <div className="text-xs text-muted-foreground">
                              Rencana: {formatDate(entry.planned_date)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={entry.type === 'cash_in' ? 'default' : 'secondary'}>
                          {entry.type === 'cash_in' ? 'Cash In' : 'Cash Out'}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.category || '-'}</TableCell>
                      <TableCell>{entry.description || '-'}</TableCell>
                      <TableCell>{entry.payment_method || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={entry.status === 'paid' ? 'default' : 'outline'}>
                          {entry.status === 'paid' ? 'Dibayar' : 'Rencana'}
                        </Badge>
                      </TableCell>
                      <TableCell className={`text-right font-medium ${entry.type === 'cash_in' ? 'text-success' : 'text-destructive'}`}>
                        {entry.type === 'cash_in' ? '+' : '-'}{formatCurrency(Number(entry.amount))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingEntry(entry.id)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEntryToDelete(entry.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <CashflowEntryForm
        open={showForm || !!editingEntry}
        onOpenChange={(open) => {
          if (!open) {
            setShowForm(false);
            setEditingEntry(null);
          }
        }}
        entryId={editingEntry}
      />

      <AlertDialog open={!!entryToDelete} onOpenChange={() => setEntryToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Entry?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Entry akan dihapus secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
