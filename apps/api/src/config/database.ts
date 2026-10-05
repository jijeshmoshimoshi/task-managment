import mongoose from 'mongoose';
import { env } from './env';
import { logger } from './logger';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  public async connect(): Promise<typeof mongoose> {
    if (this.isConnected) {
      return mongoose;
    }

    mongoose.connection.on('connected', () => {
      this.isConnected = true;
      logger.info('📦 MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      this.isConnected = false;
      logger.error({ err }, '❌ MongoDB connection error');
    });

    mongoose.connection.on('disconnected', () => {
      this.isConnected = false;
      logger.warn('⚠️ MongoDB disconnected. Attempting reconnection...');
    });

    try {
      const conn = await mongoose.connect(env.MONGODB_URI, {
        autoIndex: env.NODE_ENV !== 'production',
        maxPoolSize: 50,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      return conn;
    } catch (error) {
      logger.error({ error }, '❌ Failed to connect to MongoDB on boot');
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    logger.info('📦 MongoDB connection closed gracefully');
  }

  public getStatus(): { status: 'healthy' | 'unhealthy'; readyState: number } {
    const state = mongoose.connection.readyState;
    return {
      status: state === 1 ? 'healthy' : 'unhealthy',
      readyState: state,
    };
  }
}

export const db = DatabaseManager.getInstance();
