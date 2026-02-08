import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useWarehouses } from "@/hooks/useWarehouses";
import { inventoryTransactionsApi, purchaseOrdersApi } from "@/lib/api";

const lineItemSchema = z.object({
  po_line_id: z.string(),
  item_id: z.string(),
  item_name: z.string(),
  ordered_qty: z.number(),
  received_qty: z.number().min(0, "Quantity must be 0 or greater"),
  unit_cost: z.number(),
});

const formSchema = z.object({
  warehouse_id: z.string().min(1, "Warehouse is required"),
  lines: z.array(lineItemSchema),
});

type FormValues = z.infer<typeof formSchema>;

interface GoodsReceiptFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  purchaseOrderId: string;
  poLines: any[];
  poNumber?: string;
}

export function GoodsReceiptForm({ open, onOpenChange, purchaseOrderId, poLines, poNumber }: GoodsReceiptFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { warehouses, isLoading: loadingWarehouses } = useWarehouses();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      warehouse_id: "",
      lines: poLines?.map(line => ({
        po_line_id: line.id,
        item_id: line.item_id,
        item_name: line.item?.name || "",
        ordered_qty: Number(line.qty),
        received_qty: Number(line.qty),
        unit_cost: Number(line.unit_cost),
      })) || [],
    },
  });

  const { fields } = useFieldArray({
    control: form.control,
    name: "lines",
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      for (const line of values.lines) {
        if (line.received_qty > 0) {
          await inventoryTransactionsApi.create({
            item_id: line.item_id,
            warehouse_id: values.warehouse_id,
            trx_type: "GRN",
            qty: line.received_qty,
            unit_cost: line.unit_cost,
            ref_table: "purchase_orders",
            ref_id: purchaseOrderId,
          });
        }
      }

      const allFullyReceived = values.lines.every(line => line.received_qty >= line.ordered_qty);
      await purchaseOrdersApi.updateStatus(
        purchaseOrderId,
        allFullyReceived ? "received" : "partial_received"
      );

      toast({
        title: "Goods Received",
        description: "Items received successfully",
      });

      queryClient.invalidateQueries({ queryKey: ["purchase-order", purchaseOrderId] });
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receive Goods</DialogTitle>
          <DialogDescription>
            Record the receipt of items from the purchase order into inventory
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="warehouse_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Receiving Warehouse *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select warehouse" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="z-50 bg-popover">
                      {loadingWarehouses ? (
                        <div className="flex items-center justify-center py-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : warehouses && warehouses.length > 0 ? (
                        warehouses.map((warehouse) => (
                          <SelectItem key={warehouse.id} value={warehouse.id}>
                            {warehouse.code} - {warehouse.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-sm text-muted-foreground">
                          No warehouses found
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Items to Receive</h3>
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-5">
                        <div>
                          <p className="text-sm text-muted-foreground">Item</p>
                          <p className="font-medium">{field.item_name}</p>
                        </div>
                      </div>
                      <div className="col-span-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Ordered</p>
                          <p className="font-medium">{field.ordered_qty}</p>
                        </div>
                      </div>
                      <div className="col-span-3">
                        <FormField
                          control={form.control}
                          name={`lines.${index}.received_qty`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Received Qty *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
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
                      <div className="col-span-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Unit Cost</p>
                          <p className="font-medium">Rp {field.unit_cost.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Receive Goods
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
