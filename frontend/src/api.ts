import {
  Product,
  Dealer,
  Order,
  PaginatedResponse,
  SupplierSyncResult,
  ReorderItem,
  ForecastWeek,
} from './types';

const API_BASE = '/api';

export class ApiService {
  private static async request<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      if (data && data.error) {
        throw data;
      }
      throw {
        error: {
          code: `HTTP_${res.status}`,
          message: data?.message || res.statusText || 'An unexpected error occurred.',
          details: [],
        },
      };
    }

    return data as T;
  }

  // Health
  static async getHealth(): Promise<{ status: string }> {
    return this.request<{ status: string }>('/health/');
  }

  // Products
  static async getProducts(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    category?: string;
    vehicle?: string;
  }): Promise<PaginatedResponse<Product>> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());
    if (params?.search) query.set('search', params.search);
    if (params?.category) query.set('category', params.category);
    if (params?.vehicle) query.set('vehicle', params.vehicle);

    const qs = query.toString();
    return this.request<PaginatedResponse<Product>>(`/products/${qs ? `?${qs}` : ''}`);
  }

  static async getProduct(sku: string): Promise<Product> {
    return this.request<Product>(`/products/${sku}/`);
  }

  static async updateInventory(sku: string, quantity: number, reason: string): Promise<{ sku: string; quantity: number }> {
    return this.request<{ sku: string; quantity: number }>(`/inventory/${sku}/`, {
      method: 'PUT',
      body: JSON.stringify({ quantity, reason }),
    });
  }

  // Dealers
  static async getDealers(page = 1, pageSize = 50): Promise<PaginatedResponse<Dealer>> {
    return this.request<PaginatedResponse<Dealer>>(`/dealers/?page=${page}&page_size=${pageSize}`);
  }

  static async getDealer(id: number): Promise<Dealer> {
    return this.request<Dealer>(`/dealers/${id}/`);
  }

  // Orders
  static async getOrders(params?: {
    dealer_id?: number;
    status?: string;
    page?: number;
    page_size?: number;
  }): Promise<PaginatedResponse<Order>> {
    const query = new URLSearchParams();
    if (params?.dealer_id) query.set('dealer_id', params.dealer_id.toString());
    if (params?.status) query.set('status', params.status);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.page_size) query.set('page_size', params.page_size.toString());

    const qs = query.toString();
    return this.request<PaginatedResponse<Order>>(`/orders/${qs ? `?${qs}` : ''}`);
  }

  static async getOrder(orderNumber: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderNumber}/`);
  }

  static async createOrder(
    dealerId: number,
    items: Array<{ sku: string; quantity: number }>,
    idempotencyKey?: string
  ): Promise<Order> {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }

    return this.request<Order>('/orders/', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        dealer_id: dealerId,
        items,
      }),
    });
  }

  static async updateOrder(
    orderNumber: string,
    items: Array<{ sku: string; quantity: number }>
  ): Promise<Order> {
    return this.request<Order>(`/orders/${orderNumber}/`, {
      method: 'PUT',
      body: JSON.stringify({ items }),
    });
  }

  static async confirmOrder(orderNumber: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderNumber}/confirm/`, {
      method: 'POST',
    });
  }

  static async dispatchOrder(orderNumber: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderNumber}/dispatch/`, {
      method: 'POST',
    });
  }

  static async deliverOrder(orderNumber: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderNumber}/deliver/`, {
      method: 'POST',
    });
  }

  static async cancelOrder(orderNumber: string): Promise<Order> {
    return this.request<Order>(`/orders/${orderNumber}/cancel/`, {
      method: 'POST',
    });
  }

  // Supplier Sync
  static async triggerSupplierSync(): Promise<SupplierSyncResult> {
    return this.request<SupplierSyncResult>('/sync/supplier/', {
      method: 'POST',
    });
  }

  static async syncSupplier(): Promise<SupplierSyncResult> {
    return this.triggerSupplierSync();
  }

  // Assistant
  static async chatWithAssistant(
    sessionId: string,
    dealerId: number,
    message: string
  ): Promise<{
    reply: string;
    cited_skus: string[];
    tool_calls: Array<{ name: string; arguments: Record<string, any> }>;
    actions: Array<{ type: string; order_number?: string }>;
  }> {
    return this.request('/assistant/chat/', {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        dealer_id: dealerId,
        message,
      }),
    });
  }

  // Forecasting and Reorder
  static async getReorderSuggestions(): Promise<{ results: ReorderItem[] }> {
    return this.request<{ results: ReorderItem[] }>('/reorder-suggestions/');
  }

  static async procureReorders(skus?: string[]): Promise<{
    status: string;
    message: string;
    total_units_procured: number;
    procured_count: number;
    procured_items: Array<{
      sku: string;
      reordered_units: number;
      previous_stock: number;
      new_stock: number;
      reorder_point: number;
    }>;
  }> {
    return this.request('/reorder-suggestions/', {
      method: 'POST',
      body: JSON.stringify({ skus: skus || null }),
    });
  }

  static async getForecast(sku: string): Promise<{ sku: string; forecast: ForecastWeek[] }> {
    return this.request<{ sku: string; forecast: ForecastWeek[] }>(`/forecast/${sku}/`);
  }
}

