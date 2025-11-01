import { computed, type ComputedRef } from 'vue'
import type { Completion } from '@codemirror/autocomplete'
import type { IdeaEntry, TagEntry } from '../api/tauri'
import { useIdeaRegistry } from './useIdeaRegistry'
import { useTagRegistry } from './useTagRegistry'

/**
 * GrammarCompletionItem 负责描述补全项的核心元数据
 * 增加来源字段，便于后续排序与调试
 */
export interface GrammarCompletionItem extends Completion {
  /**
   * 来源标签，标识补全项属于何种数据源
   */
  source: 'keyword' | 'idea' | 'tag'
}

/**
 * 静态关键字列表，来自 mission.txt 任务描述
 * 该列表会在初始化时转换为补全项常量
 */
const STATIC_KEYWORDS: string[] = [
  'if',
  'else',
  'limit',
  'set_variable',
  'set_temp_variable',
  'var',
  'value',
  'add_to_variable',
  'subtract_from_variable',
  'multiply_variable',
  'divide_variable',
  'modulo_variable',
  'randomize_variable',
  'clamp_variable',
  'min',
  'max',
  'lambda',
  'distribution',
  'round_variable',
  'clear_variable',
  'Orientation',
  'democratic',
  'fascism',
  'communism',
  'neutrality',
  'conservatism',
  'liberalism',
  'socialism',
  'populism',
  'marxism',
  'leninism',
  'stalinism',
  'anti_revisionism',
  'anarchist_communism',
  'nazism',
  'gen_nazism',
  'fascism_ideology',
  'falangism',
  'rexism',
  'despotism',
  'oligarchism',
  'anarchism',
  'moderatism',
  'centrism',
  'add_tech_bonus',
  'light_air',
  'medium_air',
  'heavy_air',
  'armor',
  'cat_light_armor',
  'cat_medium_armor',
  'cat_heavy_armor',
  'artillery',
  'cat_anti_tank',
  'cat_anti_air',
  'naval_air',
  'infantry_weapons',
  'motorized_equipment',
  'cat_mechanized_equipment',
  'naval_equipment',
  'rocketry',
  'nuclear',
  'industry',
  'electronics',
  'cat_fortification',
  'land_doctrine',
  'air_doctrine',
  'naval_doctrine',
  'strategic_destruction_tree',
  'battlefield_support_tree',
  'operational_integrity_tree',
  'jet_technology',
  'trade_interdiction_tree',
  'convoy_defense_tree',
  'light_fighter',
  'cat_heavy_fighter',
  'tactical_bomber',
  'cat_strategic_bomber',
  'naval_bomber',
  'cas_bomber',
  'ship_modules_tech',
  'dd_tech',
  'cl_tech',
  'ca_tech',
  'cv_tech',
  'bc_tech',
  'bb_tech',
  'shbb_tech',
  'ss_tech',
  'tp_tech',
  'synth_resources',
  'fleet_in_being_tree',
  'encryption_tech',
  'decryption_tech',
  'computing_tech',
  'radar_tech',
  'infantry_tech',
  'marine_tech',
  'construction_tech',
  'excavation_tech',
  'submarine_doctrine',
  'air_equipment',
  'cat_mobile_warfare',
  'cat_superior_firepower',
  'cat_grand_battle_plan',
  'cat_mass_assault',
  'cat_base_strike',
  'cat_trade_interdiction',
  'cat_fleet_in_being',
  'cat_strategic_destruction',
  'cat_battlefield_support',
  'cat_operational_integrity',
  'night_vision',
  'base_strike_main',
  'mot_rockets',
  'support_tech',
  'para_tech',
  'engineers_tech',
  'recon_tech',
  'mountaineers_tech',
  'military_police_tech',
  'hospital_tech',
  'logistics_tech',
  'signal_company_tech',
  'maintenance_company_tech',
  'naval_mines',
  'concentrated_industry_category',
  'dispersed_industry_category',
  'asw_tech',
  'naval_minesweeping',
  'naval_minelaying',
  'cat_scout_plane',
  'train_tech',
  'cat_production',
  'cat_synth_rubber',
  'cat_synth_oil',
  'cat_armored_cars',
  'cat_special_forces_generic',
  'cat_torpedoes',
  'cat_ship_light_battery',
  'cat_ship_medium_battery',
  'cat_ship_heavy_battery',
  'plane_modules_tech',
  'cat_air_guns',
  'cat_air_engine',
  'cat_air_bombs',
  'special_forces_doctrine',
  'cat_maritime_patrol',
  'cat_mountaineers_doctrine',
  'cat_marines_doctrine',
  'cat_paratroopers_doctrine',
  'naval_armor',
  'naval_artillery',
  'helicopter_tech',
  'pykrete_tech',
  'transport_planes_cat',
  'mio_cat_tech_all_armor_and_modules',
  'mio_cat_tech_light_armor_and_modules',
  'mio_cat_tech_medium_armor_and_modules',
  'mio_cat_tech_heavy_armor_and_modules',
  'mio_cat_all_artillery_equipment',
  'mio_cat_all_light_fighter_and_modules',
  'mio_cat_all_cas_and_modules',
  'mio_cat_all_naval_bomber_and_modules',
  'mio_cat_all_light_aircraft_and_modules',
  'mio_cat_all_medium_aircraft_and_modules',
  'mio_cat_all_heavy_aircraft_and_modules',
  'mio_cat_tech_all_capital_ship_and_modules',
  'mio_cat_tech_all_screen_ship_and_modules',
  'mio_cat_tech_all_submarine_and_modules',
  'mio_cat_tech_all_carrier_and_modules',
  'mio_cat_tech_all_cruiser_and_modules',
  'mio_cat_tech_all_destroyer_and_modules',
  'mio_cat_tech_all_motorized_mechanized',
  'mio_cat_artillery',
  'allowed',
  'visible',
  'available',
  'OR',
  'AND',
  'NOT',
  'bypass',
  'custom_trigger_tooltip',
  'id'
]

