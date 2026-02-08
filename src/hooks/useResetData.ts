import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export function useResetData() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      return dataApi.reset();
    },
    onSuccess: () => {
      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();
      
      toast({
        title: "Data Reset Berhasil",
        description: "Semua data transaksional telah dihapus. Master data tetap terjaga.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Reset Gagal",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
