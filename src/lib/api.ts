import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API base URL - defaults to localhost:3001 for local development
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add JWT token to headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear token and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    const { access_token, user } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },
  
  register: async (email: string, password: string, fullName: string) => {
    const response = await api.post('/auth/register', { 
      email, 
      password, 
      full_name: fullName 
    });
    const { access_token, user } = response.data;
    localStorage.setItem('access_token', access_token);
    localStorage.setItem('user', JSON.stringify(user));
    return response.data;
  },
  
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  },
  
  getProfile: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
  
  isAuthenticated: () => {
    return !!localStorage.getItem('access_token');
  },
  
  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },
};

// Generic CRUD helper
const createCrudApi = <T>(endpoint: string) => ({
  getAll: async (): Promise<T[]> => {
    const response = await api.get(endpoint);
    return response.data;
  },
  
  getOne: async (id: string): Promise<T> => {
    const response = await api.get(`${endpoint}/${id}`);
    return response.data;
  },
  
  create: async (data: Partial<T>): Promise<T> => {
    const response = await api.post(endpoint, data);
    return response.data;
  },
  
  update: async (id: string, data: Partial<T>): Promise<T> => {
    const response = await api.put(`${endpoint}/${id}`, data);
    return response.data;
  },
  
  delete: async (id: string): Promise<void> => {
    await api.delete(`${endpoint}/${id}`);
  },
});

const toDateOrNull = (value?: string) => (value ? new Date(value) : null);

