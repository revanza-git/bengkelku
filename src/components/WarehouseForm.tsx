import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useWarehouses } from "@/hooks/useWarehouses";

interface WarehouseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warehouseId?: string | null;
}

export function WarehouseForm({ open, onOpenChange, warehouseId }: WarehouseFormProps) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createWarehouseAsync, updateWarehouseAsync } = useWarehouses();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (warehouseId) {
        await updateWarehouseAsync({ id: warehouseId, code, name });
      } else {
        await createWarehouseAsync({ code, name });
      }

      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: "Berhasil", description: "Gudang berhasil ditambahkan" });
      onOpenChange(false);
      setCode("");
      setName("");
    } catch (error) {
      toast({ title: "Error", description: (error as Error).message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{warehouseId ? "Edit Gudang" : "Tambah Gudang"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label>Kode</Label><Input value={code} onChange={(e) => setCode(e.target.value)} required /></div>
          <div><Label>Nama</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? "Menyimpan..." : "Simpan"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
