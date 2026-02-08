import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { useActiveExpenseTypes } from "@/hooks/useExpenseTypes";
import {
  useDeliveryExpenses,
  useCreateDeliveryExpense,
  useDeleteDeliveryExpense,
} from "@/hooks/useDeliveryExpenses";

interface DeliveryExpensesSectionProps {
  deliveryOrderId: string;
  deliveryOrderStatus: string;
  readOnly?: boolean;
}

export function DeliveryExpensesSection({
  deliveryOrderId,
  deliveryOrderStatus,
  readOnly = false,
}: DeliveryExpensesSectionProps) {
  const { data: expenseTypes, isLoading: loadingTypes } = useActiveExpenseTypes();
  const { data: expenses, isLoading: loadingExpenses } = useDeliveryExpenses(deliveryOrderId);
  const createExpense = useCreateDeliveryExpense();
  const deleteExpense = useDeleteDeliveryExpense();

  const [selectedType, setSelectedType] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleAddExpense = async () => {
    if (!selectedType || !amount || Number(amount) <= 0) return;

    await createExpense.mutateAsync({
      delivery_order_id: deliveryOrderId,
      expense_type_id: selectedType,
      amount: Number(amount),
      notes: notes || null,
    });

    // Reset form
    setSelectedType("");
    setAmount("");
    setNotes("");
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense.mutateAsync({
      id,
      deliveryOrderId,
    });
  };

  const totalExpenses = expenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

  // Allow editing only for draft and confirmed status
  const canEdit = !readOnly && (deliveryOrderStatus === "draft" || deliveryOrderStatus === "confirmed");

  if (loadingTypes || loadingExpenses) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Beban Pengiriman
        </CardTitle>
        <CardDescription>
          Beban ini akan ditagihkan ke customer pada Invoice
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add expense form */}
        {canEdit && (
          <div className="flex flex-wrap gap-2 p-4 bg-muted/50 rounded-lg">
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Pilih jenis beban" />
              </SelectTrigger>
              <SelectContent>
                {expenseTypes?.map((et) => (
                  <SelectItem key={et.id} value={et.id}>
                    {et.code} - {et.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Jumlah"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-[150px]"
              min={0}
            />

            <Input
              placeholder="Catatan (opsional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="flex-1 min-w-[150px]"
            />

            <Button
              onClick={handleAddExpense}
              disabled={!selectedType || !amount || Number(amount) <= 0 || createExpense.isPending}
            >
              {createExpense.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4 mr-1" />
              )}
              Tambah
            </Button>
          </div>
        )}

        {/* Expenses table */}
        {expenses && expenses.length > 0 ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Jenis Beban</TableHead>
                  <TableHead className="text-right">Jumlah</TableHead>
                  <TableHead>Catatan</TableHead>
                  {canEdit && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono">
                        {expense.expense_type?.code}
                      </Badge>
                      <span className="ml-2">{expense.expense_type?.name}</span>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {expense.notes || "-"}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteExpense(expense.id)}
                          disabled={deleteExpense.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Total */}
            <div className="flex justify-end pt-4 border-t">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Beban</p>
                <p className="text-xl font-bold">{formatCurrency(totalExpenses)}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            Belum ada beban pengiriman
          </div>
        )}
      </CardContent>
    </Card>
  );
}
