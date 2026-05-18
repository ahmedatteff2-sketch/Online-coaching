import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'ADMIN' | 'MEMBER';

export interface AuthUser {
  id: string;
  phone: string;
  fullName: string;
  role: Role;
  profileImage?: string | null;
  isActive?: boolean;
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
  setSession: (s: { user: AuthUser; accessToken: string }) => void;
  clearSession: () => void;
  setHydrated: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      hydrated: false,
      setSession: ({ user, accessToken }) => set({ user, accessToken }),
      clearSession: () => set({ user: null, accessToken: null }),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: 'fc.auth',
      // Only persist user — access tokens stay in memory; refresh in httpOnly cookie
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => state?.setHydrated(true),
    },
  ),
);
