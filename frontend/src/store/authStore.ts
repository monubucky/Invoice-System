import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  businessId: string;
}

interface Business {
  id: string;
  name: string;
  currency: string;
  logo?: string;
}

interface AuthState {
  user: User | null;
  business: Business | null;
  token: string | null;
  setAuth: (user: User, business: Business, token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      business: null,
      token: null,
      setAuth: (user, business, token) => {
        localStorage.setItem('accessToken', token);
        set({ user, business, token });
      },
      logout: () => {
        localStorage.removeItem('accessToken');
        set({ user: null, business: null, token: null });
      },
      isAuthenticated: () => !!get().token,
    }),
    { name: 'auth-storage' }
  )
);