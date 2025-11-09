/**
 * 日志工具
 * 在开发环境启用日志，生产环境禁用
 */

const isDev = import.meta.env.DEV

export const logger = {
  /**
   * 普通日志
   */
  log(...args: unknown[]): void {
    if (isDev) {
      console.log('[HOI4 Studio]', ...args)
    }
  },

  /**
   * 警告日志
   */
  warn(...args: unknown[]): void {
    if (isDev) {
      console.warn('[HOI4 Studio]', ...args)
    }
  },

  /**
   * 错误日志（生产环境也会输出）
   */
  error(...args: unknown[]): void {
    console.error('[HOI4 Studio]', ...args)
  },

  /**
   * 调试日志
   */
  debug(...args: unknown[]): void {
    if (isDev) {
      console.debug('[HOI4 Studio]', ...args)
    }
  },

  /**
   * 信息日志
   */
  info(...args: unknown[]): void {
    if (isDev) {
      console.info('[HOI4 Studio]', ...args)
    }
  }
}
