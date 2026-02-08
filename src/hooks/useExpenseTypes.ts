import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expenseTypesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface ExpenseType {
  id: string;
  name: string;
  description?: string;
  gl_account_id?: string;
  is_active: boolean;
  created_at: string;
  org_id: string;
  gl_accounts?: any;
}

export function useExpenseTypes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: expenseTypes = [], isLoading, error } = useQuery({
    queryKey: ['expense-types'],
    queryFn: () => expenseTypesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<ExpenseType>) => expenseTypesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      toast({ title: 'Expense type created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating expense type',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<ExpenseType> & { id: string }) =>
      expenseTypesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      toast({ title: 'Expense type updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating expense type',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expenseTypesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-types'] });
      toast({ title: 'Expense type deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting expense type',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    expenseTypes,
    isLoading,
    error,
    createExpenseType: createMutation.mutate,
    createExpenseTypeAsync: createMutation.mutateAsync,
    updateExpenseType: updateMutation.mutate,
    updateExpenseTypeAsync: updateMutation.mutateAsync,
    deleteExpenseType: deleteMutation.mutate,
    deleteExpenseTypeAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export const useActiveExpenseTypes = () => {
  return useQuery({
    queryKey: ['expense-types', 'active'],
    queryFn: () => expenseTypesApi.getAll(),
  });
};

export const useCreateExpenseType = () => {
  const { createExpenseType, createExpenseTypeAsync } = useExpenseTypes();
  return { mutate: createExpenseType, mutateAsync: createExpenseTypeAsync };
};

export const useUpdateExpenseType = () => {
  const { updateExpenseType, updateExpenseTypeAsync } = useExpenseTypes();
  return { mutate: updateExpenseType, mutateAsync: updateExpenseTypeAsync };
};

export const useDeleteExpenseType = () => {
  const { deleteExpenseType, deleteExpenseTypeAsync } = useExpenseTypes();
  return { mutate: deleteExpenseType, mutateAsync: deleteExpenseTypeAsync };
};
