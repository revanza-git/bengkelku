import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { useCreateCashflowEntry, useCashflowEntry, useUpdateCashflowEntry } from "@/hooks/useCashflowEntries";

interface CashflowEntryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entryId?: string | null;
}

export function CashflowEntryForm({ open, onOpenChange, entryId }: CashflowEntryFormProps) {
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [plannedDate, setPlannedDate] = useState("");
  const [type, setType] = useState<'cash_in' | 'cash_out'>('cash_out');
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("transfer");
  const [status, setStatus] = useState<'planned' | 'paid'>('planned');
  const [notes, setNotes] = useState("");
  
  const { data: existingEntry } = useCashflowEntry(entryId || undefined);
  const createEntry = useCreateCashflowEntry();
  const updateEntry = useUpdateCashflowEntry();
  
  const isEditing = !!entryId;

  // Populate form when editing existing entry
  useEffect(() => {
    if (existingEntry) {
      setEntryDate(existingEntry.entry_date || new Date().toISOString().split('T')[0]);
      setPlannedDate(existingEntry.planned_date || "");
      setType(existingEntry.type as 'cash_in' | 'cash_out');
      setCategory(existingEntry.category || "");
      setDescription(existingEntry.description || "");
      setAmount(String(existingEntry.amount));
      setPaymentMethod(existingEntry.payment_method || "transfer");
      setStatus(existingEntry.status as 'planned' | 'paid');
      setNotes(existingEntry.notes || "");
    } else if (!entryId) {
      resetForm();
    }
  }, [existingEntry, entryId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      entry_date: entryDate,
      planned_date: plannedDate || undefined,
      type,
      category: category || undefined,
      description: description || undefined,
      amount: Number(amount),
      payment_method: paymentMethod || undefined,
      status,
      notes: notes || undefined,
    };
    
    if (isEditing && entryId) {
      await updateEntry.mutateAsync({ id: entryId, ...data });
    } else {
      await createEntry.mutateAsync(data);
    }
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setEntryDate(new Date().toISOString().split('T')[0]);
    setPlannedDate("");
    setType('cash_out');
    setCategory("");
    setDescription("");
    setAmount("");
    setPaymentMethod("transfer");
    setStatus('planned');
    setNotes("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Entry Cashflow" : "Tambah Entry Cashflow"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Tipe</Label>
              <Select value={type} onValueChange={(v) => setType(v as 'cash_in' | 'cash_out')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_in">Cash In</SelectItem>
                  <SelectItem value="cash_out">Cash Out</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as 'planned' | 'paid')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Rencana</SelectItem>
                  <SelectItem value="paid">Dibayar</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Tanggal Entry</Label><Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} required /></div>
          <div><Label>Tanggal Rencana</Label><Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} /></div>
          <div><Label>Kategori</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="invoice_payment, operational, etc" /></div>
          <div><Label>Deskripsi</Label><Input value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <div><Label>Jumlah (Rp)</Label><Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} required /></div>
          <div><Label>Metode Pembayaran</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="transfer">Transfer</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="giro">Giro</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Catatan</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={createEntry.isPending || updateEntry.isPending}>
              {isEditing ? "Update" : "Simpan"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
