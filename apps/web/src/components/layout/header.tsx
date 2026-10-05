'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, ArrowRight, LayoutDashboard, LogIn } from 'lucide-react';
import { ThemeToggle } from './theme-toggle';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export function Header() {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  // Hide the marketing header on dashboard and dedicated auth pages since they have their own layouts
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/projects') ||
    pathname.startsWith('/tasks') ||
    pathname.startsWith('/users') ||
    pathname.startsWith('/audit-logs') ||
    pathname.startsWith('/settings');

  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/accept-invite');

  if (isDashboardRoute || isAuthRoute) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md transition-all">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20 transition-transform group-hover:scale-105">
              <Layers className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text font-extrabold text-xl">
              TaskMaster
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#workflow" className="hover:text-foreground transition-colors">
              Workflow
            </Link>
            <Link href="#solutions" className="hover:text-foreground transition-colors">
              Solutions
            </Link>
            <Link href="#security" className="hover:text-foreground transition-colors">
              Security
            </Link>
            <Link href="#testimonials" className="hover:text-foreground transition-colors">
              Testimonials
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <Link href="/dashboard">
              <Button size="sm" className="gap-2 shadow-sm font-semibold">
                <LayoutDashboard className="h-4 w-4" />
                <span>Go to Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="font-semibold text-muted-foreground hover:text-foreground">
                  <LogIn className="h-4 w-4 mr-1.5" />
                  Sign In
                </Button>
              </Link>
              <Link href="/login">
                <Button size="sm" className="gap-1.5 shadow-md shadow-primary/20 font-semibold bg-primary hover:bg-primary/90">
                  <span>Get Started</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

