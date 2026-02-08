import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { glAccountsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface GlAccount {
  id: string;
  account_code: string;
  account_name: string;
  account_type: string;
  parent_id?: string;
  is_active: boolean;
  created_at: string;
  org_id: string;
}

export function useChartOfAccounts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['gl-accounts'],
    queryFn: () => glAccountsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<GlAccount>) => glAccountsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
      toast({ title: 'Account created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating account',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<GlAccount> & { id: string }) =>
      glAccountsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
      toast({ title: 'Account updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating account',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => glAccountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gl-accounts'] });
      toast({ title: 'Account deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting account',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    accounts,
    isLoading,
    error,
    createAccount: createMutation.mutate,
    createAccountAsync: createMutation.mutateAsync,
    updateAccount: updateMutation.mutate,
    updateAccountAsync: updateMutation.mutateAsync,
    deleteAccount: deleteMutation.mutate,
    deleteAccountAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export const useCreateGLAccount = () => {
  const { createAccount, createAccountAsync } = useChartOfAccounts();
  return { mutate: createAccount, mutateAsync: createAccountAsync };
};

export const useDeleteGLAccount = () => {
  const { deleteAccount, deleteAccountAsync } = useChartOfAccounts();
  return { mutate: deleteAccount, mutateAsync: deleteAccountAsync };
};
