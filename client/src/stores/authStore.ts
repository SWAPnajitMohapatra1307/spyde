import { create } from 'zustand';
import { apiClient } from '@/lib/apiClient';
import type { User } from '@/types/app';

export interface RegisterPayload {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  vpa?: string;
  upiHandle?: string;
}

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;

  setAuth: (user: User, accessToken: string) => void;
  setUser: (user: User | null) => void;
  setAccessToken: (token: string | null) => void;
  clearError: () => void;
  login: (phone: string, password?: string) => Promise<void>;
  loginAsDemo: (role?: 'user' | 'admin') => Promise<void>;
  register: (data: RegisterPayload) => Promise<void>;
  initialize: () => Promise<void>;
  logout: () => Promise<void>;
}

const MOCK_REGULAR_USER: User = {
  id: 'usr_clx9876543210',
  name: 'Siddharth Roy',
  phone: '9123456780',
  email: 'sid@spyde.io',
  vpa: 'sid@okhdfc',
  upiHandle: 'sid@okhdfc',
  riskScore: 12,
  isAdmin: false,
  role: 'user',
  createdAt: '2024-01-10T10:00:00Z',
  bankAccounts: [
    {
      id: 'bnk_01',
      ifsc: 'HDFC0001234',
      accountNumberMasked: '•••• •••• 4321',
      accountType: 'SAVINGS',
      balancePaisa: '10000000',
      balanceRupees: 100000,
    },
  ],
  upiHandles: [
    { id: 'hndl_01', vpa: 'sid@okhdfc', isPrimary: true },
  ],
};

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isInitializing: true,
  isLoading: false,
  error: null,

  setAuth: (user, accessToken) => {
    localStorage.setItem('spyde_token', accessToken);
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isInitializing: false,
      isLoading: false,
      error: null,
    });
  },

  setUser: (user) => {
    set({
      user,
      isAuthenticated: Boolean(user),
    });
  },

  setAccessToken: (accessToken) => {
    if (accessToken) {
      localStorage.setItem('spyde_token', accessToken);
    } else {
      localStorage.removeItem('spyde_token');
    }
    set({
      accessToken,
      isAuthenticated: Boolean(accessToken),
    });
  },

  clearError: () => {
    set({ error: null });
  },

  loginAsDemo: async (role = 'user') => {
    set({ isLoading: true, error: null });
    try {
      const phone = role === 'admin' ? '9123456780' : '9123456780';
      await get().login(phone, 'Password@123');
    } catch (err: unknown) {
      console.error('[AUTH] Live demo login failed:', err);
      set({
        isLoading: false,
        isAuthenticated: false,
        user: null,
        accessToken: null,
        error: 'Backend authentication failed. Please run database seed.',
      });
    }
  },

  login: async (phone: string, password?: string) => {
    set({ isLoading: true, error: null });

    const cleanPhone = phone.replace(/\D/g, '').slice(-10);

    try {
      const res = await apiClient.post<any>('/api/auth/login', {
        phone: cleanPhone,
        password,
      });

      const payload = res.data?.data || res.data;
      const user = payload?.user;
      const accessToken = payload?.tokens?.accessToken || payload?.accessToken;

      if (!accessToken) {
        throw new Error('No access token received from backend server.');
      }

      localStorage.setItem('spyde_token', accessToken);

      set({
        user: user || MOCK_REGULAR_USER,
        accessToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string }; message?: string } } })
              .response?.data?.error?.message ||
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Invalid phone number or password.')
          : (err as Error)?.message || 'Invalid phone number or password.';

      set({ error: message, isLoading: false, isAuthenticated: false, user: null, accessToken: null });
      throw new Error(message);
    }
  },

  register: async (payload: RegisterPayload) => {
    set({ isLoading: true, error: null });
    const cleanPhone = payload.phone.replace(/\D/g, '').slice(-10);

    try {
      const res = await apiClient.post<any>('/api/auth/register', {
        name: payload.name,
        phone: cleanPhone,
        email: payload.email,
        password: payload.password,
        vpa: payload.vpa || payload.upiHandle,
      });

      const data = res.data?.data || res.data;
      const user = data?.user;
      const accessToken = data?.tokens?.accessToken || data?.accessToken;

      if (accessToken) {
        localStorage.setItem('spyde_token', accessToken);
      }

      set({
        user: user || MOCK_REGULAR_USER,
        accessToken: accessToken || null,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? ((err as { response?: { data?: { error?: { message?: string }; message?: string } } })
              .response?.data?.error?.message ||
            (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
            'Registration failed. User may already exist.')
          : 'Registration failed.';

      set({ error: message, isLoading: false, isAuthenticated: false });
      throw new Error(message);
    }
  },

  initialize: async () => {
    try {
      const token = localStorage.getItem('spyde_token');
      if (token && token !== 'demo-token') {
        const meRes = await apiClient.get<any>('/api/auth/me');
        const user = meRes.data?.data?.user || meRes.data?.user || meRes.data?.data;
        if (user) {
          set({
            user,
            accessToken: token,
            isAuthenticated: true,
            isInitializing: false,
          });
          return;
        }
      }
    } catch {
      // Token invalid or expired
      localStorage.removeItem('spyde_token');
    }

    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
    });
  },

  logout: async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch {
      // Ignore network errors
    }

    localStorage.removeItem('spyde_token');
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isInitializing: false,
      isLoading: false,
      error: null,
    });
  },
}));