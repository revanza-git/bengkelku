import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSuppliers } from "@/hooks/useSuppliers";
import { useItems } from "@/hooks/useItems";
import { useCustomers } from "@/hooks/useCustomers";
import { usePurchaseOrders } from "@/hooks/usePurchaseOrders";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const CURRENCIES = [
  { value: "IDR", label: "IDR - Rupiah Indonesia" },
  { value: "USD", label: "USD - US Dollar" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "SGD", label: "SGD - Singapore Dollar" },
];

const lineItemSchema = z.object({
  item_id: z.string().min(1, "Item wajib diisi"),
  qty: z.number().min(0.01, "Kuantitas harus lebih dari 0"),
  unit_cost: z.number().min(0, "Harga harus 0 atau lebih"),
});

const formSchema = z.object({
  supplier_id: z.string().min(1, "Supplier wajib diisi"),
  customer_id: z.string().optional(),
  eta_date: z.date().optional(),
  planned_delivery_start: z.date().optional(),
  currency: z.string().default("IDR"),
  notes: z.string().optional(),
  lines: z.array(lineItemSchema).min(1, "Minimal satu item diperlukan"),
});

type FormValues = z.infer<typeof formSchema>;

interface PurchaseOrderFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PurchaseOrderForm({ open, onOpenChange }: PurchaseOrderFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { items, isLoading: loadingItems } = useItems();
  const { customers, isLoading: loadingCustomers } = useCustomers();
  const { createPurchaseOrderAsync } = usePurchaseOrders();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplier_id: "",
      customer_id: "",
      currency: "IDR",
      notes: "",
      lines: [{ item_id: "", qty: 1, unit_cost: 0 }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const calculateTotal = () => {
    const lines = form.watch("lines");
    return lines.reduce((sum, line) => sum + (line.qty * line.unit_cost), 0);
  };

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const po = await createPurchaseOrderAsync({
        supplier_id: values.supplier_id,
        customer_id: values.customer_id || undefined,
        eta_date: values.eta_date ? format(values.eta_date, "yyyy-MM-dd") : undefined,
        planned_delivery_start: values.planned_delivery_start 
          ? format(values.planned_delivery_start, "yyyy-MM-dd") 
          : undefined,
        currency: values.currency,
        notes: values.notes || undefined,
        lines: values.lines.map((line) => ({
          item_id: line.item_id,
          qty: line.qty,
          unit_cost: line.unit_cost,
        })),
      });

      toast({
        title: "Berhasil",
        description: `Purchase Order ${po?.po_number || ''} berhasil dibuat`,
      });

      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    const currency = form.watch("currency") || "IDR";
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Buat Purchase Order</DialogTitle>
          <DialogDescription>
            Buat purchase order baru untuk pengadaan barang
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Row 1: Supplier & Customer */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="supplier_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-50 bg-popover">
                        {loadingSuppliers ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : suppliers && suppliers.length > 0 ? (
                          suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-2 px-3 text-sm text-muted-foreground">
                            Tidak ada supplier
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer (Opsional)</FormLabel>
                    <Select 
                      onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                      value={field.value || "__none__"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-50 bg-popover">
                        {loadingCustomers ? (
                          <div className="flex items-center justify-center py-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        ) : (
                          <>
                            <SelectItem value="__none__">- Tidak ada -</SelectItem>
                            {customers?.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.name}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 2: ETA Date & Planned Delivery Start */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="eta_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal ETA</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd-MM-yyyy")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planned_delivery_start"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Rencana Mulai Pengiriman</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "dd-MM-yyyy")
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Currency */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mata Uang</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih mata uang" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="z-50 bg-popover">
                        {CURRENCIES.map((curr) => (
                          <SelectItem key={curr.value} value={curr.value}>
                            {curr.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Catatan tambahan untuk PO ini..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Order Items Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Item Pesanan</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ item_id: "", qty: 1, unit_cost: 0 })}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Tambah Item
                </Button>
              </div>

              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-5">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.item_id`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Item *</FormLabel>
                            <Select
                              onValueChange={(selectedItemId) => {
                                field.onChange(selectedItemId);
                                // Auto-fill unit_cost from item's base_cost
                                const selectedItem = items?.find(item => item.id === selectedItemId);
                                if (selectedItem?.base_cost) {
                                  form.setValue(`lines.${index}.unit_cost`, selectedItem.base_cost);
                                }
                              }}
                              value={field.value}
                            >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Pilih item" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent className="z-50 bg-popover">
                                  {loadingItems ? (
                                    <div className="flex items-center justify-center py-2">
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    </div>
                                  ) : items && items.length > 0 ? (
                                    items.map((item) => (
                                      <SelectItem key={item.id} value={item.id}>
                                        {item.sku} - {item.name}
                                      </SelectItem>
                                    ))
                                  ) : (
                                    <div className="py-2 px-3 text-sm text-muted-foreground">
                                      Tidak ada item
                                    </div>
                                  )}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.qty`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Qty *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.unit_cost`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Harga Satuan *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={field.value || ""}
                                  onChange={(e) =>
                                    field.onChange(parseFloat(e.target.value) || 0)
                                  }
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="col-span-2 flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={fields.length === 1}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-lg font-bold">
                Total: {formatCurrency(calculateTotal())}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Buat Purchase Order
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
