/**
 * Production-safe logger utility
 * Only logs in development environment
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (isDev) console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (isDev) console.debug(...args);
  },
};

// No-op logger for complete silence in production
export const devLog = isDev ? console.log : () => {};
export const devWarn = isDev ? console.warn : () => {};
export const devError = isDev ? console.error : () => {};
