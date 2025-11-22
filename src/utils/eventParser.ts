/**
 * HOI4 事件文件解析器
 * 解析 country_event 的调用关系，构建事件因果关系图谱
 */

/**
 * 事件节点接口
 */
export interface EventNode {
  id: string          // 事件ID，如 my_event.1
  title?: string      // 事件标题
  desc?: string       // 事件描述
  children: string[]  // 该事件调用的子事件ID列表
  line: number        // 在源文件中的起始行号（1-based）
  endLine?: number    // 在源文件中的结束行号
}

/**
 * 事件关系图谱接口
 */
export interface EventGraph {
  nodes: Map<string, EventNode>  // 所有事件节点
  rootNodes: string[]             // 根节点（没有被其他事件调用的事件）
}

/**
 * 查找字符串中指定位置对应的行号
 */
function getLineNumber(content: string, position: number): number {
  const beforeContent = content.substring(0, position)
  return beforeContent.split('\n').length
}


//Fuck U TYPESCRIPT
/**
 * 查找块的结束位置
 * @param content 完整内容
 * @param startPos 开始位置（应该是开括号 { 之后的位置）
 * @returns 结束括号 } 的位置，如果找不到返回 -1
 */
function findBlockEnd(content: string, startPos: number): number {
  let depth = 1  // 修复：因为 startPos 已经在第一个 { 之后，所以初始深度为 1
  let i = startPos
  let inLineComment = false
  let inString = false

  while (i < content.length) {
    const char = content[i]

    // 处理行注释
    if (!inString && char === '#') {
      inLineComment = true
      i++
      continue
    }

    if (inLineComment) {
      if (char === '\n') {
        inLineComment = false
      }
      i++
      continue
    }

    // 处理字符串
    if (char === '"') {
      if (i > 0 && content[i - 1] !== '\\') {
        inString = !inString
      }
      i++
      continue
    }

    if (inString) {
      i++
      continue
    }

    // 计算括号深度
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        return i
      }
    }

    i++
  }

  return -1
}

/**
 * 提取事件块中的 id
 */
function extractEventId(blockContent: string): string | null {
  // 匹配 id = xxx 或 id = "xxx"
  const idMatch = blockContent.match(/\bid\s*=\s*(["\']?)([a-zA-Z0-9_.]+)\1/)
  return idMatch ? idMatch[2] : null
}

/**
 * 提取事件块中的 title
 */
function extractTitle(blockContent: string): string | undefined {
  // 匹配 title = xxx 或 title = "xxx"
  const titleMatch = blockContent.match(/\btitle\s*=\s*(["\']?)([^"\n#]+)\1/)
  return titleMatch ? titleMatch[2].trim() : undefined
}

/**
 * 提取事件块中的 desc
 */
function extractDesc(blockContent: string): string | undefined {
  // 匹配 desc = xxx 或 desc = "xxx"
  const descMatch = blockContent.match(/\bdesc\s*=\s*(["\']?)([^"\n#]+)\1/)
  return descMatch ? descMatch[2].trim() : undefined
}

/**
 * 提取事件块中所有 option 调用的子事件ID
 */
function extractChildEvents(blockContent: string): string[] {
  const children: string[] = []
  
  // 查找所有 option 块
  const optionRegex = /option\s*=\s*\{/g
  let optionMatch: RegExpExecArray | null

  while ((optionMatch = optionRegex.exec(blockContent)) !== null) {
    const optionStart = optionMatch.index + optionMatch[0].length
    const optionEnd = findBlockEnd(blockContent, optionStart)
    
    if (optionEnd === -1) continue

    const optionContent = blockContent.substring(optionStart, optionEnd)
    
    // 在 option 块中查找 country_event 调用
    // 形式1: country_event = event_id (直接调用)
    const directCallMatch = optionContent.match(/\bcountry_event\s*=\s*(["\']?)([a-zA-Z0-9_.]+)\1(?!\s*\{)/)
    if (directCallMatch) {
      children.push(directCallMatch[2])
      continue
    }

    // 形式2: country_event = { id = event_id } (块调用，支持多行)
    // 使用 [\s\S] 而不是 . 来匹配包括换行符在内的所有字符
    const blockCallMatch = optionContent.match(/\bcountry_event\s*=\s*\{[\s\S]*?\bid\s*=\s*(["\']?)([a-zA-Z0-9_.]+)\1[\s\S]*?\}/)
    if (blockCallMatch) {
      children.push(blockCallMatch[2])
    }
  }

  return children
}

/**
 * 解析事件文件内容，构建事件关系图谱
 */
export function parseEventFile(content: string): EventGraph {
  const nodes = new Map<string, EventNode>()
  const allEventIds = new Set<string>()
  const calledEventIds = new Set<string>()

  // 查找所有 country_event 块
  const eventRegex = /\bcountry_event\s*=\s*\{/g
  let match: RegExpExecArray | null

  while ((match = eventRegex.exec(content)) !== null) {
    const blockStart = match.index + match[0].length
    const blockEnd = findBlockEnd(content, blockStart)

    if (blockEnd === -1) continue

    const blockContent = content.substring(match.index, blockEnd + 1)
    const eventId = extractEventId(blockContent)

    if (!eventId) {
      // 跳过这个块，继续下一个
      eventRegex.lastIndex = blockEnd + 1
      continue
    }

    // 计算行号
    const startLine = getLineNumber(content, match.index)
    const endLine = getLineNumber(content, blockEnd)

    // 提取子事件
    const children = extractChildEvents(blockContent)
    
    // 记录所有被调用的事件
    children.forEach(childId => calledEventIds.add(childId))

    // 创建事件节点
    const node: EventNode = {
      id: eventId,
      title: extractTitle(blockContent),
      desc: extractDesc(blockContent),
      children,
      line: startLine,
      endLine
    }

    nodes.set(eventId, node)
    allEventIds.add(eventId)
    
    // 重要：跳过已处理的块，避免重复解析嵌套的 country_event
    eventRegex.lastIndex = blockEnd + 1
  }

  // 确定根节点（没有被其他事件调用的事件）
  const rootNodes: string[] = []
  allEventIds.forEach(eventId => {
    if (!calledEventIds.has(eventId)) {
      rootNodes.push(eventId)
    }
  })

  return {
    nodes,
    rootNodes
  }
}

/**
 * 构建事件调用层级结构
 * 返回从根节点开始的层级数组
 */
export interface EventLayer {
  level: number
  eventIds: string[]
}

export function buildEventLayers(graph: EventGraph): EventLayer[] {
  const layers: EventLayer[] = []
  const visited = new Set<string>()
  const queue: Array<{ eventId: string; level: number }> = []

  // 从根节点开始
  graph.rootNodes.forEach(rootId => {
    queue.push({ eventId: rootId, level: 0 })
  })

  while (queue.length > 0) {
    const { eventId, level } = queue.shift()!

    if (visited.has(eventId)) continue
    visited.add(eventId)

    // 确保层级数组有足够的长度
    while (layers.length <= level) {
      layers.push({ level: layers.length, eventIds: [] })
    }

    layers[level].eventIds.push(eventId)

    // 添加子节点到队列
    const node = graph.nodes.get(eventId)
    if (node) {
      node.children.forEach(childId => {
        if (!visited.has(childId)) {
          queue.push({ eventId: childId, level: level + 1 })
        }
      })
    }
  }

  return layers
}
