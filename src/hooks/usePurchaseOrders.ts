import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { purchaseOrdersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface PoLine {
  id: string;
  item_id: string;
  qty: number;
  unit_cost: number;
  items?: any;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  customer_id?: string;
  status: string;
  eta_date?: string;
  planned_delivery_start?: string;
  actual_delivery_date?: string;
  currency: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  org_id: string;
  suppliers?: any;
  customers?: any;
  po_lines?: PoLine[];
  delivery_orders?: any[];
  invoices?: any[];
}

export function usePurchaseOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: purchaseOrders = [], isLoading, error } = useQuery({
    queryKey: ['purchase-orders'],
    queryFn: () => purchaseOrdersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => purchaseOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating Purchase Order',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<PurchaseOrder> & { id: string }) =>
      purchaseOrdersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating Purchase Order',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      purchaseOrdersApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order status updated' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating status',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const reserveMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.reserve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Stock reserved successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error reserving stock',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => purchaseOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Purchase Order deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting Purchase Order',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    data: purchaseOrders,
    purchaseOrders,
    isLoading,
    error,
    createPurchaseOrder: createMutation.mutate,
    createPurchaseOrderAsync: createMutation.mutateAsync,
    updatePurchaseOrder: updateMutation.mutate,
    updatePurchaseOrderAsync: updateMutation.mutateAsync,
    updateStatus: updateStatusMutation.mutate,
    updateStatusAsync: updateStatusMutation.mutateAsync,
    reserveStock: reserveMutation.mutate,
    reserveStockAsync: reserveMutation.mutateAsync,
    deletePurchaseOrder: deleteMutation.mutate,
    deletePurchaseOrderAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function usePurchaseOrder(id: string) {
  return useQuery({
    queryKey: ['purchase-orders', id],
    queryFn: () => purchaseOrdersApi.getOne(id),
    enabled: !!id,
  });
}

export const usePurchaseOrderDetails = (id: string) => usePurchaseOrder(id);

export const usePurchaseOrderLines = (id: string) =>
  useQuery({
    queryKey: ['purchase-orders', id, 'lines'],
    queryFn: async () => {
      const order = await purchaseOrdersApi.getOne(id);
      return order?.po_lines ?? [];
    },
    enabled: !!id,
  });
