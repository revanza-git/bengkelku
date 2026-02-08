import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Loader2 } from "lucide-react";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";
import {
  useCreateExpenseType,
  useUpdateExpenseType,
  ExpenseType,
} from "@/hooks/useExpenseTypes";

const formSchema = z.object({
  code: z.string().min(1, "Kode harus diisi"),
  name: z.string().min(1, "Nama harus diisi"),
  gl_account_id: z.string().optional(),
  is_active: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseTypeFormProps {
  expenseType?: ExpenseType;
  onSuccess?: () => void;
}

export function ExpenseTypeForm({ expenseType, onSuccess }: ExpenseTypeFormProps) {
  const [open, setOpen] = useState(false);
  const { data: glAccounts } = useChartOfAccounts();
  const createExpenseType = useCreateExpenseType();
  const updateExpenseType = useUpdateExpenseType();
  const isEditing = !!expenseType;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: "",
      name: "",
      gl_account_id: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (open && expenseType) {
      form.reset({
        code: expenseType.code,
        name: expenseType.name,
        gl_account_id: expenseType.gl_account_id || "",
        is_active: expenseType.is_active,
      });
    } else if (open && !expenseType) {
      form.reset({
        code: "",
        name: "",
        gl_account_id: "",
        is_active: true,
      });
    }
  }, [open, expenseType, form]);

  const onSubmit = async (values: FormValues) => {
    try {
      if (isEditing) {
        await updateExpenseType.mutateAsync({
          id: expenseType.id,
          code: values.code,
          name: values.name,
          gl_account_id: values.gl_account_id || null,
          is_active: values.is_active,
        });
      } else {
        await createExpenseType.mutateAsync({
          code: values.code,
          name: values.name,
          gl_account_id: values.gl_account_id || null,
          is_active: values.is_active,
        });
      }
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      // Error handled in hook
    }
  };

  const isLoading = createExpenseType.isPending || updateExpenseType.isPending;

  // Filter for expense type GL accounts
  const expenseAccounts = glAccounts?.filter((acc) => acc.type === "expense") || [];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Tambah Jenis Beban
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Jenis Beban" : "Tambah Jenis Beban"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Ubah informasi jenis beban"
              : "Masukkan informasi jenis beban baru"}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode</FormLabel>
                  <FormControl>
                    <Input placeholder="ONGKIR" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input placeholder="Ongkos Kirim" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gl_account_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Akun GL (Opsional)</FormLabel>
                  <Select
                    onValueChange={(val) => field.onChange(val === "none" ? "" : val)}
                    value={field.value || "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih akun GL (opsional)" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Tidak ada</SelectItem>
                      {expenseAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.code} - {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Status Aktif</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Simpan" : "Tambah"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
