import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncQueue } from './syncQueue';

const API_URL = 'https://api.genesispro.vip/api/v1';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private _visitorId: string | null = null;

  async init() {
    try {
      this.accessToken = await AsyncStorage.getItem('access_token');
      this.refreshToken = await AsyncStorage.getItem('refresh_token');
      await this.ensureVisitorId();
      await syncQueue.init();
      console.log('API init - Token loaded:', !!this.accessToken, 'Visitor:', this._visitorId?.slice(0, 8));
      // Try to process any pending offline operations
      if (syncQueue.pendingCount > 0) {
        syncQueue.processQueue();
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
    }
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private async ensureVisitorId(): Promise<string> {
    if (this._visitorId) return this._visitorId;
    let id = await AsyncStorage.getItem('visitor_id');
    if (!id) {
      id = this.generateUUID();
      await AsyncStorage.setItem('visitor_id', id);
    }
    this._visitorId = id;
    return id;
  }

  async getVisitorId(): Promise<string> {
    return this.ensureVisitorId();
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
    options: RequestInit = {},
    offlineDescription?: string
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

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        console.log('API Error:', endpoint, data.error);
        throw new Error(data.error?.message || 'Error en la solicitud');
      }

      // Online and successful — try processing any queued operations
      if (syncQueue.pendingCount > 0) {
        syncQueue.processQueue();
      }

      return data;
    } catch (error) {
      const isNetworkError = (error as Error).message === 'Network request failed' ||
        (error as Error).message?.includes('fetch') ||
        (error as Error).message?.includes('network');

      const method = (options.method || 'GET').toUpperCase();
      const isWriteOp = ['POST', 'PUT', 'DELETE'].includes(method);

      // Queue write operations on network failure
      if (isNetworkError && isWriteOp && offlineDescription) {
        let body: any = undefined;
        if (options.body && typeof options.body === 'string') {
          try { body = JSON.parse(options.body); } catch { body = options.body; }
        }
        await syncQueue.enqueue({
          endpoint,
          method: method as 'POST' | 'PUT' | 'DELETE',
          body,
          description: offlineDescription,
        });
        // Return a fake success so the UI doesn't break
        return { success: true, data: null, _offline: true, _queued: true } as T;
      }

      throw error;
    }
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

  async register(data: { nombre: string; email: string; password: string; plan?: string; referido_por?: string; referido_evento_id?: string }) {
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
    }, 'Crear ave');
  }

  async updateAve(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/aves/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'Actualizar ave');
  }

  async deleteAve(id: string) {
    return this.request<{ success: boolean }>(`/aves/${id}`, {
      method: 'DELETE',
    }, 'Eliminar ave');
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
    }, 'Crear combate');
  }

  async updateCombate(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/combates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'Actualizar combate');
  }

  async deleteCombate(id: string) {
    return this.request<{ success: boolean }>(`/combates/${id}`, {
      method: 'DELETE',
    }, 'Eliminar combate');
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
    }, 'Crear registro de salud');
  }

  async updateRegistroSalud(id: string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/salud/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }, 'Actualizar registro de salud');
  }

  async deleteRegistroSalud(id: string) {
    return this.request<{ success: boolean }>(`/salud/${id}`, {
      method: 'DELETE',
    }, 'Eliminar registro de salud');
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

  // Palenque / Eventos
  async getEventoPorCodigo(codigo: string) {
    return this.request<{ success: boolean; data: any }>(`/eventos/por-codigo/${codigo.toUpperCase()}`);
  }

  async joinEvento(codigo: string, rol: string = 'espectador') {
    return this.request<{ success: boolean; data: any }>('/eventos/unirse', {
      method: 'POST',
      body: JSON.stringify({ codigo: codigo.toUpperCase(), rol }),
    });
  }

  async getEvento(id: string) {
    return this.request<{ success: boolean; data: any }>(`/eventos/${id}`);
  }

  async getEventos(params?: { estado?: string }) {
    const searchParams = new URLSearchParams();
    if (params?.estado) searchParams.append('estado', params.estado);
    const query = searchParams.toString();
    return this.request<{ success: boolean; data: any[] }>(`/eventos${query ? `?${query}` : ''}`);
  }

  async getEventosPublicos() {
    return this.request<{ success: boolean; data: any[] }>('/eventos/publicos');
  }

  async getEventoByCodigo(codigo: string) {
    return this.request<{ success: boolean; data: any }>(`/eventos/por-codigo/${codigo}`);
  }

  async getPeleasEvento(eventoId: string, publico: boolean = false) {
    const prefix = publico ? '/peleas/publico' : '/peleas';
    return this.request<{ success: boolean; data: any[] }>(`${prefix}/evento/${eventoId}`);
  }

  async iniciarPelea(peleaId: string) {
    return this.request<{ success: boolean; data: any }>(`/peleas/${peleaId}/iniciar`, {
      method: 'POST',
    });
  }

  async registrarResultadoPelea(peleaId: string, data: {
    resultado: 'rojo' | 'verde' | 'empate' | 'tabla' | 'cancelada';
    duracion_minutos?: number;
    duracion_segundos?: number;
    tipo_victoria?: string;
    notas?: string;
  }) {
    return this.request<{ success: boolean; data: any }>(`/peleas/${peleaId}/resultado`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTabla(eventoId: string, publico: boolean = false) {
    const endpoint = publico ? `/derby/${eventoId}/tabla-publica` : `/derby/${eventoId}/tabla`;
    return this.request<{ success: boolean; data: any[] }>(endpoint);
  }

  async getPartidoPorCodigo(eventoId: string, codigo: string) {
    return this.request<{ success: boolean; data: any }>(`/derby/${eventoId}/partido-por-codigo/${codigo.toUpperCase()}`);
  }

  async getAvisosEvento(eventoId: string) {
    return this.request<{ success: boolean; data: any[] }>(`/eventos/${eventoId}/avisos`);
  }

  // Notifications
  async registerPushToken(token: string, platform: string) {
    return this.request<{ success: boolean }>('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform }),
    });
  }

  async unregisterPushToken(token: string) {
    return this.request<{ success: boolean }>('/notifications/unregister-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  async getNotificationPreferences() {
    return this.request<{ success: boolean; data: any }>('/notifications/preferences');
  }

  async updateNotificationPreferences(prefs: {
    push_habilitado?: boolean;
    alerta_vacunas?: boolean;
    recordatorio_combates?: boolean;
    avisos_evento?: boolean;
  }) {
    return this.request<{ success: boolean; data: any }>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    });
  }

  // Subscriptions
  async changePlan(plan: string) {
    return this.request<{ success: boolean; message: string; data: any }>('/subscriptions/change-plan', {
      method: 'PUT',
      body: JSON.stringify({ plan }),
    });
  }

  // Empresario
  async getEmpresarioStatus() {
    return this.request<{
      success: boolean;
      data: {
        plan: string | null;
        hasSubscription: boolean;
        isActive: boolean;
        fechaExpiracion: string | null;
        currentPriceId: string | null;
        eventosEsteMes: number;
        limiteEventos: number | null;
        estadisticasEvento: boolean;
      };
    }>('/empresario/status');
  }

  async getEmpresarioPlans() {
    return this.request<{
      success: boolean;
      data: {
        plans: Array<{
          id: string;
          nombre: string;
          precio: number;
          priceId: string | null;
          maxEventosMes: number | null;
          cartel: boolean;
          avisos: boolean;
          participantesIlimitados: boolean;
          estadisticasEvento: boolean;
        }>;
      };
    }>('/empresario/plans');
  }

  async createEmpresarioCheckout(priceId: string) {
    return this.request<{
      success: boolean;
      data: { url: string; sessionId: string };
    }>('/empresario/checkout', {
      method: 'POST',
      body: JSON.stringify({ priceId }),
    });
  }

  async createEmpresarioPortal() {
    return this.request<{
      success: boolean;
      data: { url: string };
    }>('/empresario/portal', {
      method: 'POST',
    });
  }

  async getEmpresarioReferidos() {
    return this.request<{
      success: boolean;
      data: {
        referidos: Array<{
          id: string;
          usuario_id: string;
          evento_id: string | null;
          estado: string;
          comision_monto: number;
          comision_porcentaje: number;
          created_at: string;
          usuario_nombre: string;
          usuario_email: string;
          usuario_plan: string;
          evento_nombre: string | null;
        }>;
        stats: {
          totalReferidos: number;
          totalSuscritos: number;
          comisionesPendientes: number;
          comisionesPagadas: number;
        };
      };
    }>('/empresario/referidos');
  }

  async getEmpresarioComisiones() {
    return this.request<{
      success: boolean;
      data: {
        totalGanado: number;
        pendiente: number;
        pagado: number;
        totalConversiones: number;
        mensual: Array<{
          mes: string;
          referidos: number;
          conversiones: number;
          comisiones: number;
        }>;
      };
    }>('/empresario/comisiones');
  }

  async purchaseExtraEvent() {
    return this.request<{
      success: boolean;
      data: { url: string; sessionId: string };
    }>('/empresario/extra-event', {
      method: 'POST',
    });
  }

  // Streaming
  async startStream(eventoId: string) {
    return this.request<{
      success: boolean;
      data: { streamKey: string; rtmpUrl: string; streamName: string };
    }>('/streaming/start', {
      method: 'POST',
      body: JSON.stringify({ eventoId }),
    });
  }

  async stopStream(eventoId: string) {
    return this.request<{ success: boolean }>('/streaming/stop', {
      method: 'POST',
      body: JSON.stringify({ eventoId }),
    });
  }

  async getStreamInfo(eventoId: string) {
    return this.request<{
      success: boolean;
      data: {
        hlsUrl: string | null;
        estado: string;
        startedAt: string | null;
        calidad: string;
        viewersCount: number;
        isLive: boolean;
      };
    }>(`/streaming/evento/${eventoId}`);
  }

  async getActiveStreams() {
    return this.request<{
      success: boolean;
      data: {
        streams: Array<{
          id: string;
          evento_id: string;
          evento_nombre: string;
          organizador: string;
          viewers_count: number;
          started_at: string;
        }>;
        total: number;
      };
    }>('/streaming/active');
  }

  // Chat
  async getChatMessages(eventoId: string, before?: string) {
    const params = new URLSearchParams();
    if (before) params.append('before', before);
    const query = params.toString();
    return this.request<{ success: boolean; data: any[] }>(
      `/chat/evento/${eventoId}${query ? `?${query}` : ''}`
    );
  }

  async sendChatMessage(eventoId: string, mensaje: string) {
    return this.request<{ success: boolean; data: any }>(`/chat/evento/${eventoId}`, {
      method: 'POST',
      body: JSON.stringify({ mensaje }),
    });
  }

  async deleteChatMessage(messageId: string) {
    return this.request<{ success: boolean }>(`/chat/${messageId}`, {
      method: 'DELETE',
    });
  }

  // Analytics
  async getAnalyticsDashboard() {
    return this.request<{ success: boolean; data: any }>('/analytics/dashboard');
  }

  async getAnalyticsTrends() {
    return this.request<{ success: boolean; data: any[] }>('/analytics/tendencias');
  }

  async getTopAves(limit: number = 10) {
    return this.request<{ success: boolean; data: any[] }>(`/analytics/top-aves?limit=${limit}`);
  }

  async getAveAnalytics(aveId: string) {
    return this.request<{ success: boolean; data: any }>(`/analytics/ave/${aveId}`);
  }

  async getFinancialSummary(periodo: string = '6m') {
    return this.request<{ success: boolean; data: any }>(`/analytics/financiero?periodo=${periodo}`);
  }

  // Calendar
  async getCalendarEvents(inicio?: string, fin?: string) {
    const params = new URLSearchParams();
    if (inicio) params.append('inicio', inicio);
    if (fin) params.append('fin', fin);
    const query = params.toString();
    return this.request<{ success: boolean; data: any[] }>(`/calendario${query ? `?${query}` : ''}`);
  }

  async getUpcomingEvents() {
    return this.request<{ success: boolean; data: { vacunas: any[]; combates: any[] } }>('/calendario/proximos');
  }

  // ==================== ALIMENTACION ====================

  async getAlimentos() {
    return this.request<{ success: boolean; data: any[] }>('/alimentacion/alimentos');
  }

  async createAlimento(data: any) {
    return this.request<{ success: boolean; data: any }>('/alimentacion/alimentos', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateAlimento(id: number | string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/alimentacion/alimentos/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteAlimento(id: number | string) {
    return this.request<{ success: boolean }>(`/alimentacion/alimentos/${id}`, { method: 'DELETE' });
  }

  async getRegistrosAlimentacion(params?: { fecha?: string; ave_id?: string; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.fecha) query.append('fecha', params.fecha);
    if (params?.ave_id) query.append('ave_id', params.ave_id);
    if (params?.limit) query.append('limit', params.limit.toString());
    const qs = query.toString();
    return this.request<{ success: boolean; data: any[] }>(`/alimentacion/registros${qs ? `?${qs}` : ''}`);
  }

  async createRegistroAlimentacion(data: any) {
    return this.request<{ success: boolean; data: any }>('/alimentacion/registros', { method: 'POST', body: JSON.stringify(data) });
  }

  async deleteRegistroAlimentacion(id: number | string) {
    return this.request<{ success: boolean }>(`/alimentacion/registros/${id}`, { method: 'DELETE' });
  }

  async getDietas(ave_id?: string) {
    const qs = ave_id ? `?ave_id=${ave_id}` : '';
    return this.request<{ success: boolean; data: any[] }>(`/alimentacion/dietas${qs}`);
  }

  async createDieta(data: any) {
    return this.request<{ success: boolean; data: any }>('/alimentacion/dietas', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateDieta(id: number | string, data: any) {
    return this.request<{ success: boolean; data: any }>(`/alimentacion/dietas/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteDieta(id: number | string) {
    return this.request<{ success: boolean }>(`/alimentacion/dietas/${id}`, { method: 'DELETE' });
  }

  async getAlimentacionStats() {
    return this.request<{ success: boolean; data: any }>('/alimentacion/stats');
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  // Offline sync
  getSyncQueue() { return syncQueue.getQueue(); }
  get pendingSyncCount() { return syncQueue.pendingCount; }
  async processSyncQueue() { return syncQueue.processQueue(); }
  subscribeSyncQueue(listener: (queue: any[]) => void) { return syncQueue.subscribe(listener); }
}

export const api = new ApiService();
export default api;
