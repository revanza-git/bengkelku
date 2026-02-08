import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reservationsApi } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

export interface Reservation {
  id: string;
  doc_type: string;
  doc_id: string;
  item_id: string;
  warehouse_id: string;
  qty: number;
  status: string;
  created_at: string;
  org_id: string;
  items?: any;
  warehouses?: any;
}

export function useReservations(docType?: string, docId?: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: reservations = [], isLoading, error } = useQuery({
    queryKey: ['reservations', docType, docId],
    queryFn: () => reservationsApi.getAll(),
  });

  const reserveMutation = useMutation({
    mutationFn: (data: { doc_type: string; doc_id: string; items: any[] }) =>
      reservationsApi.reserveStock(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
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
    mutationFn: (id: string) => reservationsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reservations'] });
      queryClient.invalidateQueries({ queryKey: ['items'] });
      toast({ title: 'Reservation released' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error releasing reservation',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    reservations,
    isLoading,
    error,
    reserveStock: reserveMutation.mutate,
    releaseReservation: deleteMutation.mutate,
    isReserving: reserveMutation.isPending,
    isReleasing: deleteMutation.isPending,
  };
}
