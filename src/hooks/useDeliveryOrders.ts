import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { deliveryOrdersApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface DeliveryOrderLine {
  id: string;
  delivery_order_id: string;
  po_line_id?: string;
  item_id: string;
  qty_ordered: number;
  qty_delivered: number;
  warehouse_id: string;
  items?: any;
  warehouses?: any;
}

export interface DeliveryOrder {
  id: string;
  delivery_number: string;
  purchase_order_id: string;
  customer_id?: string;
  status: string;
  delivery_date: string;
  actual_delivery_date?: string;
  notes?: string;
  created_by: string;
  created_at: string;
  org_id: string;
  purchase_orders?: any;
  customers?: any;
  delivery_order_lines?: DeliveryOrderLine[];
  delivery_expenses?: any[];
}

export function useDeliveryOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: deliveryOrders = [], isLoading, error } = useQuery({
    queryKey: ['delivery-orders'],
    queryFn: () => deliveryOrdersApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => deliveryOrdersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      toast({ title: 'Issue request created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating issue request',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<DeliveryOrder> & { id: string }) =>
      deliveryOrdersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      toast({ title: 'Issue request updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating issue request',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const processMutation = useMutation({
    mutationFn: ({ id, actualDeliveryDate }: { id: string; actualDeliveryDate: string }) =>
      deliveryOrdersApi.process(id, actualDeliveryDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      toast({ title: 'Parts consumed successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error processing delivery',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deliveryOrdersApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['delivery-orders'] });
      toast({ title: 'Issue request deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting issue request',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    data: deliveryOrders,
    deliveryOrders,
    isLoading,
    error,
    createDeliveryOrder: createMutation.mutate,
    createDeliveryOrderAsync: createMutation.mutateAsync,
    updateDeliveryOrder: updateMutation.mutate,
    updateDeliveryOrderAsync: updateMutation.mutateAsync,
    processDelivery: processMutation.mutate,
    processDeliveryAsync: processMutation.mutateAsync,
    deleteDeliveryOrder: deleteMutation.mutate,
    deleteDeliveryOrderAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isProcessing: processMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useDeliveryOrder(id: string) {
  return useQuery({
    queryKey: ['delivery-orders', id],
    queryFn: () => deliveryOrdersApi.getOne(id),
    enabled: !!id,
  });
}

export const useCreateDeliveryOrder = () => {
  const { createDeliveryOrder, createDeliveryOrderAsync, isCreating } = useDeliveryOrders();
  return { mutate: createDeliveryOrder, mutateAsync: createDeliveryOrderAsync, isPending: isCreating };
};

export const useUpdateDeliveryOrder = () => {
  const { updateDeliveryOrder, updateDeliveryOrderAsync, isUpdating } = useDeliveryOrders();
  return { mutate: updateDeliveryOrder, mutateAsync: updateDeliveryOrderAsync, isPending: isUpdating };
};

export const useDeliveryOrderDetails = (id: string) => useDeliveryOrder(id);

export const useDeliveryOrderLines = (id: string) =>
  useQuery({
    queryKey: ['delivery-orders', id, 'lines'],
    queryFn: async () => {
      const order = await deliveryOrdersApi.getOne(id);
      return order?.delivery_order_lines ?? [];
    },
    enabled: !!id,
  });

export const useUpdateDeliveryOrderStatus = () => {
  const { processDelivery, processDeliveryAsync, isProcessing } = useDeliveryOrders();
  return { mutate: processDelivery, mutateAsync: processDeliveryAsync, isPending: isProcessing };
};

export const useDeleteDeliveryOrder = () => {
  const { deleteDeliveryOrder, deleteDeliveryOrderAsync, isDeleting } = useDeliveryOrders();
  return { mutate: deleteDeliveryOrder, mutateAsync: deleteDeliveryOrderAsync, isPending: isDeleting };
};

export const useDeliveryOrdersByPO = (purchaseOrderId: string) =>
  useQuery({
    queryKey: ['delivery-orders', 'purchase-order', purchaseOrderId],
    queryFn: async () => {
      const orders = await deliveryOrdersApi.getAll();
      return orders.filter((order: any) => order.purchase_order_id === purchaseOrderId);
    },
    enabled: !!purchaseOrderId,
  });
