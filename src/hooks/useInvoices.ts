import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface InvoiceLine {
  id: string;
  invoice_id: string;
  item_id: string;
  description?: string;
  qty: number;
  unit_price: number;
  tax_code_id?: string;
  tax_amount: number;
  line_total: number;
  items?: any;
  tax_codes?: any;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  purchase_order_id?: string;
  customer_id?: string;
  status: string;
  invoice_date: string;
  due_date?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  notes?: string;
  created_at: string;
  org_id: string;
  purchase_orders?: any;
  customers?: any;
  invoice_lines?: InvoiceLine[];
  payment_allocations?: any[];
}

export function useInvoices() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: invoices = [], isLoading, error } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating invoice',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Invoice> & { id: string }) =>
      invoicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating invoice',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Invoice deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting invoice',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    invoices,
    isLoading,
    error,
    createInvoice: createMutation.mutate,
    createInvoiceAsync: createMutation.mutateAsync,
    updateInvoice: updateMutation.mutate,
    updateInvoiceAsync: updateMutation.mutateAsync,
    deleteInvoice: deleteMutation.mutate,
    deleteInvoiceAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.getOne(id),
    enabled: !!id,
  });
}

export const useInvoiceDetails = (id: string) => useInvoice(id);

export const useInvoiceLines = (id: string) =>
  useQuery({
    queryKey: ['invoices', id, 'lines'],
    queryFn: async () => {
      const invoice = await invoicesApi.getOne(id);
      return invoice?.invoice_lines ?? [];
    },
    enabled: !!id,
  });

export const useCancelInvoice = () => {
  const { updateInvoice, updateInvoiceAsync } = useInvoices();
  return { mutate: updateInvoice, mutateAsync: updateInvoiceAsync };
};

export const useDeleteInvoice = () => {
  const { deleteInvoice, deleteInvoiceAsync } = useInvoices();
  return { mutate: deleteInvoice, mutateAsync: deleteInvoiceAsync };
};

export const useInvoiceByPO = (purchaseOrderId: string) =>
  useQuery({
    queryKey: ['invoices', 'purchase-order', purchaseOrderId],
    queryFn: async () => {
      const invoices = await invoicesApi.getAll();
      return invoices.find((invoice: any) => invoice.purchase_order_id === purchaseOrderId) || null;
    },
    enabled: !!purchaseOrderId,
  });
