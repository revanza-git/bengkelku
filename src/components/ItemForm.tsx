import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useItems } from "@/hooks/useItems";

const itemSchema = z.object({
  sku: z.string().min(1, "SKU is required").max(50),
  name: z.string().min(1, "Name is required").max(200),
  is_stock: z.boolean(),
  uom: z.string().min(1, "Unit of measure is required").max(20),
  base_cost: z.string().min(1),
  min_stock: z.string().optional(),
  reorder_point: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

interface ItemFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: any;
}

export function ItemForm({ open, onOpenChange, item }: ItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { createItemAsync, updateItemAsync } = useItems();

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      sku: "",
      name: "",
      is_stock: true,
      uom: "unit",
      base_cost: "0",
      min_stock: "0",
      reorder_point: "0",
    },
  });

  useEffect(() => {
    if (open && item) {
      form.reset({
        sku: item.sku,
        name: item.name,
        is_stock: item.is_stock,
        uom: item.uom,
        base_cost: String(item.base_cost ?? 0),
        min_stock: String(item.min_stock ?? 0),
        reorder_point: String(item.reorder_point ?? 0),
      });
    } else if (open) {
      form.reset({
        sku: "",
        name: "",
        is_stock: true,
        uom: "unit",
        base_cost: "0",
        min_stock: "0",
        reorder_point: "0",
      });
    }
  }, [open, item, form]);

  const onSubmit = async (values: ItemFormValues) => {
    try {
      const payload = {
        sku: values.sku,
        name: values.name,
        is_stock: values.is_stock,
        uom: values.uom,
        base_cost: Number(values.base_cost || 0),
        min_stock: Number(values.min_stock || 0),
        reorder_point: Number(values.reorder_point || 0),
      };

      if (item) {
        await updateItemAsync({ id: item.id, ...payload });
        toast({ title: "Part updated successfully" });
      } else {
        await createItemAsync(payload);
        toast({ title: "Part created successfully" });
      }

      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["items", "low-stock"] });
      form.reset();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Failed to save part",
        description: error.response?.data?.message || error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit Part" : "Add Part"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sku"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SKU</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. PART-001" />
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
                    <FormLabel>Part Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Part name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="is_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value ? "true" : "false"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="true">Stock Part</SelectItem>
                        <SelectItem value="false">Service</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="uom"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="pcs, unit, set" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="base_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Cost</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="min_stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Stock</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reorder_point"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Point</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" min="0" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{item ? "Update Part" : "Create Part"}</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
