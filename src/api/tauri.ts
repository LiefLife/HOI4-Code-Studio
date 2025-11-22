import { invoke } from '@tauri-apps/api/core'
import { openUrl as tauriOpenUrl } from '@tauri-apps/plugin-opener'

// ==================== 类型定义 ====================

export interface CreateProjectResult {
  success: boolean
  message: string
  project_path?: string
}

/**
 * 项目数据接口
 */
export interface ProjectData {
  name: string
  version: string
  path: string
  [key: string]: unknown
}

export interface OpenProjectResult {
  success: boolean
  message: string
  project_data?: ProjectData
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

export interface JsonResult<T = unknown> {
  success: boolean
  message: string
  data?: T
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
/**
 * 目录条目接口
 */
export interface DirectoryEntry {
  name: string
  path: string
  is_directory: boolean
  size?: number
}

export interface DirectoryResult {
  success: boolean
  message: string
  entries?: DirectoryEntry[]
}

export async function readDirectory(dirPath: string): Promise<DirectoryResult> {
  return await invoke('read_directory', { dirPath })
}

/**
 * 创建文件
 */
export interface FileOperationResult {
  success: boolean
  message: string
}

export async function createFile(filePath: string, content: string, useBom: boolean = false): Promise<FileOperationResult> {
  return await invoke('create_file', { filePath, content, useBom })
}

/**
 * 创建文件夹
 */
export async function createFolder(folderPath: string): Promise<FileOperationResult> {
  return await invoke('create_folder', { folderPath })
}

/**
 * 重命名文件或文件夹
 */
export async function renamePath(oldPath: string, newPath: string): Promise<FileOperationResult> {
  return await invoke('rename_path', { oldPath, newPath })
}

/**
 * 打开文件夹
 */
export async function openFolder(path: string): Promise<FileOperationResult> {
  return await invoke('open_folder', { path })
}

/**
 * 读取文件内容
 */
export interface FileContentResult {
  success: boolean
  message: string
  content: string
  encoding?: string
  is_binary?: boolean
  is_image?: boolean
}

export async function readFileContent(filePath: string): Promise<FileContentResult> {
  return await invoke('read_file_content', { filePath })
}

/**
 * 写入文件内容
 */
export async function writeFileContent(filePath: string, content: string): Promise<FileOperationResult> {
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
export interface Settings {
  gameDirectory?: string
  [key: string]: unknown
}

export async function saveSettings(settings: Settings): Promise<JsonResult> {
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
export async function stringifyJson(value: unknown, pretty: boolean = true): Promise<JsonResult<string>> {
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
export async function mergeJson(base: unknown, overlay: unknown, deep: boolean = false): Promise<JsonResult> {
  return await invoke('merge_json', { base, overlay, deep })
}

/**
 * 获取 JSON 路径值
 */
export async function getJsonPath(value: unknown, path: string): Promise<JsonResult> {
  return await invoke('get_json_path', { value, path })
}

/**
 * 设置 JSON 路径值
 */
export async function setJsonPath(value: unknown, path: string, newValue: unknown): Promise<JsonResult> {
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
export async function writeJsonFile(filePath: string, value: unknown, pretty: boolean = true): Promise<JsonResult> {
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
export async function openSettings(): Promise<FileOperationResult> {
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

// ==================== Country Tags ====================

export interface TagEntry {
  code: string
  name?: string
  source: 'project' | 'game' | 'dependency'
}

export interface TagLoadResponse {
  success: boolean
  message: string
  tags?: TagEntry[]
}

export async function loadCountryTags(
  projectRoot?: string,
  gameRoot?: string,
  dependencyRoots?: string[]
): Promise<TagLoadResponse> {
  return invoke<TagLoadResponse>('load_country_tags', { projectRoot, gameRoot, dependencyRoots })
}

export interface TagValidationError {
  line: number
  message: string
}

export interface TagValidationResponse {
  success: boolean
  message: string
  errors: TagValidationError[]
}

export async function validateTags(
  content: string,
  projectRoot?: string,
  gameRoot?: string,
  dependencyRoots?: string[]
): Promise<TagValidationResponse> {
  return invoke<TagValidationResponse>('validate_tags', { content, projectRoot, gameRoot, dependencyRoots })
}

// ==================== idea ====================

export interface IdeaEntry {
  id: string
  source: 'project' | 'game' | 'dependency'
}

export interface IdeaLoadResponse {
  success: boolean
  message: string
  ideas?: IdeaEntry[]
}

export async function loadIdeas(
  projectRoot?: string,
  gameRoot?: string,
  dependencyRoots?: string[]
): Promise<IdeaLoadResponse> {
  return invoke<IdeaLoadResponse>('load_ideas', { projectRoot, gameRoot, dependencyRoots })
}

export async function resetIdeaCache(): Promise<boolean> {
  return await invoke('reset_idea_cache')
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

// ==================== 外部链接 ====================

/**
 * 在默认浏览器中打开URL
 */
export async function openUrl(url: string): Promise<void> {
  await tauriOpenUrl(url)
}

// ==================== 游戏启动 ====================

/**
 * 启动游戏结果
 */
export interface LaunchGameResult {
  success: boolean
  message: string
}

/**
 * 启动游戏
 */
export async function launchGame(): Promise<LaunchGameResult> {
  return await invoke('launch_game')
}

// ==================== 依赖项管理 ====================

/**
 * 依赖项类型
 */
export type DependencyType = 'hoics' | 'hoi4mod'

/**
 * 依赖项接口
 */
export interface Dependency {
  id: string
  name: string
  path: string
  type: DependencyType
  addedAt: string
  enabled: boolean
}

/**
 * 依赖项验证结果
 */
export interface DependencyValidation {
  valid: boolean
  message: string
  name?: string
  type?: DependencyType
}

/**
 * 依赖项加载结果
 */
export interface DependencyLoadResult {
  success: boolean
  message: string
  dependencies?: Dependency[]
}

/**
 * 依赖项保存结果
 */
export interface DependencySaveResult {
  success: boolean
  message: string
}

/**
 * 依赖项索引结果
 */
export interface DependencyIndexResult {
  success: boolean
  message: string
  ideaCount?: number
  tagCount?: number
}

/**
 * 加载项目的依赖项列表
 */
export async function loadDependencies(projectPath: string): Promise<DependencyLoadResult> {
  return await invoke('load_dependencies', { projectPath })
}

/**
 * 保存项目的依赖项列表
 */
export async function saveDependencies(
  projectPath: string,
  dependencies: Dependency[]
): Promise<DependencySaveResult> {
  return await invoke('save_dependencies', { projectPath, dependencies })
}

/**
 * 验证依赖项路径
 */
export async function validateDependencyPath(path: string): Promise<DependencyValidation> {
  return await invoke('validate_dependency_path', { path })
}

/**
 * 索引依赖项的 Idea 和 Tag 数据
 */
export async function indexDependency(dependencyPath: string): Promise<DependencyIndexResult> {
  return await invoke('index_dependency', { dependencyPath })
}

// ==================== 项目打包 ====================

/**
 * 打包选项
 */
export interface PackageOptions {
  projectPath: string
  outputName: string
  excludeDependencies: boolean
}

/**
 * 打包结果
 */
export interface PackageResult {
  success: boolean
  message: string
  outputPath?: string
  fileSize?: number
}

/**
 * 打包项目
 */
export async function packProject(options: PackageOptions): Promise<PackageResult> {
  return await invoke('pack_project', {
    projectPath: options.projectPath,
    outputName: options.outputName,
    excludeDependencies: options.excludeDependencies
  })
}

// ==================== 图片读取 ====================

/**
 * 图片读取结果
 */
export interface ImageReadResult {
  success: boolean
  message?: string
  base64?: string
  mimeType?: string
}

/**
 * 读取图片文件为 base64
 */
export async function readImageAsBase64(filePath: string): Promise<ImageReadResult> {
  return await invoke('read_image_as_base64', { filePath })
}
