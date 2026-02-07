/**
 * cwtools 语法验证工具
 * 
 * 提供与后端 cwtools 验证服务的集成接口
 * 用于替代旧的 ErrorTip 系统，提供更准确的 HOI4 语法验证
 */

import { invoke } from '@tauri-apps/api/core'
import type { Diagnostic } from '@codemirror/lint'

/**
 * 诊断信息接口
 */
export interface CWToolsDiagnostic {
  code: string
  severity: 'error' | 'warning' | 'information' | 'hint'
  message: string
  range: {
    start: { line: number; column: number; offset: number }
    end: { line: number; column: number; offset: number }
  }
  source: string
  suggestions: Array<{
    message: string
    replacement?: string
  }>
}

/**
 * 验证响应接口
 */
export interface ValidationResponse {
  success: boolean
  diagnostics: CWToolsDiagnostic[]
  parse_time_ms: number
  validation_time_ms: number
  total_time_ms: number
}

/**
 * 文本变更接口
 */
export interface TextChange {
  range: {
    start: { line: number; column: number; offset: number }
    end: { line: number; column: number; offset: number }
  }
  text: string
}

/**
 * 初始化验证服务
 * 
 * @param rulePaths - 规则文件路径列表
 */
export async function initializeValidationService(rulePaths: string[]): Promise<void> {
  await invoke('initialize_validation_service', { rulePaths })
}

/**
 * 验证脚本内容
 * 
 * @param content - 脚本内容
 * @param filePath - 文件路径（可选）
 * @param version - 文件版本号（可选）
 * @param skipDebounce - 是否跳过防抖（可选）
 * @returns 验证响应
 */
export async function validateScript(
  content: string,
  filePath?: string,
  version?: number,
  skipDebounce?: boolean
): Promise<ValidationResponse> {
  return await invoke('validate_script', {
    content,
    filePath,
    version,
    skipDebounce
  })
}

/**
 * 增量验证脚本
 * 
 * @param content - 更新后的完整脚本内容
 * @param filePath - 文件路径
 * @param version - 新的文件版本号
 * @param changes - 文本变更列表
 * @returns 验证响应
 */
export async function validateScriptIncremental(
  content: string,
  filePath: string,
  version: number,
  changes: TextChange[]
): Promise<ValidationResponse> {
  return await invoke('validate_script_incremental', {
    content,
    filePath,
    version,
    changes
  })
}

/**
 * 加载引用数据
 * 
 * @param projectRoot - 项目根目录
 * @param gameRoot - 游戏根目录（可选）
 */
export async function loadReferences(
  projectRoot: string,
  gameRoot?: string
): Promise<void> {
  await invoke('load_references', { projectRoot, gameRoot })
}

/**
 * 重新加载规则
 * 
 * @param rulePaths - 规则文件路径列表（可选）
 */
export async function reloadRules(rulePaths?: string[]): Promise<void> {
  await invoke('reload_rules', { rulePaths })
}

/**
 * 清空验证缓存
 */
export async function clearValidationCache(): Promise<void> {
  await invoke('clear_validation_cache')
}

/**
 * 使指定文件的缓存失效
 * 
 * @param filePath - 文件路径
 */
export async function invalidateFileCache(filePath: string): Promise<void> {
  await invoke('invalidate_file_cache', { filePath })
}

/**
 * 将 cwtools 诊断信息转换为 CodeMirror 诊断格式
 * 
 * @param diagnostics - cwtools 诊断信息列表
 * @returns CodeMirror 诊断信息列表
 */
export function toCodeMirrorDiagnostics(diagnostics: CWToolsDiagnostic[]): Diagnostic[] {
  return diagnostics.map(d => ({
    from: d.range.start.offset,
    to: d.range.end.offset,
    severity: d.severity === 'error' ? 'error' : 
              d.severity === 'warning' ? 'warning' : 'info',
    message: d.message,
    source: 'cwtools'
  }))
}

/**
 * 创建 cwtools 验证器
 * 
 * 返回一个函数，可用于 CodeMirror 的 linter
 * 
 * @param getFilePath - 获取当前文件路径的函数
 * @param getVersion - 获取当前文件版本的函数
 * @returns 验证函数
 */
export function createCWToolsValidator(
  getFilePath: () => string | undefined,
  getVersion: () => number
) {
  return async (content: string): Promise<Diagnostic[]> => {
    try {
      const filePath = getFilePath()
      const version = getVersion()
      
      const response = await validateScript(content, filePath, version)
      
      return toCodeMirrorDiagnostics(response.diagnostics)
    } catch (error) {
      console.error('cwtools 验证失败:', error)
      return []
    }
  }
}

/**
 * 获取指定位置的诊断信息（用于悬停提示）
 * 
 * @param diagnostics - 诊断信息列表
 * @param offset - 光标位置偏移量
 * @returns 该位置的诊断信息列表
 */
export function getDiagnosticsAtPosition(
  diagnostics: CWToolsDiagnostic[],
  offset: number
): CWToolsDiagnostic[] {
  return diagnostics.filter(d => 
    offset >= d.range.start.offset && offset <= d.range.end.offset
  )
}

/**
 * 格式化诊断信息为悬停提示文本
 * 
 * @param diagnostics - 诊断信息列表
 * @returns 格式化的提示文本
 */
export function formatDiagnosticsForHover(diagnostics: CWToolsDiagnostic[]): string {
  if (diagnostics.length === 0) return ''
  
  return diagnostics.map(d => {
    let text = `[${d.severity.toUpperCase()}] ${d.message}`
    
    if (d.suggestions.length > 0) {
      text += '\n\n建议：'
      d.suggestions.forEach(s => {
        text += `\n  • ${s.message}`
        if (s.replacement) {
          text += ` → "${s.replacement}"`
        }
      })
    }
    
    return text
  }).join('\n\n---\n\n')
}


