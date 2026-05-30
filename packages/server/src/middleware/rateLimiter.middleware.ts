import rateLimit, { type Store } from 'express-rate-limit';
import { config } from '../config/index';

const isDev = process.env.NODE_ENV !== 'production';

function createStore(prefix: string): Store | undefined {
  if (!config.REDIS_HOST) {
    return undefined; // Falls back to in-memory store
  }

  try {
    const RedisStore = require('rate-limit-redis').default;
    const { redisClient } = require('../config/redis');
    return new RedisStore({
      sendCommand: (...args: string[]) =>
        redisClient.call(args[0], ...args.slice(1)) as Promise<unknown>,
      prefix: `rl:${prefix}:`,
    });
  } catch {
    return undefined;
  }
}

export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 1000 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('general'),
  message: {
    status: 'error',
    message: 'Too many requests, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 100 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('auth'),
  message: {
    status: 'error',
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED',
  },
});

export const scanLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isDev ? 50 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: createStore('scan'),
  message: {
    status: 'error',
    message: 'Too many scan requests, please try again later.',
    code: 'SCAN_RATE_LIMIT_EXCEEDED',
  },
});
