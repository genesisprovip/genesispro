import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'http://15.1.1.30:3000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token } = response.data.data;
          await SecureStore.setItemAsync('accessToken', access_token);

          originalRequest.headers.Authorization = `Bearer ${access_token}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      }
    }

    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
};

// Aves endpoints
export const avesAPI = {
  list: (params) => api.get('/aves', { params }),
  getById: (id) => api.get(`/aves/${id}`),
  create: (data) => api.post('/aves', data),
  update: (id, data) => api.put(`/aves/${id}`, data),
  delete: (id) => api.delete(`/aves/${id}`),
  getGenealogy: (id) => api.get(`/aves/${id}/genealogia`),
  getDescendants: (id) => api.get(`/aves/${id}/descendencia`),
};

// Combates endpoints
export const combatesAPI = {
  list: (params) => api.get('/combates', { params }),
  getById: (id) => api.get(`/combates/${id}`),
  create: (data) => api.post('/combates', data),
  update: (id, data) => api.put(`/combates/${id}`, data),
  delete: (id) => api.delete(`/combates/${id}`),
  getStats: (aveId) => api.get(`/combates/ave/${aveId}/stats`),
  getRanking: () => api.get('/combates/ranking'),
  getGlobalStats: () => api.get('/combates/stats'),
};

// Salud endpoints
export const saludAPI = {
  getAlertas: (dias) => api.get('/salud/alertas', { params: { dias_anticipacion: dias } }),
  getResumenAve: (aveId) => api.get(`/salud/ave/${aveId}/resumen`),
  // Vacunas
  listVacunas: (params) => api.get('/salud/vacunas', { params }),
  createVacuna: (data) => api.post('/salud/vacunas', data),
  // Desparasitaciones
  listDesparasitaciones: (params) => api.get('/salud/desparasitaciones', { params }),
  createDesparasitacion: (data) => api.post('/salud/desparasitaciones', data),
  // Tratamientos
  listTratamientos: (params) => api.get('/salud/tratamientos', { params }),
  createTratamiento: (data) => api.post('/salud/tratamientos', data),
  // Consultas
  listConsultas: (params) => api.get('/salud/consultas', { params }),
  createConsulta: (data) => api.post('/salud/consultas', data),
};

// Finanzas endpoints
export const finanzasAPI = {
  getCategorias: (tipo) => api.get('/finanzas/categorias', { params: { tipo } }),
  getDashboard: (params) => api.get('/finanzas/dashboard', { params }),
  getStats: (periodo) => api.get('/finanzas/stats', { params: { periodo } }),
  getResumenMensual: (meses) => api.get('/finanzas/resumen-mensual', { params: { meses } }),
  getPorCategoria: (params) => api.get('/finanzas/por-categoria', { params }),
  // Transacciones
  listTransacciones: (params) => api.get('/finanzas/transacciones', { params }),
  createTransaccion: (data) => api.post('/finanzas/transacciones', data),
  updateTransaccion: (id, data) => api.put(`/finanzas/transacciones/${id}`, data),
  deleteTransaccion: (id) => api.delete(`/finanzas/transacciones/${id}`),
  // ROI
  getRoiAve: (aveId) => api.get(`/finanzas/roi/ave/${aveId}`),
  getRoiRanking: (limit) => api.get('/finanzas/roi/ranking', { params: { limit } }),
};

export default api;
