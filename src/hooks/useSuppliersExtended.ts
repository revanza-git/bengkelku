import { useSuppliers as useSuppliersApi } from "@/hooks/useSuppliers";

export const useSuppliers = () => useSuppliersApi();

export const useDeleteSupplier = () => {
  const { deleteSupplier, deleteSupplierAsync } = useSuppliersApi();
  return { mutate: deleteSupplier, mutateAsync: deleteSupplierAsync };
};
