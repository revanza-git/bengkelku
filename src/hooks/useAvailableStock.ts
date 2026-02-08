import { useQuery } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api";

interface AvailableStock {
  item_id: string;
  warehouse_id: string;
  on_hand: number;
  reserved: number;
  available: number;
}

export function useAvailableStock() {
  return useQuery({
    queryKey: ["available-stock"],
    queryFn: async () => {
      const data = await inventoryApi.getAvailableStockSummary();
      return (data || []) as AvailableStock[];
    },
  });
}

export function getAvailableQty(
  availableStock: AvailableStock[] | undefined,
  itemId: string,
  warehouseId: string
): { onHand: number; reserved: number; available: number } {
  const stock = availableStock?.find(
    (s) => s.item_id === itemId && s.warehouse_id === warehouseId
  );

  return {
    onHand: stock?.on_hand || 0,
    reserved: stock?.reserved || 0,
    available: stock?.available || 0,
  };
}
