import { useQuery } from "@tanstack/react-query";
import { authApi } from "@/lib/api";

export function useOrganization() {
  return useQuery({
    queryKey: ["organization"],
    queryFn: async () => {
      const profile = await authApi.getProfile();
      if (!profile?.org_id) {
        return null;
      }
      return { id: profile.org_id };
    },
  });
}
