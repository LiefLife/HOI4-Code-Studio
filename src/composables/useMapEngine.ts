import { ref } from 'vue'
import {
  loadDefaultMap,
  loadMapDefinitions,
  loadAllStates,
  type ProvinceDefinition,
  type DefaultMap,
  type StateDefinition,
  type RGBColor,
  initializeMapContext,
  getMapTileDirect,
  getMapMetadata,
  getMapPreview,
  getProvinceAtPoint,
  getProvinceOutline,
  type MapMetadata
} from '../api/tauri'

/**
 * 地图引擎组合式 API
 */
export function useMapEngine() {
  const definitions = ref<ProvinceDefinition[]>([])
  const defaultMap = ref<DefaultMap | null>(null)
  const mapData = ref<MapMetadata | null>(null)
  // const provinceIds = ref<Uint32Array | null>(null) // No longer needed in JS
  const states = ref<StateDefinition[]>([])
  const countryColors = ref<Record<string, RGBColor>>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  /**
   * 初始化地图数据 (后端托管模式)
   * @param projectPath 项目根目录
   */
  async function initMap(projectPath: string) {
    if (!projectPath) {
      error.value = '未指定项目路径'
      return
    }
    isLoading.value = true
    error.value = null
    
    const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
    const rootPath = normalize(projectPath)
    
    try {
      // 1. 加载 default.map
      // 通常位于 map/default.map
      const dmRes = await loadDefaultMap(`${rootPath}/map/default.map`)
      if (!dmRes.success || !dmRes.data) throw new Error(dmRes.message)
      defaultMap.value = dmRes.data

      // 解析 default.map 中的路径
      // HOI4 的 default.map 中的路径通常是相对于 map 目录的，或者是相对于根目录的
      const resolvePath = (relPath: string) => {
        const cleanRel = relPath.replace(/^[/\\]/, '')
        // 如果路径中不包含 / 或 \，说明它很可能就在 map 目录下
        if (!cleanRel.includes('/') && !cleanRel.includes('\\')) {
          return `${rootPath}/map/${cleanRel}`
        }
        // 否则认为是相对于根目录的
        return `${rootPath}/${cleanRel}`
      }

      const provincesPath = resolvePath(defaultMap.value.provinces)
      const definitionsPath = resolvePath(defaultMap.value.definitions)
      const statesPath = `${rootPath}/history/states`
      const countryColorsPath = `${rootPath}/common/countries/colors.txt`

      console.log('Initializing map with paths:', {
        provincesPath,
        definitionsPath,
        statesPath,
        countryColorsPath
      })

      // 2. 初始化 Rust 后端上下文
      // 这将把大地图数据加载到 Rust 内存中，而不是 JS 堆中
      await initializeMapContext(
        provincesPath,
        definitionsPath,
        statesPath,
        countryColorsPath
      )

      // 3. 获取基础元数据 (轻量级)
      const metadata = await getMapMetadata()
      mapData.value = metadata
      
      // 4. 加载前端需要的辅助数据 (Definitions, States)
      // Tooltip 和交互需要这些数据
      const defRes = await loadMapDefinitions(definitionsPath)
      if (defRes.success && defRes.data) {
        definitions.value = defRes.data
      }

      const loadedStates = await loadAllStates(statesPath)
      states.value = loadedStates
      
    } catch (e: any) {
      error.value = e.message
      console.error('Map init error:', e)
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 直接从 Rust 获取渲染好的切片
   */
  async function renderTile(x: number, y: number, zoom: number, mode: string): Promise<Uint8Array> {
     return await getMapTileDirect(x, y, zoom, mode)
  }

  /**
   * 获取地图预览图 (用于 Minimap)
   */
  async function getPreview(width: number, height: number, mode: string): Promise<Uint8Array> {
    return await getMapPreview(width, height, mode)
  }

  /**
   * 获取指定坐标的省份 ID
   */
  async function getProvinceId(x: number, y: number): Promise<number | null> {
    return await getProvinceAtPoint(x, y)
  }

  /**
   * 获取省份边缘轮廓
   */
  async function getOutline(provinceId: number): Promise<[number, number][]> {
    return await getProvinceOutline(provinceId)
  }

  return {
    definitions,
    defaultMap,
    mapData,
    states,
    countryColors,
    isLoading,
    error,
    initMap,
    renderTile,
    getPreview,
    getProvinceId,
    getOutline
  }
}
