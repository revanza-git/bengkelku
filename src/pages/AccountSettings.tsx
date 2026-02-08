import { useState } from "react";
import { Settings, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  useAccountSettings,
  useUpsertAccountSetting,
  ACCOUNT_SETTING_LABELS,
  AccountSettingKey,
  getAccountSetting,
} from "@/hooks/useAccountSettings";
import { useChartOfAccounts } from "@/hooks/useChartOfAccounts";

const SETTING_KEYS: AccountSettingKey[] = [
  "inventory_account",
  "ap_account",
  "ar_account",
  "revenue_account",
  "cash_account",
  "cogs_account",
  "vat_out_account",
];

export default function AccountSettings() {
  const { data: settings, isLoading: settingsLoading } = useAccountSettings();
  const { accounts, isLoading: accountsLoading } = useChartOfAccounts();
  const upsertSetting = useUpsertAccountSetting();
  
  const [pendingChanges, setPendingChanges] = useState<Record<AccountSettingKey, string>>({} as Record<AccountSettingKey, string>);

  const isLoading = settingsLoading || accountsLoading;

  const handleChange = (key: AccountSettingKey, value: string) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async (key: AccountSettingKey) => {
    const value = pendingChanges[key];
    if (!value) return;
    
    await upsertSetting.mutateAsync({ settingKey: key, glAccountId: value });
    setPendingChanges(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSaveAll = async () => {
    for (const key of Object.keys(pendingChanges) as AccountSettingKey[]) {
      await upsertSetting.mutateAsync({ 
        settingKey: key, 
        glAccountId: pendingChanges[key] 
      });
    }
    setPendingChanges({} as Record<AccountSettingKey, string>);
  };

  const getCurrentValue = (key: AccountSettingKey): string => {
    if (pendingChanges[key]) return pendingChanges[key];
    return getAccountSetting(settings, key) || "";
  };

  const getAccountInfo = (key: AccountSettingKey) => {
    const accountId = getAccountSetting(settings, key);
    if (!accountId) return null;
    return accounts?.find(a => a.id === accountId);
  };

  const configuredCount = settings?.length || 0;
  const totalCount = SETTING_KEYS.length;
  const isFullyConfigured = configuredCount >= totalCount;

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "asset": return "bg-blue-100 text-blue-800";
      case "liability": return "bg-orange-100 text-orange-800";
      case "equity": return "bg-purple-100 text-purple-800";
      case "revenue": return "bg-green-100 text-green-800";
      case "expense": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pengaturan Akun</h1>
          <p className="text-muted-foreground">
            Atur akun default untuk journal entries otomatis
          </p>
        </div>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={handleSaveAll} disabled={upsertSetting.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Simpan Semua ({Object.keys(pendingChanges).length})
          </Button>
        )}
      </div>

      {!isLoading && !isFullyConfigured && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Konfigurasi Belum Lengkap</AlertTitle>
          <AlertDescription>
            {configuredCount} dari {totalCount} akun telah dikonfigurasi. 
            Lengkapi semua pengaturan untuk mengaktifkan journal entries otomatis.
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && isFullyConfigured && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Konfigurasi Lengkap</AlertTitle>
          <AlertDescription className="text-green-700">
            Semua akun default telah dikonfigurasi. Journal entries akan dibuat otomatis saat transaksi.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-60" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {SETTING_KEYS.map((key) => {
            const label = ACCOUNT_SETTING_LABELS[key];
            const currentAccount = getAccountInfo(key);
            const hasChanges = !!pendingChanges[key];

            return (
              <Card key={key} className={hasChanges ? "border-primary" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">
                      {label.label}
                    </CardTitle>
                    {currentAccount && (
                      <Badge className={getTypeBadgeColor(currentAccount.type)}>
                        {currentAccount.type}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{label.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor={key}>Pilih Akun GL</Label>
                    <Select
                      value={getCurrentValue(key)}
                      onValueChange={(value) => handleChange(key, value)}
                    >
                      <SelectTrigger id={key}>
                        <SelectValue placeholder="Pilih akun..." />
                      </SelectTrigger>
                      <SelectContent>
                        {accounts?.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <span className="font-mono text-sm">{account.code}</span>
                            <span className="mx-2">-</span>
                            <span>{account.name}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {currentAccount && !hasChanges && (
                    <div className="text-sm text-muted-foreground">
                      Saat ini: <span className="font-mono">{currentAccount.code}</span> - {currentAccount.name}
                    </div>
                  )}

                  {hasChanges && (
                    <Button 
                      size="sm" 
                      onClick={() => handleSave(key)}
                      disabled={upsertSetting.isPending}
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Simpan
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cara Kerja Auto-Journal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📦 Goods Receipt (GRN)</h4>
                <p className="text-muted-foreground mb-2">Saat barang diterima dari supplier:</p>
                <div className="font-mono text-xs space-y-1">
                  <div className="text-green-600">DR: Persediaan</div>
                  <div className="text-red-600">CR: Hutang Usaha</div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">📄 Invoice Dibuat</h4>
                <p className="text-muted-foreground mb-2">Saat invoice penjualan dibuat:</p>
                <div className="font-mono text-xs space-y-1">
                  <div className="text-green-600">DR: Piutang Usaha</div>
                  <div className="text-red-600">CR: Pendapatan</div>
                  <div className="text-red-600">CR: PPN Keluaran (jika ada)</div>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-semibold mb-2">💰 Pembayaran Diterima</h4>
                <p className="text-muted-foreground mb-2">Saat menerima pembayaran dari customer:</p>
                <div className="font-mono text-xs space-y-1">
                  <div className="text-green-600">DR: Kas/Bank</div>
                  <div className="text-red-600">CR: Piutang Usaha</div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
