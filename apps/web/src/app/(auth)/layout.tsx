'use client';

import React from 'react';
import Link from 'next/link';
import { Layers, ShieldCheck, Zap, Lock, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/layout/theme-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-background">
      {/* Left Column: Enterprise Branding & Trust Signals */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white relative overflow-hidden">
        {/* Subtle grid and glowing radial highlight */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:32px_32px]" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/30">
            <Layers className="h-6 w-6" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">TaskMaster</span>
        </div>

        {/* Feature Highlights */}
        <div className="relative z-10 max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs backdrop-blur-md">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Multi-Tenant Enterprise Platform</span>
          </div>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-white">
            Orchestrate work with speed, clarity, and enterprise security.
          </h1>

          <div className="grid grid-cols-1 gap-4 pt-4 text-sm text-slate-300">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" />
              <span>Multi-tenant RBAC with granular permission policies</span>
            </div>
            <div className="flex items-center gap-3">
              <Lock className="h-5 w-5 text-indigo-400 shrink-0" />
              <span>Argon2id hashing, rotating tokens & TOTP 2FA</span>
            </div>
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-400 shrink-0" />
              <span>Real-time WebSocket sync & BullMQ background queues</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-slate-400 flex items-center justify-between">
          <span>&copy; {new Date().getFullYear()} TaskMaster Enterprise. All rights reserved.</span>
          <span className="font-medium text-[11px] text-slate-300">Enterprise Edition</span>
        </div>
      </div>

      {/* Right Column: Form Container */}
      <div className="flex flex-col justify-between p-6 sm:p-12">
        <div className="flex items-center justify-between">
          <Link href="/" className="lg:hidden flex items-center gap-2 font-bold text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <span>TaskMaster</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="mx-auto w-full max-w-md my-auto py-8">{children}</div>

        <div className="text-center text-xs text-muted-foreground">
          Protected by enterprise security headers, rate limiting, and encrypted sessions.
        </div>
      </div>
    </div>
  );
}
