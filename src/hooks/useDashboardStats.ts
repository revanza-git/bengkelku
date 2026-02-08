import { useQuery } from "@tanstack/react-query";
import {
  cashflowApi,
  inventoryApi,
  invoicesApi,
  itemsApi,
  purchaseOrdersApi,
} from "@/lib/api";

export function useDashboardStats() {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [poCounts, itemsData, inventory, invoices, cashflow] = await Promise.all([
        purchaseOrdersApi.getAll(),
        itemsApi.getAll(),
        inventoryApi.getOnHand(),
        invoicesApi.getAll(),
        cashflowApi.getAll(),
      ]);

      // Calculate low stock: item dengan stok 0 atau < min_stock dianggap low stock
      const lowStockCount = itemsData?.filter((item: any) => {
        if (!item.is_stock) return false;
        const itemInventory = inventory?.filter((inv: any) => inv.item_id === item.id) || [];
        const qty = itemInventory.reduce((sum: number, inv: any) => sum + (Number(inv.qty_onhand) || 0), 0);
        return qty <= 0 || qty < (item.min_stock || 0);
      }).length || 0;

      const pendingInvoices = invoices?.filter(
        (inv: any) => inv.status === "open" || inv.status === "partial"
      ) || [];
      const pendingAmount = pendingInvoices.reduce(
        (sum: number, inv: any) => sum + Number(inv.grand_total || inv.total || 0),
        0
      );

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthCashflow = cashflow?.filter((entry: any) => {
        if (!entry.entry_date) return false;
        return new Date(entry.entry_date) >= startOfMonth;
      }) || [];

      const monthCashIn = monthCashflow
        .filter((cf: any) => cf.type === "cash_in" && cf.status === "paid")
        .reduce((sum: number, cf: any) => sum + Number(cf.amount || 0), 0);

      const monthCashOut = monthCashflow
        .filter((cf: any) => cf.type === "cash_out" && cf.status === "paid")
        .reduce((sum: number, cf: any) => sum + Number(cf.amount || 0), 0);

      const pendingPoCount = poCounts?.filter(
        (po: any) => po.status === "draft" || po.status === "sent"
      ).length || 0;

      const approvedPoCount = poCounts?.filter(
        (po: any) => po.status === "approved"
      ).length || 0;

      return {
        pendingPurchaseOrders: pendingPoCount,
        approvedPurchaseOrders: approvedPoCount,
        lowStockItems: lowStockCount,
        pendingInvoices: {
          amount: pendingAmount,
          count: pendingInvoices.length,
        },
        monthCashIn,
        monthCashOut,
        netCashflow: monthCashIn - monthCashOut,
      };
    },
  });
}