// Entity APIs
export const itemsApi = {
  ...createCrudApi<any>('/items'),

  getLowStock: async () => {
    const response = await api.get('/items/low-stock');
    return response.data;
  },

  exportCsv: async () => {
    const response = await api.get('/items/export/csv', {
      responseType: 'blob',
    });
    return response.data;
  },

  importCsv: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/items/import/csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
export const customersApi = createCrudApi<any>('/customers');
export const suppliersApi = createCrudApi<any>('/suppliers');
export const warehousesApi = createCrudApi<any>('/warehouses');

// Purchase Orders API
export const purchaseOrdersApi = {
  ...createCrudApi<any>('/purchase-orders'),
  
  updateStatus: async (id: string, status: string) => {
    const response = await api.put(`/purchase-orders/${id}/status`, { status });
    return response.data;
  },
  
  reserve: async (id: string) => {
    const response = await api.post(`/purchase-orders/${id}/reserve`);
    return response.data;
  },
};

// Delivery Orders API
export const deliveryOrdersApi = {
  ...createCrudApi<any>('/delivery-orders'),
  
  process: async (id: string, actualDeliveryDate: string) => {
    const response = await api.post(`/delivery-orders/${id}/process`, {
      actual_delivery_date: actualDeliveryDate,
    });
    return response.data;
  },

  exportDocument: async (id: string) => {
    const response = await api.get(`/delivery-orders/${id}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Invoices API
export const invoicesApi = {
  ...createCrudApi<any>('/invoices'),
  
  recalculateTax: async (id: string) => {
    const response = await api.post(`/invoices/${id}/recalculate-tax`);
    return response.data;
  },
  
  generateFromPO: async (poId: string) => {
    const response = await api.post(`/invoices/generate-from-po`, { 
      purchase_order_id: poId 
    });
    return response.data;
  },

  exportDocument: async (id: string) => {
    const response = await api.get(`/invoices/${id}/export`, {
      responseType: 'blob',
    });
    return response.data;
  },

  sendEmail: async (id: string, recipientEmail: string) => {
    const response = await api.post(`/invoices/${id}/send-email`, {
      recipient_email: recipientEmail,
    });
    return response.data;
  },
};

// Payments API
export const paymentsApi = createCrudApi<any>('/payments');

// Inventory Transactions API
export const inventoryTransactionsApi = {
  getAll: async (filters?: {
    item_id?: string;
    warehouse_id?: string;
    trx_type?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const params = filters || {};
    const response = await api.get('/inventory-transactions', { params });
    return response.data;
  },
  
  create: async (data: any) => {
    const response = await api.post('/inventory-transactions', data);
    return response.data;
  },

  getAvailableStock: async () => {
    const response = await api.get('/inventory/available');
    return response.data;
  },
};

// Inventory API
export const inventoryApi = {
  getTransactions: async () => {
    const response = await api.get('/inventory-transactions');
    return response.data;
  },
  
  getOnHand: async () => {
    const response = await api.get('/inventory/on-hand');
    return response.data;
  },
  
  getAvailableStock: async (itemId: string, warehouseId?: string) => {
    const params = warehouseId ? { warehouse_id: warehouseId } : {};
    const response = await api.get(`/inventory/available/${itemId}`, { params });
    return response.data;
  },

  getAvailableStockSummary: async () => {
    const response = await api.get('/inventory/available');
    return response.data;
  },
};

// Reservations API
export const reservationsApi = {
  ...createCrudApi<any>('/reservations'),
  
  reserveStock: async (data: { doc_type: string; doc_id: string; items: any[] }) => {
    const response = await api.post('/reservations/reserve', data);
    return response.data;
  },
};

// Users API
export const usersApi = {
  ...createCrudApi<any>('/users'),
  
  createUser: async (data: any) => {
    const response = await api.post('/users/create', data);
    return response.data;
  },
  
  updatePassword: async (userId: string, newPassword: string) => {
    const response = await api.post('/users/update-password', {
      user_id: userId,
      new_password: newPassword,
    });
    return response.data;
  },
};

// Organizations API
export const organizationsApi = {
  getCurrent: async () => {
    const response = await api.get('/organizations/current');
    return response.data;
  },
};

// Reports API
export const reportsApi = {
  getLowStock: async () => {
    const [itemsRes, onHandRes] = await Promise.all([
      api.get('/items'),
      api.get('/inventory/on-hand'),
    ]);

    const items = itemsRes.data || [];
    const onHand = onHandRes.data || [];

    return items
      .filter((item: any) => item.is_stock)
      .map((item: any) => {
        const qty = onHand
          .filter((row: any) => row.item_id === item.id)
          .reduce((sum: number, row: any) => sum + Number(row.qty_onhand || 0), 0);

        const minStock = Number(item.min_stock || 0);
        const reorderPoint = Number(item.reorder_point || 0);
        const threshold = Math.max(minStock, reorderPoint);

        return {
          id: item.id,
          sku: item.sku,
          name: item.name,
          uom: item.uom,
          current_stock: qty,
          min_stock: minStock,
          reorder_point: reorderPoint,
          threshold,
          shortage: threshold > qty ? threshold - qty : 0,
        };
      })
      .filter((item: any) => item.threshold > 0 && item.current_stock <= item.threshold)
      .sort((a: any, b: any) => a.current_stock - b.current_stock);
  },

  getStockMovements: async (params?: {
    item_id?: string;
    warehouse_id?: string;
    trx_type?: string;
    date_from?: string;
    date_to?: string;
  }) => {
    const legacyParams = {
      item_id: params?.item_id,
      warehouse_id: params?.warehouse_id,
      trx_type: params?.trx_type,
    };

    const legacyResponse = await api.get('/inventory-transactions', { params: legacyParams });
    const rows = legacyResponse.data || [];

    const from = toDateOrNull(params?.date_from);
    const to = toDateOrNull(params?.date_to);

    return rows.filter((row: any) => {
      if (!from && !to) return true;

      const createdAt = row.created_at ? new Date(row.created_at) : null;
      if (!createdAt) return false;
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      return true;
    });
  },

  getInventoryReport: async (startDate?: Date, endDate?: Date) => {
    const params: any = {};
    if (startDate) params.start_date = startDate.toISOString();
    if (endDate) params.end_date = endDate.toISOString();
    const response = await api.get('/reports/inventory', { params });
    return response.data;
  },
  
  getSalesReport: async (startDate?: string, endDate?: string) => {
    const params: any = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const response = await api.get('/reports/sales', { params });
    return response.data;
  },

  getCashflowReport: async (startDate: Date, endDate: Date) => {
    const response = await api.get('/reports/cashflow', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  },

  getBalanceSheet: async (asOfDate: Date) => {
    const response = await api.get('/reports/balance-sheet', {
      params: { as_of: asOfDate.toISOString() },
    });
    return response.data;
  },

  getIncomeStatement: async (startDate: Date, endDate: Date) => {
    const response = await api.get('/reports/income-statement', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  },

  getNetProfitReport: async (startDate: Date, endDate: Date) => {
    const response = await api.get('/reports/net-profit', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  },

  getFinancialReport: async (startDate: Date, endDate: Date) => {
    const response = await api.get('/reports/financial', {
      params: {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
      },
    });
    return response.data;
  },
  
  exportPdf: async (type: string, id?: string) => {
    const response = await api.get(`/reports/pdf/${type}${id ? `/${id}` : ''}`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

// Cashflow API
export const cashflowApi = createCrudApi<any>('/cashflow-entries');

// GL Accounts API
export const glAccountsApi = createCrudApi<any>('/gl-accounts');

// Journal Entries API
export const journalEntriesApi = createCrudApi<any>('/journal-entries');

// Account Settings API
export const accountSettingsApi = {
  get: async () => {
    const response = await api.get('/account-settings');
    return response.data;
  },
  
  update: async (settingKey: string, glAccountId: string) => {
    const response = await api.put('/account-settings', {
      setting_key: settingKey,
      gl_account_id: glAccountId,
    });
    return response.data;
  },
};

// Expense Types API
export const expenseTypesApi = createCrudApi<any>('/expense-types');

// Tax Codes API
export const taxCodesApi = createCrudApi<any>('/tax-codes');

// Data Reset API (admin only)
export const dataApi = {
  reset: async () => {
    const response = await api.post('/data/reset');
    return response.data;
  },
};

export default api;
