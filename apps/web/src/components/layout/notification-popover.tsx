'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Bell,
  CheckCheck,
  UserPlus,
  MessageSquare,
  Activity,
  FolderKanban,
  Sparkles,
} from 'lucide-react';
import { INotification } from '@taskmaster/shared';

export function NotificationPopover() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // 1. Fetch unread count
  const { data: countData } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications/unread-count');
      return res.data?.data?.unreadCount || 0;
    },
    refetchInterval: 30000,
  });

  // 2. Fetch recent notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await apiClient.get('/notifications?limit=10');
      return res.data?.data || [];
    },
    enabled: isOpen,
  });

  // 3. Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/notifications/${id}/read`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  // 4. Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiClient.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });
    },
  });

  const unreadCount = countData || 0;
  const notifications: INotification[] = notificationsData || [];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'TASK_ASSIGNED':
        return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'TASK_COMMENT':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'TASK_STATUS_CHANGED':
        return <Activity className="h-4 w-4 text-amber-500" />;
      case 'PROJECT_MEMBER_ADDED':
        return <FolderKanban className="h-4 w-4 text-indigo-500" />;
      default:
        return <Sparkles className="h-4 w-4 text-emerald-500" />;
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="relative h-9 w-9 text-muted-foreground hover:text-foreground"
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </Button>

      {isOpen && (
        <>
          {/* Backdrop click dismiss */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="p-3.5 border-b flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-xs">Notifications</span>
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-mono px-1.5 py-0 h-4">
                    {unreadCount} unread
                  </Badge>
                )}
              </div>

              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => markAllAsReadMutation.mutate()}
                  disabled={markAllAsReadMutation.isPending}
                  className="h-6 text-[11px] gap-1 px-2 text-primary hover:text-primary/80"
                >
                  <CheckCheck className="h-3 w-3" />
                  Mark all read
                </Button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[380px] overflow-y-auto divide-y">
              {isLoading ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading notifications...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center space-y-1">
                  <Bell className="h-6 w-6 text-muted-foreground/40 mx-auto" />
                  <p className="text-xs text-muted-foreground font-medium">All caught up!</p>
                  <p className="text-[11px] text-muted-foreground/70">No notifications to display.</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`p-3.5 flex items-start gap-3 hover:bg-muted/40 transition-colors ${
                      !n.isRead ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => {
                      if (!n.isRead) markAsReadMutation.mutate(n.id);
                    }}
                  >
                    <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center shrink-0 mt-0.5">
                      {getNotificationIcon(n.type)}
                    </div>
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-xs font-semibold text-foreground truncate block">
                          {n.title}
                        </span>
                        {!n.isRead && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-snug line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground font-mono">
                        <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        {n.link && (
                          <Link
                            href={n.link}
                            onClick={() => setIsOpen(false)}
                            className="text-primary hover:underline font-sans"
                          >
                            View &rarr;
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
