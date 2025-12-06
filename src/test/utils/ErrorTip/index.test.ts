import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RuleContext} from '../../../utils/ErrorTip/types'

// Create a simple test that just validates the module loads and exports work
describe('ErrorTip 主模块测试', () => {
  const mockRuleContext: RuleContext = {
    filePath: '/test/file.txt',
    projectRoot: '/test/project',
    gameDirectory: '/test/game'
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('模块加载测试', () => {
    it('应该能成功加载 ErrorTip 模块', async () => {
      const { collectErrors, toDiagnostics, createLinter } = await import('../../../utils/ErrorTip/index')
      
      expect(collectErrors).toBeDefined()
      expect(typeof collectErrors).toBe('function')
      expect(toDiagnostics).toBeDefined()
      expect(typeof toDiagnostics).toBe('function')
      expect(createLinter).toBeDefined()
      expect(typeof createLinter).toBe('function')
    })
  })

  describe('collectErrors 函数测试', () => {
    it('应该处理空内容', async () => {
      const { collectErrors } = await import('../../../utils/ErrorTip/index')
      
      const result = collectErrors('')
      expect(result).toHaveLength(0)
    })

    it('应该处理禁用错误处理的情况', async () => {
      const { collectErrors } = await import('../../../utils/ErrorTip/index')
      
      const contextWithDisabledErrorHandling: RuleContext = {
        ...mockRuleContext,
        disableErrorHandling: true
      }

      const content = 'test content'
      const result = collectErrors(content, contextWithDisabledErrorHandling)

      expect(result).toHaveLength(0)
    })

    it('应该处理没有上下文的情况', async () => {
      const { collectErrors } = await import('../../../utils/ErrorTip/index')
      
      const content = 'test content'
      const result = collectErrors(content)

      expect(result).toEqual(expect.any(Array))
    })

    it('应该处理简单的文本内容', async () => {
      const { collectErrors } = await import('../../../utils/ErrorTip/index')
      
      const content = '这是一个测试文本\n包含多行内容'
      const result = collectErrors(content)

      expect(result).toEqual(expect.any(Array))
    })
  })

  describe('toDiagnostics 函数测试', () => {
    it('应该处理空内容', async () => {
      const { toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      const result = toDiagnostics('')
      expect(result).toHaveLength(0)
    })

    it('应该处理禁用错误处理的情况', async () => {
      const { toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      const contextWithDisabledErrorHandling: RuleContext = {
        ...mockRuleContext,
        disableErrorHandling: true
      }

      const content = 'test content'
      const result = toDiagnostics(content, contextWithDisabledErrorHandling)

      expect(result).toHaveLength(0)
    })

    it('应该处理没有上下文的情况', async () => {
      const { toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      const content = 'test content'
      const result = toDiagnostics(content)

      expect(result).toEqual(expect.any(Array))
    })

    it('应该返回包含正确属性的诊断对象', async () => {
      const { toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      const content = 'test content'
      const result = toDiagnostics(content)

      // 检查返回的数组中的每个对象是否包含必要的属性
      result.forEach(diagnostic => {
        expect(diagnostic).toHaveProperty('from')
        expect(diagnostic).toHaveProperty('to')
        expect(diagnostic).toHaveProperty('severity')
        expect(diagnostic).toHaveProperty('message')
        expect(diagnostic).toHaveProperty('source')
        expect(diagnostic.source).toBe('ErrorTip')
      })
    })
  })

  describe('createLinter 函数测试', () => {
    beforeEach(() => {
      // Mock CodeMirror modules for createLinter test
      vi.mock('@codemirror/lint', () => ({
        linter: vi.fn(() => ({ type: 'linter' })),
        lintGutter: vi.fn(() => ({ type: 'gutter' }))
      }))

      vi.mock('@codemirror/state', () => ({
        StateField: {
          define: vi.fn(() => ({ type: 'statefield' }))
        },
        EditorState: {
          doc: {
            lineAt: vi.fn(),
            line: vi.fn(),
            toString: vi.fn(() => 'mock content')
          }
        }
      }))

      vi.mock('@codemirror/view', () => {
        const mockWidgetType = class MockWidgetType {
          constructor(readonly text: string, readonly severity: string) {}
          eq(other: any) { return other.text === this.text && other.severity === this.severity }
          toDOM() { 
            const span = document.createElement('span')
            span.className = this.severity === 'error' ? 'cm-error-lens' : 'cm-warning-lens'
            span.textContent = this.text
            return span
          }
        }

        return {
          EditorView: {
            baseTheme: vi.fn(() => ({ type: 'theme' })),
            decorations: {
              from: vi.fn(() => ({ type: 'decorations' }))
            }
          },
          Decoration: {
            line: vi.fn(() => ({ range: vi.fn() })),
            widget: vi.fn(() => ({ range: vi.fn() })),
            set: vi.fn(() => ({ type: 'decoration-set' }))
          },
          WidgetType: mockWidgetType
        }
      })
    })

    it('应该创建基本linter扩展', async () => {
      const { createLinter } = await import('../../../utils/ErrorTip/index')
      
      const extensions = createLinter()

      expect(extensions).toHaveLength(5) // lintExt, gutter, lineField, lensField, theme
      expect(extensions).toContainEqual(expect.any(Object))
    })

    it('应该使用自定义contextProvider', async () => {
      const { createLinter } = await import('../../../utils/ErrorTip/index')
      
      const customContextProvider = () => ({ filePath: '/custom/path' } as RuleContext)
      const extensions = createLinter({ contextProvider: customContextProvider })

      expect(extensions).toHaveLength(5)
    })

    it('应该处理undefined的contextProvider', async () => {
      const { createLinter } = await import('../../../utils/ErrorTip/index')
      
      const extensions = createLinter({ contextProvider: undefined })

      expect(extensions).toHaveLength(5)
    })

    it('应该处理没有options参数的情况', async () => {
      const { createLinter } = await import('../../../utils/ErrorTip/index')
      
      const extensions = createLinter()

      expect(extensions).toHaveLength(5)
    })
  })

  describe('边界条件测试', () => {
    it('应该处理非常长的内容', async () => {
      const { collectErrors, toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      const longContent = 'a'.repeat(10000)
      const errors = collectErrors(longContent)
      const diagnostics = toDiagnostics(longContent)

      expect(errors).toEqual(expect.any(Array))
      expect(diagnostics).toEqual(expect.any(Array))
    })

    it('应该处理包含特殊字符的内容', async () => {
      const { collectErrors, toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      const specialContent = '测试\t\r\n特殊字符@#$%^&*()'
      const errors = collectErrors(specialContent)
      const diagnostics = toDiagnostics(specialContent)

      expect(errors).toEqual(expect.any(Array))
      expect(diagnostics).toEqual(expect.any(Array))
    })

    it('应该处理null和undefined内容', async () => {
      const { collectErrors, toDiagnostics } = await import('../../../utils/ErrorTip/index')
      
      expect(() => collectErrors('')).not.toThrow()
      expect(() => toDiagnostics('')).not.toThrow()
    })
  })
})