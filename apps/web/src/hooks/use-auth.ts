'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth.store';
import {
  LoginInput,
  AcceptInviteInput,
  RequestPasswordResetInput,
  ResetPasswordInput,
} from '@taskmaster/shared';

export function useAuth() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    user,
    organization,
    accessToken,
    isAuthenticated,
    isLoading: storeLoading,
    isHydrated,
    setAuth,
    logout,
  } = useAuthStore();

  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    if (!isHydrated && useAuthStore.persist.hasHydrated()) {
      useAuthStore.getState().setHydrated(true);
      useAuthStore.getState().setLoading(false);
    }
  }, [isHydrated]);

  // 1. Fetch current profile
  const { data: meData, refetch: refetchMe } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      try {
        const res = await apiClient.get('/auth/me');
        return res.data.data;
      } catch (err: any) {
        if (err.statusCode === 401 || err.response?.status === 401) {
          logout();
        }
        throw err;
      }
    },
    enabled: isAuthenticated && hasMounted,
    retry: false,
  });

  const isLoading = !hasMounted || (storeLoading && !isHydrated);

  // 2. Login Mutation
  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await apiClient.post('/auth/login', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      if (data.twoFactorRequired) {
        return;
      }
      setAuth(data.user, data.organization, data.accessToken);
      toast.success(`Welcome back, ${data.user.firstName}!`);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Login failed');
    },
  });

  // 3. Logout Mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/auth/logout');
    },
    onSettled: () => {
      logout();
      queryClient.clear();
      toast.info('Logged out successfully');
      router.push('/login');
    },
  });

  // 4. Accept Invite Mutation
  const acceptInviteMutation = useMutation({
    mutationFn: async (data: AcceptInviteInput) => {
      const res = await apiClient.post('/auth/accept-invite', data);
      return res.data.data;
    },
    onSuccess: () => {
      toast.success('Account activated! You can now log in.');
      router.push('/login');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to accept invitation');
    },
  });

  // 5. Forgot Password Mutation
  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: RequestPasswordResetInput) => {
      const res = await apiClient.post('/auth/forgot-password', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
    },
    onError: (err: any) => {
      toast.error(err.message || 'Request failed');
    },
  });

  // 6. Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      const res = await apiClient.post('/auth/reset-password', data);
      return res.data.data;
    },
    onSuccess: (data) => {
      toast.success(data.message);
      router.push('/login');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Password reset failed');
    },
  });

  return {
    user: meData?.user || user,
    organization: meData?.organization || organization,
    accessToken,
    isAuthenticated,
    isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    acceptInvite: acceptInviteMutation.mutateAsync,
    isAcceptingInvite: acceptInviteMutation.isPending,
    forgotPassword: forgotPasswordMutation.mutateAsync,
    isSendingReset: forgotPasswordMutation.isPending,
    resetPassword: resetPasswordMutation.mutateAsync,
    isResettingPassword: resetPasswordMutation.isPending,
    refetchMe,
  };
}
