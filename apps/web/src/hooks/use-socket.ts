'use client';

import { useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from './use-auth';
import { WS_EVENTS } from '@taskmaster/shared';
import { toast } from 'sonner';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') || 'http://localhost:5000';

export interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  joinProject: (projectId: string) => void;
  leaveProject: (projectId: string) => void;
  joinTask: (taskId: string) => void;
  leaveTask: (taskId: string) => void;
}

export function useSocket(): UseSocketReturn {
  const { user, accessToken } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isMounted = true;

    if (!user || !accessToken || typeof window === 'undefined') {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
      return;
    }

    // Dynamic import to prevent SSR evaluation of Node ws
    import('socket.io-client').then(({ io }) => {
      if (!isMounted) return;

      const socket = io(API_BASE_URL, {
        auth: {
          token: accessToken,
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socketRef.current = socket;

      socket.on('connect', () => {
        if (isMounted) setIsConnected(true);
      });

      socket.on('disconnect', () => {
        if (isMounted) setIsConnected(false);
      });

      // Handle real-time incoming notifications
      socket.on(WS_EVENTS.NOTIFICATION_RECEIVED, (notification: any) => {
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['notifications-unread-count'] });

        toast(notification.title || 'New Notification', {
          description: notification.message,
          action: notification.link
            ? {
                label: 'View',
                onClick: () => {
                  window.location.href = notification.link;
                },
              }
            : undefined,
        });
      });

      // Handle real-time task mutations
      socket.on(WS_EVENTS.TASK_UPDATED, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      });

      socket.on(WS_EVENTS.TASK_CREATED, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      });

      socket.on(WS_EVENTS.TASK_MOVED, () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['analytics-overview'] });
      });
    });

    return () => {
      isMounted = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [user, accessToken, queryClient]);

  const joinProject = (projectId: string) => {
    socketRef.current?.emit(WS_EVENTS.JOIN_PROJECT, projectId);
  };

  const leaveProject = (projectId: string) => {
    socketRef.current?.emit(WS_EVENTS.LEAVE_PROJECT, projectId);
  };

  const joinTask = (taskId: string) => {
    socketRef.current?.emit(WS_EVENTS.JOIN_TASK, taskId);
  };

  const leaveTask = (taskId: string) => {
    socketRef.current?.emit(WS_EVENTS.LEAVE_TASK, taskId);
  };

  return {
    socket: socketRef.current,
    isConnected,
    joinProject,
    leaveProject,
    joinTask,
    leaveTask,
  };
}
