import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'https://api.genesispro.vip/api/v1';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  async init() {
    try {
      this.accessToken = await AsyncStorage.getItem('access_token');
      this.refreshToken = await AsyncStorage.getItem('refresh_token');
      console.log('API init - Token loaded:', !!this.accessToken);
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  async setTokens(tokens: TokenData) {
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    await AsyncStorage.setItem('access_token', tokens.access_token);
    await AsyncStorage.setItem('refresh_token', tokens.refresh_token);
  }

  async clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Ensure tokens are loaded before making requests
    if (!this.accessToken) {
      await this.init();
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
      console.log('API Request with token to:', endpoint);
    } else {
      console.log('API Request WITHOUT token to:', endpoint);
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      console.log('API Error:', endpoint, data.error);
      throw new Error(data.error?.message || 'Error en la solicitud');
    }

    return data;
  }

  // Auth
  async login(email: string, password: string) {
    const response = await this.request<{
      success: boolean;
      data: { user: any; tokens: TokenData };
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      await this.setTokens(response.data.tokens);
    }
    return response;
  }

  async register(data: { nombre: string; email: string; password: string }) {
    const response = await this.request<{
      success: boolean;
      data: { user: any; tokens: TokenData };
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (response.success) {
      await this.setTokens(response.data.tokens);
    }
    return response;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (error) {
      // Ignore logout errors
    }
    await this.clearTokens();
  }

  async getProfile() {
    return this.request<{ success: boolean; data: { user: any; limites: any } }>('/auth/me');
  }

  // Aves
  async getAves(params?: { page?: number; limit?: number; sexo?: string; estado?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/aves${query ? `?${query}` : ''}`);
  }

  async getAve(id: string) {
    return this.request<{ success: boolean; data: any }>(`/aves/${id}`);
  }

  async createAve(data: any) {
    return this.request<{ success: boolean; data: any }>('/aves', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAve(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/aves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAve(id: string) {
    return this.request<{ success: boolean }>(`/aves/${id}`, {
      method: 'DELETE',
    });
  }

  // Combates
  async getCombates(params?: { page?: number; limit?: number; ave_id?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/combates${query ? `?${query}` : ''}`);
  }

  async getCombate(id: string) {
    return this.request<{ success: boolean; data: any }>(`/combates/${id}`);
  }

  async createCombate(data: any) {
    return this.request<{ success: boolean; data: any }>('/combates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCombate(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/combates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCombate(id: string) {
    return this.request<{ success: boolean }>(`/combates/${id}`, {
      method: 'DELETE',
    });
  }

  async getEstadisticasCombates() {
    return this.request<{ success: boolean; data: any }>('/combates/estadisticas');
  }

  // Salud
  async getRegistrosSalud(params?: { ave_id?: string; tipo?: string; page?: number; limit?: number }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{
      success: boolean;
      data: any[];
      pagination?: any;
    }>(`/salud${query ? `?${query}` : ''}`);
  }

  async getRegistroSalud(id: string) {
    return this.request<{ success: boolean; data: any }>(`/salud/${id}`);
  }

  async createRegistroSalud(data: any) {
    return this.request<{ success: boolean; data: any }>('/salud', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRegistroSalud(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/salud/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteRegistroSalud(id: string) {
    return this.request<{ success: boolean }>(`/salud/${id}`, {
      method: 'DELETE',
    });
  }

  async getProximasVacunas() {
    return this.request<{ success: boolean; data: any[] }>('/salud/proximas-vacunas');
  }

  // Finanzas
  async getTransacciones(params?: { page?: number; limit?: number; tipo?: string }) {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return this.request<{
      success: boolean;
      data: any[];
      pagination: any;
    }>(`/finanzas/transacciones${query ? `?${query}` : ''}`);
  }

  async getDashboardFinanciero() {
    return this.request<{ success: boolean; data: any }>('/finanzas/dashboard');
  }

  // Subscriptions
  async getSubscriptionStatus() {
    return this.request<{
      success: boolean;
      data: {
        plan: string;
        hasSubscription: boolean;
        isExpired: boolean | null;
        billingInterval: string | null;
        fechaExpiracion: string | null;
        currentPriceId: string | null;
        limits: { maxAves: number | null; maxFotosPorAve: number | null; maxCombates: number | null };
        usage: { aves: number; combates: number };
      };
    }>('/subscriptions/status');
  }

  async getSubscriptionPlans() {
    return this.request<{
      success: boolean;
      data: {
        plans: Array<{
          nombre: string;
          precio_mensual: string;
          precio_anual: string;
          max_aves: number | null;
          max_fotos_por_ave: number | null;
          max_combates: number | null;
          profundidad_genealogia: number | null;
          analytics_avanzado: boolean;
          multi_usuario: boolean;
          exportacion: boolean;
          soporte_prioritario: boolean;
        }>;
      };
    }>('/subscriptions/plans');
  }

  async createCheckoutSession(priceId: string) {
    return this.request<{
      success: boolean;
      data: { url: string; sessionId: string };
    }>('/subscriptions/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  async createBillingPortalSession() {
    return this.request<{
      success: boolean;
      data: { url: string };
    }>('/subscriptions/portal', {
      method: 'POST',
    });
  }

  async getInvoices() {
    return this.request<{
      success: boolean;
      data: {
        invoices: Array<{
          id: string;
          number: string;
          date: string;
          amount: number;
          currency: string;
          status: string;
          pdfUrl: string;
          hostedUrl: string;
        }>;
      };
    }>('/subscriptions/invoices');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }
}

export const api = new ApiService();
export default api;
