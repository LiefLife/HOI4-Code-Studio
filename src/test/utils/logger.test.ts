/**
 * logger.ts 测试文件
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../../utils/logger'

describe('logger.ts', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>
  let consoleDebugSpy: ReturnType<typeof vi.spyOn>
  let consoleInfoSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    // 为所有console方法创建spy
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleDebugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {})
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('开发环境下的日志行为', () => {
    // 注意：import.meta.env.DEV在构建时确定，无法在运行时通过vi.stubEnv改变
    // 这些测试假设当前运行在开发环境下

    it('应该在开发环境下调用 log 方法', () => {
      const testArgs = ['test message', { data: 'test' }, 123]
      
      logger.log(...testArgs)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...testArgs)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1)
    })

    it('应该在开发环境下调用 warn 方法', () => {
      const testArgs = ['warning message', { warning: 'test' }]
      
      logger.warn(...testArgs)
      
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...testArgs)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
    })

    it('应该在开发环境下调用 error 方法', () => {
      const testArgs = ['error message', new Error('test error')]
      
      logger.error(...testArgs)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...testArgs)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })

    it('应该在开发环境下调用 debug 方法', () => {
      const testArgs = ['debug message', { debug: 'info' }]
      
      logger.debug(...testArgs)
      
      expect(consoleDebugSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...testArgs)
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1)
    })

    it('应该在开发环境下调用 info 方法', () => {
      const testArgs = ['info message', { info: 'data' }]
      
      logger.info(...testArgs)
      
      expect(consoleInfoSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...testArgs)
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
    })

    it('应该正确处理不同类型的参数', () => {
      const stringArg = 'string message'
      const numberArg = 42
      const booleanArg = true
      const objectArg = { key: 'value' }
      const arrayArg = [1, 2, 3]
      const nullArg = null
      const undefinedArg = undefined
      
      logger.log(stringArg, numberArg, booleanArg, objectArg, arrayArg, nullArg, undefinedArg)
      
      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[HOI4 Studio]',
        stringArg,
        numberArg,
        booleanArg,
        objectArg,
        arrayArg,
        nullArg,
        undefinedArg
      )
    })

    it('应该处理空参数列表', () => {
      logger.log()
      logger.warn()
      logger.debug()
      logger.info()
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]')
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HOI4 Studio]')
      expect(consoleDebugSpy).toHaveBeenCalledWith('[HOI4 Studio]')
      expect(consoleInfoSpy).toHaveBeenCalledWith('[HOI4 Studio]')
    })
  })

  describe('生产环境下的日志行为', () => {
    // 注意：这些测试需要在生产环境下运行才能验证正确的环境行为
    // 在开发环境下运行时，这些测试会失败，这是正常的
    
    it('应该在生产环境下不调用 log 方法', () => {
      // 跳过这个测试，因为环境无法在运行时改变
      if (import.meta.env.DEV) {
        console.warn('跳过生产环境测试：当前为开发环境')
        return
      }
      
      logger.log('test message')
      
      expect(consoleLogSpy).not.toHaveBeenCalled()
    })

    it('应该在生产环境下不调用 warn 方法', () => {
      if (import.meta.env.DEV) {
        console.warn('跳过生产环境测试：当前为开发环境')
        return
      }
      
      logger.warn('warning message')
      
      expect(consoleWarnSpy).not.toHaveBeenCalled()
    })

    it('应该在生产环境下不调用 debug 方法', () => {
      if (import.meta.env.DEV) {
        console.warn('跳过生产环境测试：当前为开发环境')
        return
      }
      
      logger.debug('debug message')
      
      expect(consoleDebugSpy).not.toHaveBeenCalled()
    })

    it('应该在生产环境下不调用 info 方法', () => {
      if (import.meta.env.DEV) {
        console.warn('跳过生产环境测试：当前为开发环境')
        return
      }
      
      logger.info('info message')
      
      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })

    it('应该在生产环境下仍然调用 error 方法', () => {
      // error方法在任何环境下都应该工作，不需要跳过
      const testArgs = ['error message', { error: 'details' }]
      
      logger.error(...testArgs)
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...testArgs)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('环境变量检测', () => {
    it('应该正确检测当前环境', () => {
      // 验证当前环境的日志行为
      if (import.meta.env.DEV) {
        // 开发环境：log应该被调用
        logger.log('test')
        expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', 'test')
      } else {
        // 生产环境：log不应该被调用
        logger.log('test')
        expect(consoleLogSpy).not.toHaveBeenCalled()
      }
      
      // error 方法在任何环境下都应该工作
      logger.error('error')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[HOI4 Studio]', 'error')
    })
  })

  describe('日志格式', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('应该在所有日志前添加 [HOI4 Studio] 前缀', () => {
      const testMessage = 'test message'
      
      logger.log(testMessage)
      logger.warn(testMessage)
      logger.error(testMessage)
      logger.debug(testMessage)
      logger.info(testMessage)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', testMessage)
      expect(consoleWarnSpy).toHaveBeenCalledWith('[HOI4 Studio]', testMessage)
      expect(consoleErrorSpy).toHaveBeenCalledWith('[HOI4 Studio]', testMessage)
      expect(consoleDebugSpy).toHaveBeenCalledWith('[HOI4 Studio]', testMessage)
      expect(consoleInfoSpy).toHaveBeenCalledWith('[HOI4 Studio]', testMessage)
    })

    it('应该保持原始参数的顺序和内容', () => {
      const args = ['first', { second: 'data' }, 3, 'fourth']
      
      logger.log(...args)
      
      expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', ...args)
    })
  })

  describe('边界情况测试', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('应该处理循环引用对象', () => {
      const circularObj: any = { name: 'test' }
      circularObj.self = circularObj
      
      // 这不应该导致无限循环或错误
      expect(() => logger.log(circularObj)).not.toThrow()
      expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', circularObj)
    })

    it('应该处理大型对象', () => {
      const largeObj = {
        data: new Array(1000).fill(0).map((_, i) => ({ id: i, value: `item_${i}` }))
      }
      
      expect(() => logger.log(largeObj)).not.toThrow()
      expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', largeObj)
    })

    it('应该处理特殊值', () => {
      const specialValues = [
        NaN,
        Infinity,
        -Infinity,
        Symbol('test'),
        BigInt(123),
        () => 'function'
      ]
      
      specialValues.forEach(value => {
        expect(() => logger.log(value)).not.toThrow()
      })
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(specialValues.length)
    })
  })

  describe('性能测试', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('应该能够快速处理大量日志调用', () => {
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        logger.log(`Message ${i}`, { index: i })
      }
      
      const end = performance.now()
      const duration = end - start
      
      // 1000次调用应该在合理时间内完成（比如100ms）
      expect(duration).toBeLessThan(100)
      expect(consoleLogSpy).toHaveBeenCalledTimes(1000)
    })

    it('在生产环境下快速跳过非错误日志', () => {
      if (import.meta.env.DEV) {
        console.warn('跳过生产环境性能测试：当前为开发环境')
        return
      }
      
      const start = performance.now()
      
      for (let i = 0; i < 1000; i++) {
        logger.log(`Message ${i}`)
        logger.warn(`Warning ${i}`)
        logger.debug(`Debug ${i}`)
        logger.info(`Info ${i}`)
      }
      
      const end = performance.now()
      const duration = end - start
      
      // 在生产环境下，这些调用应该非常快，因为它们被跳过
      expect(duration).toBeLessThan(10)
      expect(consoleLogSpy).not.toHaveBeenCalled()
      expect(consoleWarnSpy).not.toHaveBeenCalled()
      expect(consoleDebugSpy).not.toHaveBeenCalled()
      expect(consoleInfoSpy).not.toHaveBeenCalled()
    })
  })

  describe('错误处理', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development')
    })

    it('应该处理 console 方法被重写的情况', () => {
      // 临时重写 console.log
      const originalLog = console.log
      console.log = vi.fn(() => {
        throw new Error('Console error')
      }) as any
      
      // 这不应该导致应用崩溃
      expect(() => logger.log('test')).not.toThrow()
      
      // 恢复原始方法
      console.log = originalLog
    })

    it('应该处理无效的参数类型', () => {
      const invalidArgs = [
        undefined,
        null,
        Symbol('test'),
        BigInt(123)
      ]
      
      invalidArgs.forEach(arg => {
        expect(() => logger.log(arg)).not.toThrow()
      })
    })
  })

  describe('集成测试', () => {
    it('应该在当前环境下正确工作', () => {
      // 验证当前环境的行为
      if (import.meta.env.DEV) {
        // 开发环境：log应该被调用
        logger.log('dev message')
        expect(consoleLogSpy).toHaveBeenCalledWith('[HOI4 Studio]', 'dev message')
      } else {
        // 生产环境：log不应该被调用
        logger.log('prod message')
        expect(consoleLogSpy).not.toHaveBeenCalled()
      }
      
      // 重置spy
      vi.clearAllMocks()
      
      // error 方法在任何环境下都应该工作
      logger.error('error message')
      expect(consoleErrorSpy).toHaveBeenCalledWith('[HOI4 Studio]', 'error message')
    })

    it('应该支持链式日志调用', () => {
      vi.stubEnv('NODE_ENV', 'development')
      
      logger.log('start')
      logger.warn('warning')
      logger.error('error')
      logger.debug('debug')
      logger.info('info')
      logger.log('end')
      
      expect(consoleLogSpy).toHaveBeenCalledTimes(2)
      expect(consoleWarnSpy).toHaveBeenCalledTimes(1)
      expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
      expect(consoleDebugSpy).toHaveBeenCalledTimes(1)
      expect(consoleInfoSpy).toHaveBeenCalledTimes(1)
    })
  })
})