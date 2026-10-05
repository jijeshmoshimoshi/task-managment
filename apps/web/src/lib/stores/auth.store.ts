'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { IUser, IOrganization } from '@taskmaster/shared';

export interface AuthState {
  user: IUser | null;
  organization: IOrganization | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isHydrated: boolean;
  setAuth: (user: IUser, organization: IOrganization | null, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: IUser) => void;
  setOrganization: (organization: IOrganization | null) => void;
  setLoading: (loading: boolean) => void;
  setHydrated: (hydrated: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      organization: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: true,
      isHydrated: false,
      setAuth: (user, organization, accessToken) =>
        set({
          user,
          organization,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        }),
      setAccessToken: (accessToken) => set({ accessToken }),
      setUser: (user) => set({ user }),
      setOrganization: (organization) => set({ organization }),
      setLoading: (isLoading) => set({ isLoading }),
      setHydrated: (isHydrated) => set({ isHydrated }),
      logout: () =>
        set({
          user: null,
          organization: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        }),
    }),
    {
      name: 'taskmaster-auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false);
          state.setHydrated(true);
        }
      },
    },
  ),
);

