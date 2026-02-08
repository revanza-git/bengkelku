import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { AlertTriangle, ArrowLeft, CalendarIcon, Loader2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { usePurchaseOrderDetails, usePurchaseOrderLines } from "@/hooks/usePurchaseOrders";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useCreateDeliveryOrder } from "@/hooks/useDeliveryOrders";
import { useAvailableStock, getAvailableQty } from "@/hooks/useAvailableStock";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const lineSchema = z.object({
  po_line_id: z.string(),
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

export default function CreateDeliveryOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const poId = searchParams.get("po");

  const { data: po, isLoading: isLoadingPO } = usePurchaseOrderDetails(poId || undefined);
  const { data: poLines, isLoading: isLoadingLines } = usePurchaseOrderLines(poId || undefined);
  const { data: warehouses } = useWarehouses();
  const { data: availableStock } = useAvailableStock();
  const createDeliveryOrder = useCreateDeliveryOrder();
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      notes: "",
      lines: [],
    },
  });

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  // Watch all line fields for stock validation
  const watchedLines = form.watch("lines");

  // Check if any line has insufficient stock
  const hasInsufficientStock = watchedLines.some((line) => {
    if (!line.warehouse_id || line.qty_delivered === 0) return false;
    const stockInfo = getAvailableQty(availableStock, line.item_id, line.warehouse_id);
    return stockInfo ? line.qty_delivered > stockInfo.available : false;
  });

  // Initialize form with PO lines when loaded
  useEffect(() => {
    if (poLines && poLines.length > 0) {
      const initialLines = poLines.map((line) => ({
        po_line_id: line.id,
        item_id: line.item_id,
        item_name: line.item?.name || "",
        item_sku: line.item?.sku || "",
        qty_ordered: Number(line.qty),
        qty_delivered: Number(line.qty), // Default to full qty
        warehouse_id: "",
      }));
      replace(initialLines);
    }
  }, [poLines, replace]);

  const onSubmit = async (values: FormValues) => {
    if (!poId || !po) return;

    // Double-check stock availability as safety net
    const insufficientItems = values.lines.filter((line) => {
      if (line.qty_delivered === 0) return false;
      const stockInfo = getAvailableQty(availableStock, line.item_id, line.warehouse_id);
      return stockInfo ? line.qty_delivered > stockInfo.available : true;
    });

    if (insufficientItems.length > 0) {
      toast({
        title: "Stock Tidak Mencukupi",
        description: "Tidak dapat membuat issue karena stock tidak tersedia untuk beberapa item",
        variant: "destructive",
      });
      return;
    }

    await createDeliveryOrder.mutateAsync({
      purchase_order_id: poId,
      customer_id: (po as any).customer_id || undefined,
      delivery_date: format(values.delivery_date, "yyyy-MM-dd"),
      notes: values.notes,
      lines: values.lines.map((line) => ({
        po_line_id: line.po_line_id,
        item_id: line.item_id,
        qty_ordered: line.qty_ordered,
        qty_delivered: line.qty_delivered,
        warehouse_id: line.warehouse_id,
      })),
    });

    navigate("/delivery-orders");
  };

  const getStockInfo = (itemId: string, warehouseId: string) => {
    if (!warehouseId || !itemId) return null;
    return getAvailableQty(availableStock, itemId, warehouseId);
  };

  if (!poId) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase Order ID tidak ditemukan</p>
        <Button onClick={() => navigate("/purchase-orders")} className="mt-4">
          Kembali ke Purchase Orders
        </Button>
      </div>
    );
  }

  if (isLoadingPO || isLoadingLines) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Purchase Order tidak ditemukan</p>
        <Button onClick={() => navigate("/purchase-orders")} className="mt-4">
          Kembali ke Purchase Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Create Issue / Consumption</h1>
          <p className="text-muted-foreground">
            From PO: {(po as any).po_number || po.id.slice(0, 8)} - {po.supplier?.name}
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Header Info */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Issue Header</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="delivery_date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Issue Date *</FormLabel>
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
                                <span>Select date</span>
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
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Notes for this issue request..."
                          className="resize-none"
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Purchase Order Context</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Supplier</p>
                  <p className="font-medium">{po.supplier?.name}</p>
                </div>
                {(po as any).customer && (
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{(po as any).customer?.name}</p>
                  </div>
                )}
                <div>
                    <p className="text-sm text-muted-foreground">PO Date</p>
                  <p className="font-medium">
                    {format(new Date(po.created_at), "dd-MM-yyyy")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Parts to Consume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Part</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Qty Order</TableHead>
                    <TableHead className="text-right">Qty Consume</TableHead>
                    <TableHead>Warehouse</TableHead>
                    <TableHead>Available Stock</TableHead>
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
                        <TableCell className="text-right w-32">
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
                                    className="w-24 text-right"
                                    {...inputField}
                                    onChange={(e) => inputField.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TableCell>
                        <TableCell className="w-48">
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
                                    <SelectTrigger>
                                      <SelectValue placeholder="Pilih gudang" />
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
                            <div className="space-y-1">
                              <Badge variant={hasInsufficientStock ? "destructive" : "secondary"}>
                                {stockInfo.available} available
                              </Badge>
                              {hasInsufficientStock && (
                                <p className="text-xs text-destructive">
                                  Short by {qtyDelivered - stockInfo.available}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              Select warehouse
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col items-end gap-4">
            {hasInsufficientStock && (
              <div className="flex items-center gap-2 text-destructive text-sm">
                <AlertTriangle className="h-4 w-4" />
                <span>Tidak dapat membuat issue karena stock tidak mencukupi</span>
              </div>
            )}
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
              >
                Batal
              </Button>
              <Button
                type="submit"
                disabled={createDeliveryOrder.isPending || hasInsufficientStock}
              >
                {createDeliveryOrder.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Issue Request"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
