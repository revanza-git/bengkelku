import { useQuery } from "@tanstack/react-query";
import { reportsApi } from "@/lib/api";

export function useLowStockReport() {
  return useQuery({
    queryKey: ["reports", "low-stock"],
    queryFn: () => reportsApi.getLowStock(),
    retry: 0,
  });
}

export function useStockMovementsReport(filters?: {
  item_id?: string;
  warehouse_id?: string;
  trx_type?: string;
  date_from?: string;
  date_to?: string;
}) {
  return useQuery({
    queryKey: ["reports", "stock-movements", filters],
    queryFn: () => reportsApi.getStockMovements(filters),
    retry: 0,
  });
}

// Cashflow Report Hook
export function useCashflowReport(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["cashflow-report", startDate, endDate],
    queryFn: async () => {
      const data = await reportsApi.getCashflowReport(startDate, endDate);
      return data;
    },
  });
}

// Balance Sheet (Neraca) Hook
export function useBalanceSheet(asOfDate: Date) {
  return useQuery({
    queryKey: ["balance-sheet", asOfDate],
    queryFn: async () => {
      return reportsApi.getBalanceSheet(asOfDate);
    },
  });
}

// Income Statement (Laba Rugi) Hook
export function useIncomeStatement(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["income-statement", startDate, endDate],
    queryFn: async () => {
      return reportsApi.getIncomeStatement(startDate, endDate);
    },
  });
}

// Net Profit Report Hook
export function useNetProfitReport(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["net-profit-report", startDate, endDate],
    queryFn: async () => {
      return reportsApi.getNetProfitReport(startDate, endDate);
    },
  });
}

// Keep old hooks for backwards compatibility
export function useInventoryReport(startDate?: Date, endDate?: Date) {
  return useQuery({
    queryKey: ["inventory-report", startDate, endDate],
    queryFn: async () => {
      return reportsApi.getInventoryReport(startDate, endDate);
    },
  });
}

export function useFinancialReport(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["financial-report", startDate, endDate],
    queryFn: async () => {
      return reportsApi.getFinancialReport(startDate, endDate);
    },
  });
}

export function useWorkOrderAnalytics(startDate: Date, endDate: Date) {
  return useQuery({
    queryKey: ["work-order-analytics", startDate, endDate],
    queryFn: async () => {
      return {
        totalWorkOrders: 0,
        statusCounts: [],
        completionRate: 0,
        avgCompletionTime: 0,
        techPerformance: [],
        workOrdersByDay: [],
        workOrders: [],
      };
    },
  });
}
