<template>
  <div 
    class="absolute"
    :style="nodeStyle"
    :title="node.properties.name"
  >
    <!-- 背景/Sprite 渲染 -->
    <div v-if="spriteUrl" :style="spriteStyle" class="absolute inset-0"></div>

    <!-- 文本渲染 (仅限 TextBox) -->
    <div 
      v-if="node.node_type === 'instant_text_box'"
      class="absolute inset-0 overflow-hidden pointer-events-none flex"
      :style="textStyle"
    >
      {{ node.properties.text || 'Placeholder Text' }}
    </div>

    <!-- 递归渲染子节点 -->
    <GuiNodeRenderer 
      v-for="(child, idx) in node.children" 
      :key="idx" 
      :node="child"
      :sprites="sprites"
      :project-path="projectPath"
      :game-directory="gameDirectory"
      :dependency-roots="dependencyRoots"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, watch, type CSSProperties } from 'vue'
import { type GuiNode, resolveGuiResource, readImageAsBase64 } from '../../api/tauri'

const props = defineProps<{
  node: GuiNode
  sprites: Record<string, any>
  projectPath?: string
  gameDirectory?: string
  dependencyRoots?: string[]
}>()

const spriteUrl = ref<string | null>(null)
const spriteMeta = ref<{ noOfFrames: number } | null>(null)

// 辅助函数：解析 Orientation/Origo
function getAnchorPoint(type: string | undefined): { x: string, y: string } {
  if (!type) return { x: '0%', y: '0%' }
  const t = type.toUpperCase()
  switch (t) {
    case 'UPPER_LEFT': return { x: '0%', y: '0%' }
    case 'UPPER_RIGHT': return { x: '100%', y: '0%' }
    case 'LOWER_LEFT': return { x: '0%', y: '100%' }
    case 'LOWER_RIGHT': return { x: '100%', y: '100%' }
    case 'CENTER': return { x: '50%', y: '50%' }
    case 'CENTER_UP': return { x: '50%', y: '0%' }
    case 'CENTER_DOWN': return { x: '50%', y: '100%' }
    case 'CENTER_LEFT': return { x: '0%', y: '50%' }
    case 'CENTER_RIGHT': return { x: '100%', y: '50%' }
    default: return { x: '0%', y: '0%' }
  }
}

// 基础样式计算
const nodeStyle = computed(() => {
  const p = props.node.properties
  const orientation = getAnchorPoint(p.orientation)
  const origo = getAnchorPoint(p.origo)
  
  const style: any = {
    position: 'absolute',
    left: orientation.x,
    top: orientation.y,
    width: p.size?.width ? `${p.size.width}px` : (p.max_width ? `${p.max_width}px` : 'auto'),
    height: p.size?.height ? `${p.size.height}px` : (p.max_height ? `${p.max_height}px` : 'auto'),
    marginLeft: `${p.position?.x || 0}px`,
    marginTop: `${p.position?.y || 0}px`,
  }

  // 使用 transform 实现 origo 偏移
  let transform = ''
  if (origo.x !== '0%' || origo.y !== '0%') {
    transform += `translate(-${origo.x}, -${origo.y}) `
  }

  // 处理 Scale
  if (p.scale) {
    transform += `scale(${p.scale}) `
  }

  if (transform) {
    style.transform = transform.trim()
  }

  // 调试用背景
  if (!spriteUrl.value && (props.node.node_type === 'container_window' || props.node.node_type === 'window_type')) {
    style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
    style.border = '1px solid rgba(255, 255, 255, 0.1)'
    style.zIndex = '0'
  }

  return style
})

// Sprite 样式计算
const spriteStyle = computed(() => {
  if (!spriteUrl.value) return {}
  
  const spriteName = props.node.properties.sprite_type || 
                    props.node.properties.quad_texture_sprite ||
                    props.node.properties.background
  const spriteDef = spriteName ? props.sprites[spriteName] : null
  const noOfFrames = spriteMeta.value?.noOfFrames || spriteDef?.noOfFrames || 1
  
  const style: any = {
    backgroundImage: `url(${spriteUrl.value})`,
    backgroundRepeat: 'no-repeat',
    imageRendering: 'pixelated',
  }

  if (noOfFrames > 1) {
    const frame = props.node.properties.frame || 1
    style.backgroundSize = `${noOfFrames * 100}% 100%`
    // CSS background-position 修正：对于多帧图片，需要计算偏移
    // 算法: (frame - 1) * (100 / (noOfFrames - 1))%
    const pos = noOfFrames > 1 ? ((frame - 1) / (noOfFrames - 1)) * 100 : 0
    style.backgroundPosition = `${pos}% 0%`
  } else {
    style.backgroundSize = '100% 100%'
  }

  return style
})

// 文本样式
const textStyle = computed((): CSSProperties => {
  const p = props.node.properties
  return {
    fontSize: '12px',
    color: '#ffffff',
    fontFamily: p.font || 'Arial',
    textAlign: (p.format || 'left') as any,
    justifyContent: p.format === 'center' ? 'center' : (p.format === 'right' ? 'flex-end' : 'flex-start'),
    alignItems: 'center',
    padding: '2px 4px',
    whiteSpace: 'nowrap'
  }
})

// 加载资源
const loadResource = async () => {
  const spriteName = props.node.properties.sprite_type || 
                    props.node.properties.quad_texture_sprite ||
                    props.node.properties.background
  if (!spriteName) {
    spriteUrl.value = null
    return
  }

  try {
    const res = await resolveGuiResource(
      spriteName,
      props.projectPath || '',
      props.gameDirectory || '',
      props.dependencyRoots || []
    )

    if (res && res.success && res.path) {
      // 使用 readImageAsBase64 处理 DDS/TGA 转 PNG
      const imgRes = await readImageAsBase64(res.path)
      if (imgRes.success && imgRes.base64) {
        spriteUrl.value = `data:${imgRes.mimeType || 'image/png'};base64,${imgRes.base64}`
        spriteMeta.value = { noOfFrames: res.noOfFrames }
      }
    }
  } catch (err) {
    console.warn(`Failed to resolve sprite: ${spriteName}`, err)
  }
}

watch(() => props.node.properties.sprite_type, loadResource)
watch(() => props.node.properties.quad_texture_sprite, loadResource)
watch(() => props.node.properties.background, loadResource)

onMounted(loadResource)
</script>
