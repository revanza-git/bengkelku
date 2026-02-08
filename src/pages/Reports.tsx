import { useState } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfDay, endOfDay } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";
import {
  TrendingUp, TrendingDown, DollarSign, Wallet, FileText,
  Download, RotateCcw, FileSpreadsheet, ArrowUpCircle, ArrowDownCircle,
  Scale, Receipt
} from "lucide-react";
import * as XLSX from 'xlsx';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DateRangePicker } from "@/components/DateRangePicker";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

import {
  useCashflowReport,
  useBalanceSheet,
  useIncomeStatement,
  useNetProfitReport,
} from "@/hooks/useReports";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

export default function Reports() {
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(subMonths(new Date(), 2)),
    to: endOfMonth(new Date()),
  });
  const { toast } = useToast();

  const handleResetDateRange = () => {
    setDate({
      from: startOfMonth(subMonths(new Date(), 2)),
      to: endOfMonth(new Date()),
    });
  };

  const startDate = date?.from ? startOfDay(date.from) : startOfMonth(subMonths(new Date(), 2));
  const endDate = date?.to ? endOfDay(date.to) : endOfMonth(new Date());

  const { data: cashflowData, isLoading: cashflowLoading } = useCashflowReport(startDate, endDate);
  const { data: balanceData, isLoading: balanceLoading } = useBalanceSheet(endDate);
  const { data: incomeData, isLoading: incomeLoading } = useIncomeStatement(startDate, endDate);
  const { data: profitData, isLoading: profitLoading } = useNetProfitReport(startDate, endDate);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const handleExportExcel = (reportType: string) => {
    const wb = XLSX.utils.book_new();
    const dateStr = `${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}`;
    let filename = "";

    switch (reportType) {
      case "cashflow":
        if (!cashflowData) return;
        filename = `laporan-cashflow-${dateStr}.xlsx`;
        
        const cfSummary = [
          ['Laporan Cashflow'],
          ['Periode', `${format(startDate, 'dd MMM yyyy', { locale: idLocale })} - ${format(endDate, 'dd MMM yyyy', { locale: idLocale })}`],
          [],
          ['Metrik', 'Nilai'],
          ['Total Cash In', cashflowData.totalCashIn],
          ['Total Cash Out', cashflowData.totalCashOut],
          ['Net Cashflow', cashflowData.netCashflow],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(cfSummary), 'Ringkasan');
        
        const cfMonthly = cashflowData.byMonth.map(m => ({
          'Bulan': m.month,
          'Cash In': m.cashIn,
          'Cash Out': m.cashOut,
          'Net': m.net,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cfMonthly), 'Per Bulan');
        break;

      case "neraca":
        if (!balanceData) return;
        filename = `neraca-${format(endDate, 'yyyy-MM-dd')}.xlsx`;
        
        const bsAssets = balanceData.assets.map(a => ({
          'Kode': a.code,
          'Nama Akun': a.name,
          'Saldo': a.balance,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bsAssets), 'Aset');
        
        const bsLiabilities = balanceData.liabilities.map(a => ({
          'Kode': a.code,
          'Nama Akun': a.name,
          'Saldo': a.balance,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bsLiabilities), 'Kewajiban');
        break;

      case "labarugi":
        if (!incomeData) return;
        filename = `laba-rugi-${dateStr}.xlsx`;
        
        const isSummary = [
          ['Laporan Laba Rugi'],
          ['Periode', `${format(startDate, 'dd MMM yyyy', { locale: idLocale })} - ${format(endDate, 'dd MMM yyyy', { locale: idLocale })}`],
          [],
          ['Pendapatan', incomeData.totalRevenue],
          ['HPP (Harga Pokok Penjualan)', incomeData.costOfGoods],
          ['Laba Kotor', incomeData.grossProfit],
          ['Margin Laba Kotor (%)', `${incomeData.grossProfitMargin.toFixed(1)}%`],
          [],
          ['Beban Operasional', incomeData.totalOperatingExpenses],
          ['Laba Operasional', incomeData.operatingIncome],
          ['Margin Operasional (%)', `${incomeData.operatingMargin.toFixed(1)}%`],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(isSummary), 'Ringkasan');
        break;

      case "lababersih":
        if (!profitData) return;
        filename = `laba-bersih-${dateStr}.xlsx`;
        
        const npSummary = [
          ['Laporan Laba Bersih'],
          ['Periode', `${format(startDate, 'dd MMM yyyy', { locale: idLocale })} - ${format(endDate, 'dd MMM yyyy', { locale: idLocale })}`],
          [],
          ['Total Pemasukan', profitData.totalCashIn],
          ['Total Pengeluaran', profitData.totalCashOut],
          ['Laba Bersih', profitData.netProfit],
          ['Margin Laba (%)', `${profitData.profitMargin.toFixed(1)}%`],
        ];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(npSummary), 'Ringkasan');
        
        const npMonthly = profitData.monthlyData.map(m => ({
          'Bulan': m.month,
          'Pendapatan': m.revenue,
          'Cash In Lainnya': m.cashIn,
          'Cash Out': m.cashOut,
          'Laba Bersih': m.netProfit,
        }));
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(npMonthly), 'Per Bulan');
        break;
    }

    if (filename) {
      XLSX.writeFile(wb, filename);
      toast({
        title: "Berhasil",
        description: "Laporan berhasil diekspor",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Laporan Keuangan</h1>
          <p className="text-muted-foreground">Laporan Cashflow, Neraca, Laba Rugi, dan Laba Bersih</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker date={date} onDateChange={setDate} />
          <Button variant="outline" size="icon" onClick={handleResetDateRange} title="Reset ke default (3 bulan terakhir)">
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Tabs defaultValue="cashflow" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="cashflow">
            <Wallet className="h-4 w-4 mr-2" />
            Cashflow
          </TabsTrigger>
          <TabsTrigger value="neraca">
            <Scale className="h-4 w-4 mr-2" />
            Neraca
          </TabsTrigger>
          <TabsTrigger value="labarugi">
            <Receipt className="h-4 w-4 mr-2" />
            Laba Rugi
          </TabsTrigger>
          <TabsTrigger value="lababersih">
            <DollarSign className="h-4 w-4 mr-2" />
            Laba Bersih
          </TabsTrigger>
        </TabsList>

        {/* Cashflow Report */}
        <TabsContent value="cashflow" className="space-y-6">
          {cashflowLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ArrowUpCircle className="h-4 w-4 text-green-600" />
                      Total Cash In
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashflowData?.totalCashIn || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ArrowDownCircle className="h-4 w-4 text-red-600" />
                      Total Cash Out
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {formatCurrency(cashflowData?.totalCashOut || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Net Cashflow</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(cashflowData?.netCashflow || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(cashflowData?.netCashflow || 0)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">Planned: {formatCurrency(cashflowData?.plannedTotal || 0)}</Badge>
                    </div>
                    <div className="mt-1">
                      <Badge className="bg-green-600">Paid: {formatCurrency(cashflowData?.paidTotal || 0)}</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Cashflow per Bulan</CardTitle>
                    <CardDescription>Perbandingan cash in dan cash out</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel("cashflow")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={cashflowData?.byMonth || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="cashIn" name="Cash In" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="cashOut" name="Cash Out" fill="hsl(var(--chart-1))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* By Category */}
              <Card>
                <CardHeader>
                  <CardTitle>Cashflow per Kategori</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kategori</TableHead>
                        <TableHead className="text-right">Cash In</TableHead>
                        <TableHead className="text-right">Cash Out</TableHead>
                        <TableHead className="text-right">Net</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cashflowData?.byCategory.map((cat) => (
                        <TableRow key={cat.category}>
                          <TableCell className="font-medium">{cat.category}</TableCell>
                          <TableCell className="text-right text-green-600">{formatCurrency(cat.cashIn)}</TableCell>
                          <TableCell className="text-right text-red-600">{formatCurrency(cat.cashOut)}</TableCell>
                          <TableCell className={`text-right font-medium ${cat.cashIn - cat.cashOut >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(cat.cashIn - cat.cashOut)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Balance Sheet (Neraca) */}
        <TabsContent value="neraca" className="space-y-6">
          {balanceLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          ) : balanceData?.isEmpty ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Scale className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Chart of Accounts Kosong</h3>
                <p className="text-muted-foreground mb-4">
                  Silakan atur Chart of Accounts terlebih dahulu untuk melihat laporan Neraca.
                </p>
                <Button variant="outline" asChild>
                  <a href="/coa">Atur Chart of Accounts</a>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Balance Warning */}
              {!balanceData?.isBalanced && (
                <Card className="border-destructive bg-destructive/10">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-3">
                      <Scale className="h-5 w-5 text-destructive" />
                      <div>
                        <p className="font-semibold text-destructive">Neraca Tidak Seimbang</p>
                        <p className="text-sm text-muted-foreground">
                          Selisih: {formatCurrency(Math.abs(balanceData?.difference || 0))} — 
                          Aset ({formatCurrency(balanceData?.totalAssets || 0)}) ≠ 
                          Kewajiban + Ekuitas ({formatCurrency((balanceData?.totalLiabilities || 0) + (balanceData?.totalEquity || 0))})
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Aset</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(balanceData?.totalAssets || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Kewajiban</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(balanceData?.totalLiabilities || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Ekuitas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(balanceData?.totalEquity || 0)}</div>
                  </CardContent>
                </Card>
                <Card className={balanceData?.isBalanced ? "border-green-500 bg-green-500/10" : "border-destructive bg-destructive/10"}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status Neraca</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {balanceData?.isBalanced ? (
                      <Badge className="bg-green-600">Seimbang</Badge>
                    ) : (
                      <Badge variant="destructive">Tidak Seimbang</Badge>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Aset = Kewajiban + Ekuitas
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Assets */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Aset</CardTitle>
                      <CardDescription>Per tanggal {format(endDate, 'dd MMM yyyy', { locale: idLocale })}</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportExcel("neraca")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Nama Akun</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {balanceData?.assets.map((asset, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{asset.code}</TableCell>
                            <TableCell>{asset.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(asset.balance)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={2}>Total Aset</TableCell>
                          <TableCell className="text-right">{formatCurrency(balanceData?.totalAssets || 0)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Liabilities & Equity */}
                <Card>
                  <CardHeader>
                    <CardTitle>Kewajiban & Ekuitas</CardTitle>
                    <CardDescription>Per tanggal {format(endDate, 'dd MMM yyyy', { locale: idLocale })}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kode</TableHead>
                          <TableHead>Nama Akun</TableHead>
                          <TableHead className="text-right">Saldo</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {/* Liabilities Section */}
                        {balanceData?.liabilities.length > 0 && (
                          <TableRow className="bg-muted/30">
                            <TableCell colSpan={3} className="font-semibold text-muted-foreground">Kewajiban</TableCell>
                          </TableRow>
                        )}
                        {balanceData?.liabilities.map((liability, idx) => (
                          <TableRow key={`l-${idx}`}>
                            <TableCell className="font-medium">{liability.code}</TableCell>
                            <TableCell>{liability.name}</TableCell>
                            <TableCell className="text-right">{formatCurrency(liability.balance)}</TableCell>
                          </TableRow>
                        ))}
                        {balanceData?.liabilities.length > 0 && (
                          <TableRow className="font-bold bg-muted/50">
                            <TableCell colSpan={2}>Total Kewajiban</TableCell>
                            <TableCell className="text-right">{formatCurrency(balanceData?.totalLiabilities || 0)}</TableCell>
                          </TableRow>
                        )}
                        
                        {/* Equity Section */}
                        <TableRow className="bg-muted/30">
                          <TableCell colSpan={3} className="font-semibold text-muted-foreground">Ekuitas</TableCell>
                        </TableRow>
                        {balanceData?.equity.map((eq, idx) => (
                          <TableRow key={`e-${idx}`} className={eq.name === 'Laba Ditahan (Periode Berjalan)' ? 'bg-primary/5' : ''}>
                            <TableCell className="font-medium">{eq.code}</TableCell>
                            <TableCell>{eq.name}</TableCell>
                            <TableCell className={`text-right ${eq.balance < 0 ? 'text-destructive' : ''}`}>
                              {formatCurrency(eq.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell colSpan={2}>Total Ekuitas</TableCell>
                          <TableCell className="text-right">{formatCurrency(balanceData?.totalEquity || 0)}</TableCell>
                        </TableRow>

                        {/* Grand Total */}
                        <TableRow className="font-bold bg-primary/10">
                          <TableCell colSpan={2}>Total Kewajiban + Ekuitas</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((balanceData?.totalLiabilities || 0) + (balanceData?.totalEquity || 0))}
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* Income Statement (Laba Rugi) */}
        <TabsContent value="labarugi" className="space-y-6">
          {incomeLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Pendapatan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(incomeData?.totalRevenue || 0)}</div>
                    <p className="text-xs text-muted-foreground">Dari jurnal akuntansi</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">HPP</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{formatCurrency(incomeData?.costOfGoods || 0)}</div>
                    <p className="text-xs text-muted-foreground">Harga Pokok Penjualan</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Laba Kotor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(incomeData?.grossProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(incomeData?.grossProfit || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Margin: {incomeData?.grossProfitMargin.toFixed(1)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Laba Operasional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${(incomeData?.operatingIncome || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(incomeData?.operatingIncome || 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Margin: {incomeData?.operatingMargin.toFixed(1)}%</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Income Statement Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Laporan Laba Rugi</CardTitle>
                      <CardDescription>
                        {format(startDate, 'dd MMM yyyy', { locale: idLocale })} - {format(endDate, 'dd MMM yyyy', { locale: idLocale })}
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleExportExcel("labarugi")}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between py-2 border-b">
                        <span className="font-medium">Pendapatan</span>
                        <span>{formatCurrency(incomeData?.totalRevenue || 0)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b text-orange-600">
                        <span>(-) Harga Pokok Penjualan (HPP)</span>
                        <span>{formatCurrency(incomeData?.costOfGoods || 0)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b font-bold">
                        <span>Laba Kotor</span>
                        <span className={incomeData?.grossProfit || 0 >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(incomeData?.grossProfit || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between py-2 border-b text-orange-600">
                        <span>(-) Beban Operasional</span>
                        <span>{formatCurrency(incomeData?.totalOperatingExpenses || 0)}</span>
                      </div>
                      <div className="flex justify-between py-2 font-bold text-lg">
                        <span>Laba Operasional</span>
                        <span className={incomeData?.operatingIncome || 0 >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {formatCurrency(incomeData?.operatingIncome || 0)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Revenue by Month Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Pendapatan per Bulan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={incomeData?.revenueByMonth || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                        <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="hsl(var(--primary))" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Operating Expenses */}
              {incomeData?.operatingExpenses && incomeData.operatingExpenses.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Rincian Beban Operasional</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategori</TableHead>
                          <TableHead className="text-right">Jumlah</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {incomeData.operatingExpenses.map((exp) => (
                          <TableRow key={exp.category}>
                            <TableCell>{exp.category}</TableCell>
                            <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                          </TableRow>
                        ))}
                        <TableRow className="font-bold bg-muted/50">
                          <TableCell>Total Beban Operasional</TableCell>
                          <TableCell className="text-right">{formatCurrency(incomeData.totalOperatingExpenses)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Net Profit (Laba Bersih) */}
        <TabsContent value="lababersih" className="space-y-6">
          {profitLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-64" />
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Pemasukan</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(profitData?.totalCashIn || 0)}</div>
                    <p className="text-xs text-muted-foreground">
                      Invoice: {formatCurrency(profitData?.invoiceRevenue || 0)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Total Pengeluaran</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">{formatCurrency(profitData?.totalCashOut || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Laba Bersih</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${profitData?.isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(profitData?.netProfit || 0)}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {profitData?.isProfitable ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        Margin: {profitData?.profitMargin.toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Badge className={profitData?.isProfitable ? 'bg-green-600' : 'bg-red-600'}>
                      {profitData?.isProfitable ? 'Profit' : 'Rugi'}
                    </Badge>
                  </CardContent>
                </Card>
              </div>

              {/* Monthly Profit Chart */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Laba Bersih per Bulan</CardTitle>
                    <CardDescription>Trend laba bersih bulanan</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => handleExportExcel("lababersih")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={profitData?.monthlyData || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Legend />
                      <Bar dataKey="revenue" name="Pendapatan" fill="hsl(var(--chart-2))" />
                      <Bar dataKey="cashOut" name="Pengeluaran" fill="hsl(var(--chart-1))" />
                      <Bar dataKey="netProfit" name="Laba Bersih" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              {profitData?.expenseBreakdown && profitData.expenseBreakdown.length > 0 && (
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Rincian Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Kategori</TableHead>
                            <TableHead className="text-right">Jumlah</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {profitData.expenseBreakdown.map((exp) => (
                            <TableRow key={exp.category}>
                              <TableCell>{exp.category}</TableCell>
                              <TableCell className="text-right">{formatCurrency(exp.amount)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Distribusi Pengeluaran</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <PieChart>
                          <Pie
                            data={profitData.expenseBreakdown}
                            dataKey="amount"
                            nameKey="category"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ category, percent }) => `${category}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {profitData.expenseBreakdown.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
