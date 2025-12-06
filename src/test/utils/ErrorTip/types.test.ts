import { describe, it, expect } from 'vitest'
import { 
  Severity, 
  ErrorItem, 
  RangeItem, 
  RuleResult, 
  Rule, 
  RuleContext, 
  computeLineStarts 
} from '../../../utils/ErrorTip/types'

describe('ErrorTip Types 测试', () => {
  describe('Severity 类型', () => {
    it('应该只接受 error 或 warning', () => {
      const errorSeverity: Severity = 'error'
      const warningSeverity: Severity = 'warning'
      
      expect(errorSeverity).toBe('error')
      expect(warningSeverity).toBe('warning')
    })
  })

  describe('ErrorItem 接口', () => {
    it('应该创建正确的错误项', () => {
      const errorItem: ErrorItem = {
        line: 1,
        msg: '这是一个错误消息',
        type: 'test-type',
        severity: 'error'
      }
      
      expect(errorItem.line).toBe(1)
      expect(errorItem.msg).toBe('这是一个错误消息')
      expect(errorItem.type).toBe('test-type')
      expect(errorItem.severity).toBe('error')
    })

    it('应该使用默认的严重程度', () => {
      const errorItem: ErrorItem = {
        line: 1,
        msg: '没有指定严重程度的错误',
        type: 'test-type'
      }
      
      expect(errorItem.severity).toBeUndefined()
    })

    it('应该支持 warning 严重程度', () => {
      const errorItem: ErrorItem = {
        line: 2,
        msg: '警告消息',
        type: 'warning-type',
        severity: 'warning'
      }
      
      expect(errorItem.severity).toBe('warning')
    })
  })

  describe('RangeItem 接口', () => {
    it('应该创建正确的范围项', () => {
      const rangeItem: RangeItem = {
        from: 0,
        to: 10,
        message: '范围错误消息',
        type: 'range-type',
        line: 1,
        severity: 'error'
      }
      
      expect(rangeItem.from).toBe(0)
      expect(rangeItem.to).toBe(10)
      expect(rangeItem.message).toBe('范围错误消息')
      expect(rangeItem.type).toBe('range-type')
      expect(rangeItem.line).toBe(1)
      expect(rangeItem.severity).toBe('error')
    })

    it('应该使用默认的严重程度', () => {
      const rangeItem: RangeItem = {
        from: 0,
        to: 10,
        message: '没有指定严重程度',
        type: 'range-type',
        line: 1
      }
      
      expect(rangeItem.severity).toBeUndefined()
    })
  })

  describe('RuleResult 接口', () => {
    it('应该创建正确的规则结果', () => {
      const errors: ErrorItem[] = [
        { line: 1, msg: '错误1', type: 'type1' },
        { line: 2, msg: '错误2', type: 'type2', severity: 'warning' }
      ]
      
      const ranges: RangeItem[] = [
        { from: 0, to: 10, message: '范围错误1', type: 'range1', line: 1 }
      ]
      
      const ruleResult: RuleResult = { errors, ranges }
      
      expect(ruleResult.errors).toHaveLength(2)
      expect(ruleResult.ranges).toHaveLength(1)
      expect(ruleResult.errors[0].msg).toBe('错误1')
      expect(ruleResult.ranges[0].message).toBe('范围错误1')
    })

    it('应该支持空结果', () => {
      const ruleResult: RuleResult = { errors: [], ranges: [] }
      
      expect(ruleResult.errors).toHaveLength(0)
      expect(ruleResult.ranges).toHaveLength(0)
    })
  })

  describe('Rule 接口', () => {
    it('应该定义正确的规则接口', () => {
      const mockRule: Rule = {
        name: 'test-rule',
        apply: (
        ): RuleResult => {
          return { errors: [], ranges: [] }
        }
      }
      
      expect(mockRule.name).toBe('test-rule')
      expect(typeof mockRule.apply).toBe('function')
    })
  })

  describe('RuleContext 接口', () => {
    it('应该创建正确的规则上下文', () => {
      const ruleContext: RuleContext = {
        filePath: '/path/to/file.txt',
        projectRoot: '/path/to/project',
        gameDirectory: '/path/to/game',
        disableErrorHandling: false
      }
      
      expect(ruleContext.filePath).toBe('/path/to/file.txt')
      expect(ruleContext.projectRoot).toBe('/path/to/project')
      expect(ruleContext.gameDirectory).toBe('/path/to/game')
      expect(ruleContext.disableErrorHandling).toBe(false)
    })

    it('应该支持可选属性', () => {
      const minimalContext: RuleContext = {}
      
      expect(minimalContext.filePath).toBeUndefined()
      expect(minimalContext.projectRoot).toBeUndefined()
      expect(minimalContext.gameDirectory).toBeUndefined()
      expect(minimalContext.disableErrorHandling).toBeUndefined()
    })
  })

  describe('computeLineStarts 函数', () => {
    it('应该正确计算空数组的起始位置', () => {
      const result = computeLineStarts([])
      expect(result).toEqual([])
    })

    it('应该正确计算单行的起始位置', () => {
      const lines = ['hello']
      const result = computeLineStarts(lines)
      expect(result).toEqual([0])
    })

    it('应该正确计算多行的起始位置', () => {
      const lines = ['hello', 'world', 'test']
      const result = computeLineStarts(lines)
      
      // 第一行从0开始
      // 第二行从 "hello" + "\n" = 5 + 1 = 6 开始
      // 第三行从 "hello\nworld" + "\n" = 5 + 1 + 5 + 1 = 12 开始
      expect(result).toEqual([0, 6, 12])
    })

    it('应该正确处理包含特殊字符的行', () => {
      const lines = ['héllo', 'wørld', 'tëst']
      const result = computeLineStarts(lines)
      
      // 每个字符都是单字节，所以计算应该正常
      expect(result).toEqual([0, 6, 12])
    })

    it('应该正确处理空行', () => {
      const lines = ['hello', '', 'world']
      const result = computeLineStarts(lines)
      
      // 第一行从0开始
      // 空行从 "hello" + "\n" = 5 + 1 = 6 开始，长度为0
      // 第三行从 "hello\n\n" = 5 + 1 + 0 + 1 = 7 开始
      expect(result).toEqual([0, 6, 7])
    })

    it('应该正确处理只有换行符的行', () => {
      const lines = ['hello', '\n', 'world']
      const result = computeLineStarts(lines)
      
      // 第一行从0开始，长度为5
      // 第二行从5+1=6开始，长度为1（换行符）
      // 第三行从5+1+1+1=8开始，长度为5
      expect(result).toEqual([0, 6, 8])
    })

    it('应该正确处理非常长的行', () => {
      const longLine = 'a'.repeat(1000)
      const lines = [longLine, 'short']
      const result = computeLineStarts(lines)
      
      expect(result).toEqual([0, 1001])
    })

    it('应该正确处理包含制表符的行', () => {
      const lines = ['hello\tworld', 'test']
      const result = computeLineStarts(lines)
      
      // "hello\tworld" 长度为 11 (5 + 1 + 5)
      // "test" 从 11 + 1 = 12 开始
      expect(result).toEqual([0, 12])
    })
  })
})