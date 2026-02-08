import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { warehousesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  created_at: string;
  org_id: string;
  bins?: any[];
}

export function useWarehouses() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: warehouses = [], isLoading, error } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => warehousesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<Warehouse>) => warehousesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ title: 'Warehouse created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating warehouse',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Warehouse> & { id: string }) =>
      warehousesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ title: 'Warehouse updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating warehouse',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => warehousesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouses'] });
      toast({ title: 'Warehouse deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting warehouse',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    warehouses,
    isLoading,
    error,
    createWarehouse: createMutation.mutate,
    createWarehouseAsync: createMutation.mutateAsync,
    updateWarehouse: updateMutation.mutate,
    updateWarehouseAsync: updateMutation.mutateAsync,
    deleteWarehouse: deleteMutation.mutate,
    deleteWarehouseAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
