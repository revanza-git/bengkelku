import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { accountSettingsApi, authApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

// Setting keys for account mapping
export type AccountSettingKey = 
  | "inventory_account"    // Persediaan - debit saat barang masuk
  | "ap_account"           // Hutang Usaha - credit saat barang masuk
  | "ar_account"           // Piutang Usaha - debit saat invoice dibuat
  | "revenue_account"      // Pendapatan - credit saat invoice dibuat
  | "cash_account"         // Kas/Bank - untuk pembayaran
  | "cogs_account"         // Harga Pokok Penjualan - untuk delivery
  | "vat_out_account";     // PPN Keluaran - pajak keluar

export interface AccountSetting {
  id: string;
  org_id: string;
  setting_key: AccountSettingKey;
  gl_account_id: string;
  created_at: string;
  updated_at: string;
  gl_account?: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export const ACCOUNT_SETTING_LABELS: Record<AccountSettingKey, { label: string; description: string }> = {
  inventory_account: {
    label: "Akun Persediaan",
    description: "Debit saat barang diterima (GRN)"
  },
  ap_account: {
    label: "Akun Hutang Usaha",
    description: "Credit saat barang diterima (GRN)"
  },
  ar_account: {
    label: "Akun Piutang Usaha",
    description: "Debit saat invoice dibuat"
  },
  revenue_account: {
    label: "Akun Pendapatan",
    description: "Credit saat invoice dibuat"
  },
  cash_account: {
    label: "Akun Kas/Bank",
    description: "Untuk transaksi pembayaran masuk/keluar"
  },
  cogs_account: {
    label: "Akun HPP (Harga Pokok Penjualan)",
    description: "Debit saat barang dikirim/dijual"
  },
  vat_out_account: {
    label: "Akun PPN Keluaran",
    description: "Credit untuk pajak pada penjualan"
  },
};

export function useAccountSettings() {
  return useQuery({
    queryKey: ["account-settings"],
    queryFn: async () => {
      const data = await accountSettingsApi.get();
      return data as AccountSetting[];
    },
  });
}

export function useAccountSettingByKey(key: AccountSettingKey) {
  const { data: settings } = useAccountSettings();
  return settings?.find(s => s.setting_key === key);
}

export function useUpsertAccountSetting() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ 
      settingKey, 
      glAccountId 
    }: { 
      settingKey: AccountSettingKey; 
      glAccountId: string;
    }) => {
      await authApi.getProfile();
      return accountSettingsApi.update(settingKey, glAccountId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-settings"] });
      toast({
        title: "Berhasil",
        description: "Pengaturan akun berhasil disimpan",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

// Helper to get account setting from array
export function getAccountSetting(
  settings: AccountSetting[] | undefined, 
  key: AccountSettingKey
): string | null {
  const setting = settings?.find(s => s.setting_key === key);
  return setting?.gl_account_id || null;
}
