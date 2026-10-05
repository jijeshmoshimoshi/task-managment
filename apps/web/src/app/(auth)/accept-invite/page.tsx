'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AcceptInviteSchema, AcceptInviteInput } from '@taskmaster/shared';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Lock, User, Eye, EyeOff, Check, X, Sparkles } from 'lucide-react';

function AcceptInviteForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const { acceptInvite, isAcceptingInvite } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptInviteInput>({
    resolver: zodResolver(AcceptInviteSchema),
    defaultValues: {
      token,
      firstName: '',
      lastName: '',
      password: '',
    },
  });

  const passwordVal = watch('password') || '';

  const criteria = [
    { label: 'At least 8 characters', met: passwordVal.length >= 8 },
    { label: 'At least one uppercase letter (A-Z)', met: /[A-Z]/.test(passwordVal) },
    { label: 'At least one lowercase letter (a-z)', met: /[a-z]/.test(passwordVal) },
    { label: 'At least one number (0-9)', met: /[0-9]/.test(passwordVal) },
    { label: 'At least one special character (!@#$%^&*)', met: /[^A-Za-z0-9]/.test(passwordVal) },
  ];

  const onSubmit = async (data: AcceptInviteInput) => {
    await acceptInvite(data);
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <h2 className="text-xl font-bold text-destructive">Invalid Invitation Link</h2>
        <p className="text-xs text-muted-foreground">
          This invitation token is missing or has expired. Please contact your organization administrator for a new invite.
        </p>
        <Link href="/login">
          <Button variant="outline" size="sm">
            Return to Sign In
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-0.5 text-xs text-primary font-medium mb-1">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Workspace Invitation</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Set up your account</h1>
        <p className="text-sm text-muted-foreground">
          Complete your profile to join your team on TaskMaster
        </p>
      </div>

      <Card className="border shadow-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" value={token} {...register('token')} />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="firstName">
                  First Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="firstName"
                    placeholder="Alice"
                    className="pl-9"
                    disabled={isAcceptingInvite}
                    {...register('firstName')}
                  />
                </div>
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground" htmlFor="lastName">
                  Last Name
                </label>
                <Input
                  id="lastName"
                  placeholder="Vance"
                  disabled={isAcceptingInvite}
                  {...register('lastName')}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground" htmlFor="password">
                Create Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-9"
                  disabled={isAcceptingInvite}
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

            {/* Criteria Checklist */}
            <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 border">
              <span className="text-[11px] font-semibold text-muted-foreground">
                Password Requirements:
              </span>
              <div className="grid grid-cols-1 gap-1 text-[11px]">
                {criteria.map((c) => (
                  <div
                    key={c.label}
                    className={`flex items-center gap-1.5 ${
                      c.met ? 'text-emerald-500 font-medium' : 'text-muted-foreground'
                    }`}
                  >
                    {c.met ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
                    <span>{c.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full font-semibold" disabled={isAcceptingInvite}>
              {isAcceptingInvite ? 'Setting up account...' : 'Complete Registration & Join'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="text-center text-xs text-muted-foreground">Loading...</div>}>
      <AcceptInviteForm />
    </Suspense>
  );
}
