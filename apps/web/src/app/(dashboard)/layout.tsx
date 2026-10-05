'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Layers,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  ShieldAlert,
  LogOut,
  Key,
  Building2,
  Sliders,
  User,
  Shield,
  Video,
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useSocket } from '@/hooks/use-socket';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NotificationPopover } from '@/components/layout/notification-popover';
import { ROLES } from '@taskmaster/shared';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, organization, isAuthenticated, isLoading, logout } = useAuth();
  const { isConnected } = useSocket();

  useEffect(() => {
    if (!isLoading && (!isAuthenticated || !user)) {
      router.replace('/login');
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground font-mono">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const isSuperAdmin = user.role === ROLES.SUPER_ADMIN;
  const isAdmin = user.role === ROLES.ADMIN || isSuperAdmin;

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    { name: 'My Tasks', href: '/tasks/my', icon: CheckSquare },
    { name: 'Meetings', href: '/meetings', icon: Video },
    ...(isAdmin
      ? [
          { name: 'Team & Members', href: '/users', icon: Users },
          { name: 'Departments & Teams', href: '/settings/departments-teams', icon: Building2 },
        ]
      : []),
    ...(isSuperAdmin
      ? [
          { name: 'Organization Branding', href: '/settings/organization', icon: Sliders },
          { name: 'Security Policies', href: '/settings/security-policy', icon: Shield },
          { name: 'Audit Logs', href: '/audit-logs', icon: ShieldAlert },
        ]
      : []),
    { name: 'Security & 2FA', href: '/settings/security', icon: Key },
    { name: 'My Profile', href: '/settings/profile', icon: User },
  ];

  const getRoleBadgeVariant = (role: string) => {
    if (role === ROLES.SUPER_ADMIN) return 'destructive';
    if (role === ROLES.ADMIN) return 'default';
    return 'secondary';
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-card/60 backdrop-blur-md flex flex-col hidden md:flex shrink-0 sticky top-0 h-screen overflow-hidden z-40">
        {/* Organization & Logo Header */}
        <div className="h-16 px-6 border-b flex items-center gap-3 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
            <Layers className="h-5 w-5" />
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="font-bold text-sm truncate">
              {organization?.name || 'TaskMaster Workspace'}
            </span>
            <span className="text-[10px] text-muted-foreground font-mono truncate">
              {organization?.slug || 'acme-corp'}
            </span>
          </div>
        </div>

        {/* Navigation Links (Scrollable if viewport is small) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
          <span className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase px-3 py-1 block">
            Menu
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link key={item.name} href={item.href}>
                <Button
                  variant={isActive ? 'secondary' : 'ghost'}
                  size="sm"
                  className={`w-full justify-start gap-2.5 font-medium ${
                    isActive ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </Button>
              </Link>
            );
          })}
        </div>

        {/* User Profile Card & Actions (Always visible and pinned to bottom) */}
        <div className="p-4 border-t space-y-3 bg-muted/20 shrink-0">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary font-bold text-sm border border-primary/20 shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>
            <div className="flex flex-col overflow-hidden min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs truncate">
                  {user.firstName} {user.lastName}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground truncate">{user.email}</span>
            </div>
          </div>

          <div className="flex items-center justify-between px-2 pt-1">
            <Badge variant={getRoleBadgeVariant(user.role) as any} className="text-[10px] font-mono">
              {user.role.replace('_', ' ')}
            </Badge>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => logout()}
                aria-label="Logout"
                className="text-muted-foreground hover:text-destructive h-8 w-8"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header Bar */}
        <header className="h-16 border-b bg-background/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left: Brand on mobile, connection badge on desktop */}
          <div className="flex items-center gap-3">
            <div className="flex md:hidden items-center gap-2 font-bold text-sm">
              <Layers className="h-5 w-5 text-primary" />
              <span>TaskMaster</span>
            </div>

            {/* Realtime WebSocket Status Indicator */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 border text-[11px] text-muted-foreground">
              {isConnected ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-medium text-foreground">Live Synced</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                  <span>Connecting...</span>
                </>
              )}
            </div>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2">
            <NotificationPopover />
            <ThemeToggle />
            <div className="md:hidden">
              <Button variant="ghost" size="icon" onClick={() => logout()} className="h-9 w-9">
                <LogOut className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
