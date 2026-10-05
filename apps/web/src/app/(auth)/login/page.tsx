'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginInput } from '@taskmaster/shared';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const { login, isLoggingIn } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    const payload: LoginInput = {
      ...data,
      twoFactorCode: twoFactorRequired ? twoFactorCode : undefined,
    };

    const res = await login(payload);
    if (res?.twoFactorRequired) {
      setTwoFactorRequired(true);
    }
  };

  // Quick fill helper for demo/testing
  const quickFill = (email: string, pass: string) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in to TaskMaster</h1>
        <p className="text-sm text-muted-foreground">
          Enter your organization email and password to access your workspace
        </p>
      </div>

      <Card className="border shadow-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="email">
                Work Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@company.com"
                  className="pl-9"
                  disabled={isLoggingIn || twoFactorRequired}
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground" htmlFor="password">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  disabled={isLoggingIn || twoFactorRequired}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            {/* 2FA Input Step (Shown when 2FA is triggered) */}
            {twoFactorRequired && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3 animate-in fade-in zoom-in-95">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <ShieldCheck className="h-5 w-5" />
                  <span>Two-Factor Authentication Required</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the 6-digit code from your authenticator app (or backup recovery code).
                </p>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="000000"
                    maxLength={9}
                    autoFocus
                    value={twoFactorCode}
                    onChange={(e) => setTwoFactorCode(e.target.value)}
                    className="pl-9 font-mono tracking-widest text-center text-base"
                  />
                </div>
              </div>
            )}

            <Button type="submit" className="w-full font-semibold mt-2" disabled={isLoggingIn}>
              {isLoggingIn
                ? 'Authenticating...'
                : twoFactorRequired
                ? 'Verify & Sign In'
                : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Demo Credentials Quick Fill */}
      <Card className="border border-dashed bg-muted/30">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Quick-Fill Seeded Test Accounts</span>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-1.5 flex-col items-start"
            onClick={() => quickFill('superadmin@taskmaster.local', 'Admin@123456!')}
          >
            <span className="font-bold text-rose-500">Super Admin</span>
            <span className="text-[10px] text-muted-foreground">Full Org Control</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-1.5 flex-col items-start"
            onClick={() => quickFill('admin.alice@taskmaster.local', 'Admin@123456!')}
          >
            <span className="font-bold text-indigo-500">Admin</span>
            <span className="text-[10px] text-muted-foreground">Project Manager</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-xs justify-start h-auto py-1.5 flex-col items-start"
            onClick={() => quickFill('user1@taskmaster.local', 'User@123456!')}
          >
            <span className="font-bold text-emerald-500">User / Employee</span>
            <span className="text-[10px] text-muted-foreground">Task Assignee</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
