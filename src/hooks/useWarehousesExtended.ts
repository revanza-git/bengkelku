import { useWarehouses as useWarehousesApi } from "@/hooks/useWarehouses";

export const useWarehouses = () => useWarehousesApi();

export const useDeleteWarehouse = () => {
  const { deleteWarehouse, deleteWarehouseAsync } = useWarehousesApi();
  return { mutate: deleteWarehouse, mutateAsync: deleteWarehouseAsync };
};
