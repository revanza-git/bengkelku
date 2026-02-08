import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useItems } from "@/hooks/useItems";
import { useWarehouses } from "@/hooks/useWarehouses";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { inventoryTransactionsApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
const adjustmentSchema = z.object({
  item_id: z.string().uuid(),
  warehouse_id: z.string().uuid(),
  qty: z.number().min(-999999).max(999999),
  unit_cost: z.number().min(0),
  reason: z.string().optional(),
});

type AdjustmentFormData = z.infer<typeof adjustmentSchema>;

interface StockAdjustmentFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StockAdjustmentForm({ onSuccess, onCancel }: StockAdjustmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { items } = useItems();
  const { warehouses } = useWarehouses();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
  });

  const selectedItemId = watch("item_id");
  const selectedWarehouseId = watch("warehouse_id");
  const selectedItem = items?.find((item) => item.id === selectedItemId);

  // Auto-populate unit cost from item's base_cost when item is selected
  useEffect(() => {
    if (selectedItem && selectedItem.base_cost > 0) {
      setValue("unit_cost", Number(selectedItem.base_cost));
    }
  }, [selectedItem, setValue]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const onSubmit = async (data: AdjustmentFormData) => {
    setIsSubmitting(true);
    try {
      const trxType = data.qty > 0 ? "ADJ+" : "ADJ-";

      await inventoryTransactionsApi.create({
        item_id: data.item_id,
        warehouse_id: data.warehouse_id,
        qty: data.qty,
        unit_cost: data.unit_cost,
        trx_type: trxType,
      });

      toast({
        title: "Success",
        description: "Stock adjustment recorded successfully",
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-on-hand"] });

      onSuccess?.();
    } catch (error) {
      console.error("Error creating adjustment:", error);
      toast({
        title: "Error",
        description: "Failed to record stock adjustment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Adjustment</CardTitle>
        <CardDescription>Adjust inventory quantities for physical count corrections</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Item</Label>
            <Select
              value={watch("item_id")}
              onValueChange={(value) => setValue("item_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select item" />
              </SelectTrigger>
              <SelectContent>
                {items?.filter(item => item.is_stock).map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.sku} - {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.item_id && (
              <p className="text-sm text-destructive">{errors.item_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Warehouse</Label>
            <Select
              value={watch("warehouse_id")}
              onValueChange={(value) => setValue("warehouse_id", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {warehouses?.map((warehouse) => (
                  <SelectItem key={warehouse.id} value={warehouse.id}>
                    {warehouse.code} - {warehouse.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.warehouse_id && (
              <p className="text-sm text-destructive">{errors.warehouse_id.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Quantity Adjustment</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Enter quantity (+ to add, - to remove)"
              {...register("qty", { valueAsNumber: true })}
            />
            {errors.qty && (
              <p className="text-sm text-destructive">{errors.qty.message}</p>
            )}
            <p className="text-sm text-muted-foreground">
              UOM: {selectedItem?.uom || "unit"}
            </p>
          </div>

          <div className="space-y-2">
            <Label>Unit Cost</Label>
            <Input
              type="number"
              step="0.01"
              placeholder="0.00"
              {...register("unit_cost", { valueAsNumber: true })}
            />
            {errors.unit_cost && (
              <p className="text-sm text-destructive">{errors.unit_cost.message}</p>
            )}
            {selectedItem && (
              <p className="text-sm text-muted-foreground">
                {selectedItem.base_cost > 0 ? (
                  `Base cost: ${formatCurrency(Number(selectedItem.base_cost))}`
                ) : (
                  "No base cost set - enter cost manually"
                )}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Adjustment
            </Button>
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
