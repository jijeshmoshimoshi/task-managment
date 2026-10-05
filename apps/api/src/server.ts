import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './config/logger';
import { db } from './config/database';
import { redisManager } from './config/redis';
import { SocketService } from './modules/notifications/socket.service';

async function bootstrap() {
  try {
    // 1. Connect to Database (MongoDB)
    await db.connect();

    // 2. Initialise Redis
    redisManager.getClient();

    // 3. Create HTTP Server & Express App
    const app = createApp();
    const server = http.createServer(app);

    // 4. Create Socket.IO Server & Register Realtime Handlers
    const io = new SocketIOServer(server, {
      cors: {
        origin: env.CORS_ORIGIN,
        credentials: true,
      },
      pingTimeout: 60000,
    });

    SocketService.init(io);

    // 5. Start Server
    server.listen(env.PORT, () => {
      logger.info(
        `🚀 [TaskMaster API] Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`,
      );
      logger.info(`🔗 Base API prefix: ${env.API_PREFIX}`);
      logger.info(`🩺 Health check: http://localhost:${env.PORT}/health`);
    });

    // 6. Graceful Shutdown Handlers
    const shutdown = async (signal: string) => {
      logger.info(`🛑 Received ${signal}. Starting graceful shutdown...`);

      // Stop receiving new connections
      server.close(async () => {
        logger.info('🛑 HTTP server closed.');

        try {
          // Close Socket.IO
          await io.close();
          // Close Redis
          await redisManager.disconnect();
          // Close MongoDB
          await db.disconnect();

          logger.info('✅ Graceful shutdown completed cleanly.');
          process.exit(0);
        } catch (err) {
          logger.error({ err }, '❌ Error during graceful shutdown');
          process.exit(1);
        }
      });

      // Force shutdown if taking longer than 10 seconds
      setTimeout(() => {
        logger.error('⚠️ Forcefully terminating after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, '💥 Fatal error during application bootstrap');
    process.exit(1);
  }
}

bootstrap();
