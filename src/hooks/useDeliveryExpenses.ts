import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export interface DeliveryExpense {
  id: string;
  org_id: string;
  delivery_order_id: string;
  expense_type_id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  expense_type?: {
    id: string;
    code: string;
    name: string;
    gl_account_id: string | null;
  } | null;
}

export function useDeliveryExpenses(_deliveryOrderId?: string) {
  return useQuery({
    queryKey: ["delivery-expenses", _deliveryOrderId],
    queryFn: async () => {
      return [] as DeliveryExpense[];
    },
    enabled: !!_deliveryOrderId,
  });
}

export function useDeliveryExpensesByPO(_purchaseOrderId?: string) {
  return useQuery({
    queryKey: ["delivery-expenses-by-po", _purchaseOrderId],
    queryFn: async () => {
      return [] as DeliveryExpense[];
    },
    enabled: !!_purchaseOrderId,
  });
}

export function useCreateDeliveryExpense() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (_data: {
      delivery_order_id: string;
      expense_type_id: string;
      amount: number;
      notes?: string | null;
    }) => {
      throw new Error("Delivery expenses are not available without Supabase");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeleteDeliveryExpense() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (_data: {
      id: string;
      deliveryOrderId: string;
    }) => {
      throw new Error("Delivery expenses are not available without Supabase");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
