import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxCodesApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface TaxCode {
  id: string;
  code: string;
  rate: number;
  label?: string;
  created_at: string;
  org_id: string;
}

export function useTaxCodes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: taxCodes = [], isLoading, error } = useQuery({
    queryKey: ['tax-codes'],
    queryFn: () => taxCodesApi.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: (data: Partial<TaxCode>) => taxCodesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-codes'] });
      toast({ title: 'Tax code created successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating tax code',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: Partial<TaxCode> & { id: string }) =>
      taxCodesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-codes'] });
      toast({ title: 'Tax code updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating tax code',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => taxCodesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-codes'] });
      toast({ title: 'Tax code deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting tax code',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    taxCodes,
    isLoading,
    error,
    createTaxCode: createMutation.mutate,
    createTaxCodeAsync: createMutation.mutateAsync,
    updateTaxCode: updateMutation.mutate,
    updateTaxCodeAsync: updateMutation.mutateAsync,
    deleteTaxCode: deleteMutation.mutate,
    deleteTaxCodeAsync: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export const useCreateTaxCode = () => {
  const { createTaxCode, createTaxCodeAsync } = useTaxCodes();
  return { mutate: createTaxCode, mutateAsync: createTaxCodeAsync };
};

export const useUpdateTaxCode = () => {
  const { updateTaxCode, updateTaxCodeAsync } = useTaxCodes();
  return { mutate: updateTaxCode, mutateAsync: updateTaxCodeAsync };
};

export const useDeleteTaxCode = () => {
  const { deleteTaxCode, deleteTaxCodeAsync } = useTaxCodes();
  return { mutate: deleteTaxCode, mutateAsync: deleteTaxCodeAsync };
};
