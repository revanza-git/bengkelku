import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cashflowApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface CashflowEntry {
  id: string;
  entry_date: string;
  type: 'cash_in' | 'cash_out';
  status: 'planned' | 'paid';
  amount: number;
  description?: string;
  category?: string;
  reference?: string;
  notes?: string;
  created_at: string;
  org_id: string;
}

export function useCashflowEntries(filters?: { type?: string; status?: string }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: entries = [], isLoading, error } = useQuery({
    queryKey: ['cashflow-entries', filters],
    queryFn: () => cashflowApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<CashflowEntry>) => cashflowApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow-entries'] });
      toast({ title: 'Cashflow entry created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating entry',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<CashflowEntry> & { id: string }) =>
      cashflowApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow-entries'] });
      toast({ title: 'Entry updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating entry',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cashflowApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cashflow-entries'] });
      toast({ title: 'Entry deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting entry',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    entries,
    isLoading,
    error,
    createEntry: createMutation.mutate,
    createEntryAsync: createMutation.mutateAsync,
    updateEntry: updateMutation.mutate,
    updateEntryAsync: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutate,
    deleteEntryAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export const useCreateCashflowEntry = () => {
  const { createEntry, createEntryAsync } = useCashflowEntries();
  return { mutate: createEntry, mutateAsync: createEntryAsync };
};

export const useCashflowEntry = (id: string) => {
  return useQuery({
    queryKey: ['cashflow-entries', id],
    queryFn: () => cashflowApi.getOne(id),
    enabled: !!id,
  });
};

export const useUpdateCashflowEntry = () => {
  const { updateEntry, updateEntryAsync } = useCashflowEntries();
  return { mutate: updateEntry, mutateAsync: updateEntryAsync };
};

export const useDeleteCashflowEntry = () => {
  const { deleteEntry, deleteEntryAsync } = useCashflowEntries();
  return { mutate: deleteEntry, mutateAsync: deleteEntryAsync };
};
