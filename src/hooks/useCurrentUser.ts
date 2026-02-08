import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

export function useCurrentUser() {
  return useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const profile = await authApi.getProfile();
      return profile || null;
    },
  });
}
