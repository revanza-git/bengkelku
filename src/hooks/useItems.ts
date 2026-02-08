import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi, itemsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Item {
  id: string;
  sku: string;
  name: string;
  uom: string;
  base_cost: number;
  sale_price?: number;
  is_stock: boolean;
  min_stock?: number;
  reorder_point?: number;
  tax_code_id?: string | null;
  created_at: string;
  org_id: string;
}

export function useItems() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: () => itemsApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (newItem: Partial<Item>) => itemsApi.create(newItem),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: 'Item created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating item',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<Item> & { id: string }) =>
      itemsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: 'Item updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating item',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => itemsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: 'Item deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting item',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    data: items,
    items,
    isLoading,
    error,
    createItem: createMutation.mutate,
    createItemAsync: createMutation.mutateAsync,
    updateItem: updateMutation.mutate,
    updateItemAsync: updateMutation.mutateAsync,
    deleteItem: deleteMutation.mutate,
    deleteItemAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useItem(id: string) {
  return useQuery({
    queryKey: ['items', id],
    queryFn: () => itemsApi.getOne(id),
    enabled: !!id,
  });
}

export const useInventoryOnHand = () =>
  useQuery({
    queryKey: ['items', 'inventory-onhand'],
    queryFn: () => inventoryApi.getOnHand(),
  });

export function useLowStockItems() {
  return useQuery({
    queryKey: ['items', 'low-stock'],
    queryFn: () => itemsApi.getLowStock(),
  });
}

export function useImportItemsCsv() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (file: File) => itemsApi.importCsv(file),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', 'low-stock'] });
      toast({
        title: 'Import completed',
        description: `Created ${result.created}, updated ${result.updated}, skipped ${result.skipped}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Import failed',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

export const useDeleteItem = () => {
  const { deleteItem, deleteItemAsync } = useItems();
  return { mutate: deleteItem, mutateAsync: deleteItemAsync };
};
