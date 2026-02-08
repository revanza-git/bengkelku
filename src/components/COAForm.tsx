import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { useCreateGLAccount } from "@/hooks/useChartOfAccounts";

interface COAFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId?: string | null;
}

export function COAForm({ open, onOpenChange }: COAFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<'asset' | 'liability' | 'equity' | 'revenue' | 'expense'>('asset');
  const createAccount = useCreateGLAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createAccount.mutateAsync({ code, name, type });
    onOpenChange(false);
    setCode(""); setName(""); setType('asset');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tambah Akun</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Kode</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Tipe</Label>
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="asset">Aset</SelectItem>
                <SelectItem value="liability">Kewajiban</SelectItem>
                <SelectItem value="equity">Ekuitas</SelectItem>
                <SelectItem value="revenue">Pendapatan</SelectItem>
                <SelectItem value="expense">Beban</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={createAccount.isPending}>Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
