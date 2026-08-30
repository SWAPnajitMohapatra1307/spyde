import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to attach JWT token if available
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('spyde_token');
    if (token && token !== 'demo-token' && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Flag to prevent concurrent refresh loops
let isRefreshing = false;

// Response interceptor for automatic refresh / error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Prevent infinite loop on auth endpoints & missing requests
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/api/auth/login') &&
      !originalRequest.url?.includes('/api/auth/refresh') &&
      !originalRequest.url?.includes('/api/auth/logout')
    ) {
      originalRequest._retry = true;

      const storedToken = localStorage.getItem('spyde_token');
      // If there was no token stored, do NOT attempt refresh loop
      if (!storedToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return Promise.reject(error);
      }

      isRefreshing = true;
      try {
        const { data } = await axios.post<{ data?: { accessToken: string }; accessToken?: string }>(
          '/api/auth/refresh',
          {},
          { withCredentials: true }
        );

        const newToken = data?.data?.accessToken || data?.accessToken;
        if (newToken) {
          localStorage.setItem('spyde_token', newToken);
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          isRefreshing = false;
          return apiClient(originalRequest);
        }
      } catch {
        localStorage.removeItem('spyde_token');
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);