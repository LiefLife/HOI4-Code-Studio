/**
 * 日志工具
 * 在开发环境启用日志，生产环境禁用
 */

const isDev = import.meta.env.DEV

// 安全调用console方法的包装函数
function safeConsoleCall(consoleMethod: (...args: unknown[]) => void, ...args: unknown[]): void {
  try {
    consoleMethod(...args)
  } catch (error) {
    // 如果console方法被重写且抛出错误，我们静默处理
    // 这确保logger不会导致应用崩溃
  }
}

export const logger = {
  /**
   * 普通日志
   */
  log(...args: unknown[]): void {
    if (isDev) {
      safeConsoleCall(console.log, '[HOI4 Studio]', ...args)
    }
  },

  /**
   * 警告日志
   */
  warn(...args: unknown[]): void {
    if (isDev) {
      safeConsoleCall(console.warn, '[HOI4 Studio]', ...args)
    }
  },

  /**
   * 错误日志（生产环境也会输出）
   */
  error(...args: unknown[]): void {
    safeConsoleCall(console.error, '[HOI4 Studio]', ...args)
  },

  /**
   * 调试日志
   */
  debug(...args: unknown[]): void {
    if (isDev) {
      safeConsoleCall(console.debug, '[HOI4 Studio]', ...args)
    }
  },

  /**
   * 信息日志
   */
  info(...args: unknown[]): void {
    if (isDev) {
      safeConsoleCall(console.info, '[HOI4 Studio]', ...args)
    }
  }
}