/**
 * 静态补全项常量，避免重复创建对象
 */
const STATIC_COMPLETIONS: GrammarCompletionItem[] = STATIC_KEYWORDS.map((keyword) => ({
  label: keyword,
  type: 'keyword',
  detail: '',
  boost: 50,
  source: 'keyword'
}))

/**
 * 创建 Idea 补全项
 * @param ideas 当前加载的 Idea 列表
 */
function createIdeaCompletions(ideas: IdeaEntry[]): GrammarCompletionItem[] {
  return ideas.map((idea) => ({
    label: idea.id,
    type: 'variable',
    detail: `[Idea -> (${idea.source === 'game' ? '游戏内置' : '项目自定义'})]`,
    boost: 30,
    source: 'idea'
  }))
}

/**
 * 创建 Tag 补全项
 * @param tags 当前加载的国家标签列表
 */
function createTagCompletions(tags: TagEntry[]): GrammarCompletionItem[] {
  return tags.map((tag) => ({
    label: tag.code,
    type: 'variable',
    detail: `【Tag -> (${tag.source === 'game' ? '游戏内置' : '项目自定义'})]`,
    boost: 30,
    source: 'tag'
  }))
}

/**
 * 合并并排序补全项，遵循字母序与来源优先级
 * 来源优先级: keyword > tag > idea
 */
function mergeCompletions(
  keywordItems: GrammarCompletionItem[],
  ideaItems: GrammarCompletionItem[],
  tagItems: GrammarCompletionItem[]
): GrammarCompletionItem[] {
  const priorityMap: Record<GrammarCompletionItem['source'], number> = {
    keyword: 0,
    tag: 1,
    idea: 2
  }

  const merged = new Map<string, GrammarCompletionItem>()

  const insertItems = (items: GrammarCompletionItem[]) => {
    items.forEach((item) => {
      const key = item.label.toUpperCase()
      if (!merged.has(key)) {
        merged.set(key, item)
      }
    })
  }

  insertItems(keywordItems)
  insertItems(tagItems)
  insertItems(ideaItems)

  const sorted = Array.from(merged.values()).sort((a, b) => {
    const labelCompare = a.label.localeCompare(b.label, 'en', { sensitivity: 'base' })
    if (labelCompare !== 0) {
      return labelCompare
    }
    return priorityMap[a.source] - priorityMap[b.source]
  })

  return sorted
}

/**
 * 提供 GrammarCompletion 数据组合的组合式函数
 * 返回静态补全、Idea 补全、Tag 补全以及合并后的结果
 */
export function useGrammarCompletion(): {
  staticItems: ComputedRef<GrammarCompletionItem[]>
  ideaItems: ComputedRef<GrammarCompletionItem[]>
  tagItems: ComputedRef<GrammarCompletionItem[]>
  allItems: ComputedRef<GrammarCompletionItem[]>
} {
  const { ideas } = useIdeaRegistry()
  const { tags } = useTagRegistry()

  const staticItems = computed(() => STATIC_COMPLETIONS)

  const ideaItems = computed(() => {
    const sourceIdeas = ideas.value ?? []
    return createIdeaCompletions(sourceIdeas)
  })

  const tagItems = computed(() => {
    const sourceTags = tags.value ?? []
    return createTagCompletions(sourceTags)
  })

  const allItems = computed(() =>
    mergeCompletions(staticItems.value, ideaItems.value, tagItems.value)
  )

  return {
    staticItems,
    ideaItems,
    tagItems,
    allItems
  }
}
