import { invoke } from '@tauri-apps/api/core'

// ==================== 类型定义 ====================

export interface CreateProjectResult {
  success: boolean
  message: string
  project_path?: string
}

export interface OpenProjectResult {
  success: boolean
  message: string
  project_data?: any
}

export interface RecentProject {
  name: string
  path: string
  last_opened: string
}

export interface RecentProjectsResult {
  success: boolean
  projects: RecentProject[]
}

export interface FileDialogResult {
  success: boolean
  path?: string
}

export interface JsonResult {
  success: boolean
  message: string
  data?: any
}

export interface JsonValidationResult {
  valid: boolean
  errors: string[]
}

// ==================== 项目管理 ====================

/**
 * 创建新项目
 */
export async function createNewProject(
  projectName: string,
  version: string,
  projectPath: string,
  replacePath: string[]
): Promise<CreateProjectResult> {
  return await invoke('create_new_project', {
    projectName,
    version,
    projectPath,
    replacePath
  })
}

/**
 * 打开现有项目
 */
export async function openProject(projectPath: string): Promise<OpenProjectResult> {
  return await invoke('open_project', { projectPath })
}

/**
 * 初始化项目
 */
export async function initializeProject(projectPath: string): Promise<OpenProjectResult> {
  return await invoke('initialize_project', { projectPath })
}

/**
 * 获取最近打开的项目列表
 */
export async function getRecentProjects(): Promise<RecentProjectsResult> {
  return await invoke('get_recent_projects')
}

/**
 * 打开文件选择对话框
 */
export async function openFileDialog(mode: 'directory' | 'file'): Promise<FileDialogResult> {
  return await invoke('open_file_dialog', { mode })
}

/**
 * 读取目录内容
 */
export async function readDirectory(dirPath: string): Promise<any> {
  return await invoke('read_directory', { dirPath })
}

/**
 * 创建文件
 */
export async function createFile(filePath: string, content: string, useBom: boolean = false): Promise<any> {
  return await invoke('create_file', { filePath, content, useBom })
}

/**
 * 创建文件夹
 */
export async function createFolder(folderPath: string): Promise<any> {
  return await invoke('create_folder', { folderPath })
}

/**
 * 打开文件夹
 */
export async function openFolder(path: string): Promise<any> {
  return await invoke('open_folder', { path })
}

/**
 * 读取文件内容
 */
export async function readFileContent(filePath: string): Promise<any> {
  return await invoke('read_file_content', { filePath })
}

/**
 * 写入文件内容
 */
export async function writeFileContent(filePath: string, content: string): Promise<any> {
  return await invoke('write_file_content', { filePath, content })
}

// ==================== 设置管理 ====================

/**
 * 加载设置
 */
export async function loadSettings(): Promise<JsonResult> {
  return await invoke('load_settings')
}

/**
 * 保存设置
 */
export async function saveSettings(settings: any): Promise<JsonResult> {
  return await invoke('save_settings', { settings })
}

/**
 * 验证游戏目录
 */
export async function validateGameDirectory(path: string): Promise<{ valid: boolean; message: string }> {
  return await invoke('validate_game_directory', { path })
}

// ==================== JSON 操作 ====================

/**
 * 解析 JSON 字符串
 */
export async function parseJson(jsonStr: string): Promise<JsonResult> {
  return await invoke('parse_json', { jsonStr })
}

/**
 * 序列化 JSON 对象
 */
export async function stringifyJson(value: any, pretty: boolean = true): Promise<JsonResult> {
  return await invoke('stringify_json', { value, pretty })
}

/**
 * 验证 JSON 格式
 */
export async function validateJson(jsonStr: string): Promise<JsonValidationResult> {
  return await invoke('validate_json', { jsonStr })
}

/**
 * 合并 JSON 对象
 */
export async function mergeJson(base: any, overlay: any, deep: boolean = false): Promise<JsonResult> {
  return await invoke('merge_json', { base, overlay, deep })
}

/**
 * 获取 JSON 路径值
 */
export async function getJsonPath(value: any, path: string): Promise<JsonResult> {
  return await invoke('get_json_path', { value, path })
}

/**
 * 设置 JSON 路径值
 */
export async function setJsonPath(value: any, path: string, newValue: any): Promise<JsonResult> {
  return await invoke('set_json_path', { value, path, newValue })
}

/**
 * 读取 JSON 文件
 */
export async function readJsonFile(filePath: string): Promise<JsonResult> {
  return await invoke('read_json_file', { filePath })
}

/**
 * 写入 JSON 文件
 */
export async function writeJsonFile(filePath: string, value: any, pretty: boolean = true): Promise<JsonResult> {
  return await invoke('write_json_file', { filePath, value, pretty })
}

// ==================== 其他 ====================

/**
 * 退出应用程序
 */
export async function exitApplication(): Promise<void> {
  await invoke('exit_application')
}

/**
 * 打开设置页面
 */
export async function openSettings(): Promise<any> {
  return await invoke('open_settings')
}

// ==================== 搜索功能 ====================

export interface SearchResult {
  file_name: string
  file_path: string
  line: number
  content: string
  match_start: number
  match_end: number
}

export interface SearchResponse {
  success: boolean
  message: string
  results: SearchResult[]
}

export async function searchFiles(
  directory: string,
  query: string,
  case_sensitive: boolean,
  use_regex: boolean
): Promise<SearchResponse> {
  return await invoke('search_files', {
    directoryPath: directory,
    query,
    caseSensitive: case_sensitive,
    useRegex: use_regex
  })
}

// ==================== 文件树构建 ====================

export interface FileNode {
  name: string
  path: string
  is_directory: boolean
  children?: FileNode[]
  size?: number
  expanded: boolean
}

export interface FileTreeResult {
  success: boolean
  message: string
  tree?: FileNode[]
}

export async function buildDirectoryTree(
  path: string,
  maxDepth: number = 0
): Promise<FileTreeResult> {
  return await invoke('build_directory_tree', { path, maxDepth })
}

export async function buildDirectoryTreeFast(
  path: string,
  maxDepth: number = 0
): Promise<FileTreeResult> {
  return await invoke('build_directory_tree_fast', { path, maxDepth })
}

// ==================== 括号匹配 ====================

export enum BracketType {
  Round = 'Round',
  Square = 'Square',
  Curly = 'Curly'
}

export interface BracketInfo {
  bracket_type: BracketType
  start: number
  end: number
  depth: number
  matched: boolean
}

export interface BracketMatchResult {
  success: boolean
  message: string
  brackets: BracketInfo[]
  unmatched: number[]
}

export async function matchBrackets(content: string): Promise<BracketMatchResult> {
  return await invoke('match_brackets', { content })
}

export async function findBracketPair(
  content: string,
  cursorPos: number
): Promise<number | null> {
  return await invoke('find_bracket_pair', { content, cursorPos })
}

export async function getBracketDepths(content: string): Promise<number[]> {
  return await invoke('get_bracket_depths', { content })
}
