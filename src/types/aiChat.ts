export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  reasoning?: string
  showReasoning?: boolean
  startedAt?: number
  finishedAt?: number
  reasoningMs?: number
  createdAt: number
  pending?: boolean
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
  projectTree?: string
  projectTreeInjected?: boolean
}

export type ToolName = 'list_dir' | 'read_file' | 'edit_file'

export interface ToolCallBase {
  tool: ToolName
}

export interface ToolCallListDir extends ToolCallBase {
  tool: 'list_dir'
  path?: string
  paths?: string[]
  start?: number
  end?: number
}

export interface ToolCallReadFile extends ToolCallBase {
  tool: 'read_file'
  path?: string
  paths?: string[]
  start?: number
  end?: number
}

export interface ToolCallEditFile extends ToolCallBase {
  tool: 'edit_file'
  path: string
  content: string
  confirm?: boolean
}

export type ToolCall = ToolCallListDir | ToolCallReadFile | ToolCallEditFile
