import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCreateTaxCode, useUpdateTaxCode, type TaxCode } from "@/hooks/useTaxCodes";

const taxCodeSchema = z.object({
  code: z.string().min(1, "Code is required").max(20, "Code must be 20 characters or less"),
  rate: z.coerce.number().min(0, "Rate must be 0 or greater").max(100, "Rate cannot exceed 100"),
});

type TaxCodeFormValues = z.infer<typeof taxCodeSchema>;

interface TaxCodeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taxCode?: TaxCode;
}

export function TaxCodeForm({ open, onOpenChange, taxCode }: TaxCodeFormProps) {
  const createTaxCode = useCreateTaxCode();
  const updateTaxCode = useUpdateTaxCode();

  const form = useForm<TaxCodeFormValues>({
    resolver: zodResolver(taxCodeSchema),
    defaultValues: {
      code: "",
      rate: 0,
    },
  });

  // Reset form values when taxCode changes or modal opens
  useEffect(() => {
    if (open && taxCode) {
      form.reset({
        code: taxCode.code,
        rate: taxCode.rate,
      });
    } else if (open && !taxCode) {
      form.reset({
        code: "",
        rate: 0,
      });
    }
  }, [open, taxCode, form]);

  const onSubmit = async (data: TaxCodeFormValues) => {
    if (taxCode) {
      await updateTaxCode.mutateAsync({
        id: taxCode.id,
        code: data.code,
        rate: data.rate,
      });
    } else {
      await createTaxCode.mutateAsync({
        code: data.code,
        rate: data.rate,
      });
    }
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{taxCode ? "Edit Tax Code" : "Create Tax Code"}</DialogTitle>
          <DialogDescription>
            {taxCode
              ? "Update the tax code details below."
              : "Add a new tax code to the system."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., PPN, VAT, GST" {...field} />
                  </FormControl>
                  <FormDescription>
                    Short identifier for this tax code (e.g., PPN, VAT, GST)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rate (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g., 11"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Tax rate as a percentage (e.g., 11 for 11%, 0 for tax-exempt)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  form.reset();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTaxCode.isPending || updateTaxCode.isPending}>
                {taxCode ? "Update" : "Create"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
