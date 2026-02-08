import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useUpdateDeliveryOrder } from "@/hooks/useDeliveryOrders";
import { useAvailableStock, getAvailableQty } from "@/hooks/useAvailableStock";
import { cn } from "@/lib/utils";

const lineSchema = z.object({
  id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  item_sku: z.string(),
  qty_ordered: z.number(),
  qty_delivered: z.number().min(0, "Qty tidak boleh negatif"),
  warehouse_id: z.string().min(1, "Gudang wajib dipilih"),
});

const formSchema = z.object({
  delivery_date: z.date({ required_error: "Tanggal pengiriman wajib diisi" }),
  notes: z.string().optional(),
  lines: z.array(lineSchema).min(1, "Minimal satu item"),
});

type FormValues = z.infer<typeof formSchema>;

interface DeliveryOrder {
  id: string;
  delivery_date: string;
  notes?: string | null;
}

interface DeliveryLine {
  id: string;
  item_id: string;
  qty_ordered: number;
  qty_delivered: number;
  warehouse_id: string;
  item?: {
    id: string;
    sku: string;
    name: string;
    uom?: string;
  } | null;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

interface EditDeliveryOrderDialogProps {
  deliveryOrder: DeliveryOrder;
  lines: DeliveryLine[];
}

export default function EditDeliveryOrderDialog({ deliveryOrder, lines }: EditDeliveryOrderDialogProps) {
  const [open, setOpen] = useState(false);
  
  const { data: warehouses } = useWarehouses();
  const { data: availableStock } = useAvailableStock();
  const updateDeliveryOrder = useUpdateDeliveryOrder();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      delivery_date: new Date(deliveryOrder.delivery_date),
      notes: deliveryOrder.notes || "",
      lines: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // Initialize form with delivery order lines
  useEffect(() => {
    if (open && lines && lines.length > 0) {
      const initialLines = lines.map((line) => ({
        id: line.id,
        item_id: line.item_id,
        item_name: line.item?.name || "",
        item_sku: line.item?.sku || "",
        qty_ordered: Number(line.qty_ordered),
        qty_delivered: Number(line.qty_delivered),
        warehouse_id: line.warehouse_id,
      }));
      replace(initialLines);
      form.setValue("delivery_date", new Date(deliveryOrder.delivery_date));
      form.setValue("notes", deliveryOrder.notes || "");
    }
  }, [open, lines, deliveryOrder, replace, form]);

  const onSubmit = async (values: FormValues) => {
    await updateDeliveryOrder.mutateAsync({
      id: deliveryOrder.id,
      delivery_date: format(values.delivery_date, "yyyy-MM-dd"),
      notes: values.notes,
      lines: values.lines.map((line) => ({
        id: line.id,
        qty_delivered: line.qty_delivered,
        warehouse_id: line.warehouse_id,
      })),
    });

    setOpen(false);
  };

  const getStockInfo = (itemId: string, warehouseId: string) => {
    if (!warehouseId || !itemId) return null;
    return getAvailableQty(availableStock, itemId, warehouseId);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil className="mr-2 h-4 w-4" />
          Edit Surat Jalan
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Surat Jalan</DialogTitle>
          <DialogDescription>
            Ubah informasi pengiriman dan kuantitas item. Hanya dapat dilakukan saat status masih Draft.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Header Info */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="delivery_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Tanggal Pengiriman *</FormLabel>
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
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catatan</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Catatan untuk surat jalan..."
                        className="resize-none"
                        rows={2}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Items */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty Order</TableHead>
                    <TableHead className="text-right">Qty Kirim</TableHead>
                    <TableHead>Gudang</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const warehouseId = form.watch(`lines.${index}.warehouse_id`);
                    const stockInfo = getStockInfo(field.item_id, warehouseId);
                    const qtyDelivered = form.watch(`lines.${index}.qty_delivered`);
                    const hasInsufficientStock = stockInfo && qtyDelivered > stockInfo.available;

                    return (
                      <TableRow key={field.id}>
                        <TableCell className="font-medium">{field.item_name}</TableCell>
                        <TableCell className="font-mono text-sm">{field.item_sku}</TableCell>
                        <TableCell className="text-right">{field.qty_ordered}</TableCell>
                        <TableCell className="text-right w-28">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.qty_delivered`}
                            render={({ field: inputField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={field.qty_ordered}
                                    className="w-20 text-right"
                                    {...inputField}
                                    onChange={(e) => inputField.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="w-44">
                          <FormField
                            control={form.control}
                            name={`lines.${index}.warehouse_id`}
                            render={({ field: selectField }) => (
                              <FormItem>
                                <Select
                                  onValueChange={selectField.onChange}
                                  value={selectField.value}
                                >
                                  <FormControl>
                                    <SelectTrigger className="w-36">
                                      <SelectValue placeholder="Pilih" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent className="z-50 bg-popover">
                                    {warehouses?.map((wh) => (
                                      <SelectItem key={wh.id} value={wh.id}>
                                        {wh.code} - {wh.name}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell>
                          {warehouseId && stockInfo ? (
                            <Badge variant={hasInsufficientStock ? "destructive" : "secondary"}>
                              {stockInfo.available}
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={updateDeliveryOrder.isPending}
              >
                {updateDeliveryOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  "Simpan Perubahan"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
