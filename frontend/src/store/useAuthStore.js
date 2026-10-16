import { create } from "zustand";
import toast from "react-hot-toast";
import { api } from "../lib/axios";
import { useCartStore } from "./useCartStore";

export const useAuthStore = create((set) => ({
  user: null,
  isCheckingAuth: true,
  isLoggingIn: false,

  checkAuth: async () => {
    try {
      const res = await api.get("/auth/me");
      set({ user: res.data.user });
    } catch {
      set({ user: null });
    } finally {
      set({ isCheckingAuth: false });
    }
  },

  login: async (email, password) => {
    set({ isLoggingIn: true });
    try {
      const res = await api.post("/auth/login", { email, password });
      set({ user: res.data.user });
      toast.success("Welcome back, " + res.data.user.name);
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Login failed");
      return false;
    } finally {
      set({ isLoggingIn: false });
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // even if the request fails, clear the user locally
    }
    useCartStore.getState().clear();
    set({ user: null });
    toast.success("Logged out");
  },
}));