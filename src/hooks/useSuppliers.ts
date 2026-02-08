import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { suppliersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Supplier {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  lead_time_days?: number;
  npwp?: string;
  created_at: string;
  org_id: string;
}

export function useSuppliers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: suppliers = [], isLoading, error } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => suppliersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Supplier>) => suppliersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating supplier',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Supplier> & { id: string }) =>
      suppliersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating supplier',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => suppliersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast({ title: 'Supplier deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting supplier',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    suppliers,
    isLoading,
    error,
    createSupplier: createMutation.mutate,
    createSupplierAsync: createMutation.mutateAsync,
    updateSupplier: updateMutation.mutate,
    updateSupplierAsync: updateMutation.mutateAsync,
    deleteSupplier: deleteMutation.mutate,
    deleteSupplierAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
