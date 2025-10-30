/*
 * 错误提示类型与规则接口定义（中文注释）
 * 目标：为 ErrorTip 规则系统提供统一的类型，便于扩展与复用。
 */

export interface ErrorItem {
  /** 错误所在行（1-based） */
  line: number
  /** 错误消息（中文说明） */
  msg: string
  /** 错误类型（如 always / is / control 等） */
  type: string
}

export interface RangeItem {
  /** 文档内起始偏移（包含） */
  from: number
  /** 文档内结束偏移（不包含） */
  to: number
  /** 错误消息 */
  message: string
  /** 错误类型 */
  type: string
  /** 对应首行（1-based），用于右侧列表定位 */
  line: number
}

export interface RuleResult {
  errors: ErrorItem[]
  ranges: RangeItem[]
}

export interface Rule {
  /** 规则名称（用于调试和类型标识） */
  name: string
  /**
   * 对内容执行检查，返回错误与范围（整行范围用于 Lint 高亮）
   * @param content 原始全文字符串
   * @param lines 按 \n 切分后的行
   * @param lineStarts 每行起始在全文中的偏移（包含行末换行的累加）
   * @param ctx 可选上下文（如文件路径、项目根目录）
   */
  apply(content: string, lines: string[], lineStarts: number[], ctx?: RuleContext): RuleResult
}

/**
 * 规则执行上下文
 */
export interface RuleContext {
  /** 当前文件的绝对路径 */
  filePath?: string
  /** 项目根目录绝对路径，用于严格限定路径规则（如 ./events） */
  projectRoot?: string
  /** 游戏目录绝对路径，用于扫描 ./common/ideas 等跨根路径 */
  gameDirectory?: string
}

/**
 * 计算每行在全文中的起始偏移
 * 说明：
 *  - 行划分采用 `split('\n')`，偏移计算以 `\n` 作为 1 个字符计入前一行长度
 */
export function computeLineStarts(lines: string[]): number[] {
  const starts: number[] = []
  let offset = 0
  for (let i = 0; i < lines.length; i++) {
    starts.push(offset)
    // 当前行长度 + 换行（除最后一行可能无换行）
    offset += lines[i].length + 1
  }
  return starts
}
