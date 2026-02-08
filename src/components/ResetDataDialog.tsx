import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Loader2 } from "lucide-react";
import { useResetData } from "@/hooks/useResetData";

export function ResetDataDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { mutate: resetData, isPending } = useResetData();

  const handleReset = () => {
    resetData(undefined, {
      onSuccess: () => {
        setOpen(false);
        setConfirmText("");
      },
    });
  };

  const isConfirmValid = confirmText === "RESET";

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-2" />
          Reset Data
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="text-destructive">
            Reset Semua Data Transaksional?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Tindakan ini akan <strong>menghapus permanen</strong> semua data berikut:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 bg-muted p-3 rounded-md">
              <li>Purchase Orders & PO Lines</li>
              <li>Delivery Orders & Lines</li>
              <li>Invoices & Invoice Lines</li>
              <li>Payments & Payment Allocations</li>
              <li>Journal Entries & Lines</li>
              <li>Cashflow Entries</li>
              <li>Inventory Transactions</li>
              <li>Reservations</li>
              <li>Goods Receipts</li>
              <li>Audit Logs</li>
            </ul>
            <p className="font-medium">
              Data master berikut akan <strong>tetap tersimpan</strong>:
            </p>
            <ul className="list-disc list-inside text-sm space-y-1 bg-green-50 dark:bg-green-950 p-3 rounded-md text-green-700 dark:text-green-300">
              <li>Items / Materials</li>
              <li>Suppliers</li>
              <li>Customers</li>
              <li>Warehouses & Bins</li>
              <li>GL Accounts</li>
              <li>Tax Codes</li>
              <li>Expense Types</li>
              <li>Users</li>
            </ul>
            <div className="pt-2">
              <p className="text-sm font-medium mb-2">
                Ketik <strong>RESET</strong> untuk konfirmasi:
              </p>
              <Input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                placeholder="Ketik RESET"
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Batal
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={!isConfirmValid || isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Menghapus...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Reset Data
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
