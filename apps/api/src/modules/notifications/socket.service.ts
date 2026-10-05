import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { WS_EVENTS } from '@taskmaster/shared';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    organizationId: string;
    role: string;
  };
}

export class SocketService {
  private static io: SocketIOServer | null = null;

  public static init(io: SocketIOServer): void {
    this.io = io;

    // Authentication middleware for WebSockets
    io.use((socket: AuthenticatedSocket, next) => {
      try {
        const token =
          socket.handshake.auth?.token ||
          socket.handshake.headers?.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('Authentication error: Token required'));
        }

        const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
        socket.user = {
          id: decoded.id || decoded.userId,
          organizationId: decoded.organizationId,
          role: decoded.role,
        };

        next();
      } catch (err) {
        logger.warn({ err }, '🔌 WebSocket authentication failed');
        next(new Error('Authentication error: Invalid token'));
      }
    });

    io.on('connection', (socket: AuthenticatedSocket) => {
      const user = socket.user;
      if (!user) {
        socket.disconnect(true);
        return;
      }

      logger.info(
        { socketId: socket.id, userId: user.id, orgId: user.organizationId },
        '🔌 Authenticated client connected to WebSockets',
      );

      // Automatically join User room and Organization room
      socket.join(`user:${user.id}`);
      socket.join(`org:${user.organizationId}`);

      // Handle Project Room subscriptions
      socket.on(WS_EVENTS.JOIN_PROJECT, (projectId: string) => {
        if (projectId) {
          socket.join(`project:${projectId}`);
          logger.debug({ socketId: socket.id, projectId }, 'Joined project room');
        }
      });

      socket.on(WS_EVENTS.LEAVE_PROJECT, (projectId: string) => {
        if (projectId) {
          socket.leave(`project:${projectId}`);
          logger.debug({ socketId: socket.id, projectId }, 'Left project room');
        }
      });

      // Handle Task Room subscriptions
      socket.on(WS_EVENTS.JOIN_TASK, (taskId: string) => {
        if (taskId) {
          socket.join(`task:${taskId}`);
        }
      });

      socket.on(WS_EVENTS.LEAVE_TASK, (taskId: string) => {
        if (taskId) {
          socket.leave(`task:${taskId}`);
        }
      });

      socket.on('disconnect', (reason) => {
        logger.debug({ socketId: socket.id, userId: user.id, reason }, '🔌 Client disconnected');
      });
    });
  }

  public static emitToUser(userId: string, event: string, payload: any): void {
    if (!this.io) return;
    this.io.to(`user:${userId}`).emit(event, payload);
  }

  public static emitToOrg(orgId: string, event: string, payload: any): void {
    if (!this.io) return;
    this.io.to(`org:${orgId}`).emit(event, payload);
  }

  public static emitToProject(projectId: string, event: string, payload: any): void {
    if (!this.io) return;
    this.io.to(`project:${projectId}`).emit(event, payload);
  }

  public static emitToTask(taskId: string, event: string, payload: any): void {
    if (!this.io) return;
    this.io.to(`task:${taskId}`).emit(event, payload);
  }
}
