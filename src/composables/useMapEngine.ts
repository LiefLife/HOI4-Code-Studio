import { ref } from 'vue'
import {
  loadDefaultMap,
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
   */
  async function initMap(mapDirPath: string, statesDirPath?: string, countryColorsPath?: string) {
    isLoading.value = true
    error.value = null
    
    const normalize = (p: string) => p.replace(/\\/g, '/').replace(/\/+$/, '')
    const baseMapPath = normalize(mapDirPath)
    
    try {
      // 1. 加载 default.map
      const dmRes = await loadDefaultMap(`${baseMapPath}/default.map`)
      if (!dmRes.success || !dmRes.data) throw new Error(dmRes.message)
      defaultMap.value = dmRes.data

      // 2. 初始化 Rust 后端上下文
      // 这将把大地图数据加载到 Rust 内存中，而不是 JS 堆中
      await initializeMapContext(
        `${baseMapPath}/${defaultMap.value.provinces}`,
        `${baseMapPath}/${defaultMap.value.definitions}`,
        statesDirPath ? normalize(statesDirPath) : '',
        countryColorsPath ? normalize(countryColorsPath) : ''
      )

      // 3. 获取基础元数据 (轻量级)
      const metadata = await getMapMetadata()
      mapData.value = metadata
      
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
