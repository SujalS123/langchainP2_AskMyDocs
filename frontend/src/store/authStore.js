import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  token: localStorage.getItem('token') || '',
  user: null,
  
  setToken: (token) => {
    localStorage.setItem('token', token);
    set({ token });
  },
  
  setUser: (user) => set({ user }),
  
  logout: () => {
    localStorage.removeItem('token');
    set({ token: '', user: null });
  },
  
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  }
}));