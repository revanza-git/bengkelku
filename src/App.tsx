import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "./components/Layout";
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import ItemsConnected from "./pages/ItemsConnected";
import InvoicesConnected from "./pages/InvoicesConnected";
import InvoiceDetails from "./pages/InvoiceDetails";
import PurchaseOrders from "./pages/PurchaseOrders";
import PurchaseOrderDetails from "./pages/PurchaseOrderDetails";
import Inventory from "./pages/Inventory";
import Customers from "./pages/Customers";
import Users from "./pages/Users";
import TaxCodes from "./pages/TaxCodes";
import Cashflow from "./pages/Cashflow";
import DeliveryOrders from "./pages/DeliveryOrders";
import Suppliers from "./pages/Suppliers";
import Warehouses from "./pages/Warehouses";
import ChartOfAccounts from "./pages/ChartOfAccounts";
import AccountSettings from "./pages/AccountSettings";
import DeliveryOrderDetails from "./pages/DeliveryOrderDetails";
import CreateDeliveryOrder from "./pages/CreateDeliveryOrder";
import ExpenseTypes from "./pages/ExpenseTypes";
import LowStock from "./pages/LowStock";
import MovementLog from "./pages/MovementLog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/items" element={<ProtectedRoute><Layout><ItemsConnected /></Layout></ProtectedRoute>} />
            <Route path="/invoices" element={<ProtectedRoute><Layout><InvoicesConnected /></Layout></ProtectedRoute>} />
            <Route path="/invoices/:id" element={<ProtectedRoute><Layout><InvoiceDetails /></Layout></ProtectedRoute>} />
            <Route path="/purchase-orders" element={<ProtectedRoute><Layout><PurchaseOrders /></Layout></ProtectedRoute>} />
            <Route path="/receive-stock" element={<ProtectedRoute><Layout><PurchaseOrders /></Layout></ProtectedRoute>} />
            <Route path="/purchase-orders/:id" element={<ProtectedRoute><Layout><PurchaseOrderDetails /></Layout></ProtectedRoute>} />
            <Route path="/inventory" element={<ProtectedRoute><Layout><Inventory /></Layout></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><Layout><LowStock /></Layout></ProtectedRoute>} />
            <Route path="/reports/low-stock" element={<ProtectedRoute><Layout><LowStock /></Layout></ProtectedRoute>} />
            <Route path="/reports/movements" element={<ProtectedRoute><Layout><MovementLog /></Layout></ProtectedRoute>} />
            <Route path="/customers" element={<ProtectedRoute><Layout><Customers /></Layout></ProtectedRoute>} />
            <Route path="/tax-codes" element={<ProtectedRoute><Layout><TaxCodes /></Layout></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><Layout><Users /></Layout></ProtectedRoute>} />
            <Route path="/cashflow" element={<ProtectedRoute><Layout><Cashflow /></Layout></ProtectedRoute>} />
            <Route path="/delivery-orders" element={<ProtectedRoute><Layout><DeliveryOrders /></Layout></ProtectedRoute>} />
            <Route path="/delivery-orders/new" element={<ProtectedRoute><Layout><CreateDeliveryOrder /></Layout></ProtectedRoute>} />
            <Route path="/delivery-orders/:id" element={<ProtectedRoute><Layout><DeliveryOrderDetails /></Layout></ProtectedRoute>} />
            <Route path="/suppliers" element={<ProtectedRoute><Layout><Suppliers /></Layout></ProtectedRoute>} />
            <Route path="/warehouses" element={<ProtectedRoute><Layout><Warehouses /></Layout></ProtectedRoute>} />
            <Route path="/coa" element={<ProtectedRoute><Layout><ChartOfAccounts /></Layout></ProtectedRoute>} />
            <Route path="/account-settings" element={<ProtectedRoute><Layout><AccountSettings /></Layout></ProtectedRoute>} />
            <Route path="/expense-types" element={<ProtectedRoute><Layout><ExpenseTypes /></Layout></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
