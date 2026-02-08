import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface PaymentAllocation {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: number;
  invoices?: any;
}

export interface Payment {
  id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
  created_at: string;
  org_id: string;
  payment_allocations?: PaymentAllocation[];
}

export function usePayments() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: payments = [], isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: () => paymentsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Payment recorded successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording payment',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({ title: 'Payment deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting payment',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    payments,
    isLoading,
    error,
    createPayment: createMutation.mutate,
    createPaymentAsync: createMutation.mutateAsync,
    deletePayment: deleteMutation.mutate,
    deletePaymentAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export const useCreatePayment = () => {
  const { createPayment, createPaymentAsync } = usePayments();
  return { mutate: createPayment, mutateAsync: createPaymentAsync };
};

export const useInvoicePayments = (invoiceId: string) =>
  useQuery({
    queryKey: ['payments', 'invoice', invoiceId],
    queryFn: () => paymentsApi.getAll(),
    enabled: !!invoiceId,
  });
