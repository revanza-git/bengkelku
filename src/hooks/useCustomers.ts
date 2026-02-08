import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  tax_id?: string;
  address?: string;
  created_at: string;
  org_id: string;
}

export function useCustomers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: customers = [], isLoading, error } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => customersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating customer',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Customer> & { id: string }) =>
      customersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating customer',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => customersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: 'Customer deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting customer',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    customers,
    isLoading,
    error,
    createCustomer: createMutation.mutate,
    createCustomerAsync: createMutation.mutateAsync,
    updateCustomer: updateMutation.mutate,
    updateCustomerAsync: updateMutation.mutateAsync,
    deleteCustomer: deleteMutation.mutate,
    deleteCustomerAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
