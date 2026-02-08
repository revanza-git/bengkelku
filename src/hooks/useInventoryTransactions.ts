import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryTransactionsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface InventoryTransaction {
  id: string;
  item_id: string;
  warehouse_id: string;
  trx_type: 'GRN' | 'SHIP_PO' | 'ADJ+' | 'ADJ-' | 'TRANSFER';
  ref_table?: string;
  ref_id?: string;
  qty: number;
  unit_cost: number;
  created_at: string;
  org_id: string;
  items?: any;
  warehouses?: any;
}

export function useInventoryTransactions(
  filtersOrStartDate?:
    | {
        item_id?: string;
        warehouse_id?: string;
        trx_type?: string;
        date_from?: string;
        date_to?: string;
      }
    | string,
  endDate?: string,
) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const filters =
    typeof filtersOrStartDate === "string"
      ? { date_from: filtersOrStartDate, date_to: endDate }
      : filtersOrStartDate;

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ['inventory-transactions', filters],
    queryFn: () => inventoryTransactionsApi.getAll(filters),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<InventoryTransaction>) => 
      inventoryTransactionsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: 'Transaction recorded successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording transaction',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    transactions,
    isLoading,
    error,
    createTransaction: createMutation.mutate,
    isCreating: createMutation.isPending,
  };
}

export function useItemStock(itemId: string, warehouseId?: string) {
  return useQuery({
    queryKey: ['item-stock', itemId, warehouseId],
    queryFn: async () => {
      const transactions = await inventoryTransactionsApi.getAll({
        item_id: itemId,
        warehouse_id: warehouseId,
      });
      // Calculate total stock
      const totalStock = transactions.reduce(
        (sum: number, t: InventoryTransaction) => sum + Number(t.qty),
        0
      );
      return totalStock;
    },
    enabled: !!itemId,
  });
}
