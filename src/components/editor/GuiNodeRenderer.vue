<template>
  <div 
    class="absolute pointer-events-auto"
    :style="nodeStyle"
    :title="node.properties.name"
  >
    <!-- 背景/Sprite 渲染 (作为底层) -->
    <div 
      v-if="spriteUrl" 
      :style="spriteStyle" 
      class="absolute inset-0 z-0 pointer-events-none"
    ></div>

    <!-- 文本渲染 (仅限 TextBox) (中层) -->
    <div 
      v-if="node.node_type === 'instant_text_box'"
      class="absolute overflow-hidden pointer-events-none z-10"
      :style="textStyle"
    >
      <div class="w-full h-full flex flex-col justify-center">
        {{ node.properties.text || '' }}
      </div>
    </div>

    <!-- 递归渲染子节点 (高层) -->
    <div class="absolute inset-0 z-20 pointer-events-none">
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
const imageDimensions = ref<{ width: number, height: number } | null>(null)

// 监听图片加载以获取真实尺寸
watch(spriteUrl, (url) => {
  if (url) {
    const img = new Image()
    img.onload = () => {
      imageDimensions.value = {
        width: img.width / (spriteMeta.value?.noOfFrames || 1),
        height: img.height
      }
    }
    img.src = url
  } else {
    imageDimensions.value = null
  }
})

// 辅助函数：解析 Orientation/Origo
function getAnchorPoint(type: string | undefined): { x: string, y: string } {
  if (!type) return { x: '0%', y: '0%' }
  // 统一处理：转大写，去除空格，兼容下划线
  const t = type.toUpperCase().replace(/\s+/g, '_')
  switch (t) {
    case 'UPPER_LEFT':
    case 'UP_LEFT':
    case 'TOP_LEFT': return { x: '0%', y: '0%' }
    
    case 'UPPER_RIGHT':
    case 'UP_RIGHT':
    case 'TOP_RIGHT': return { x: '100%', y: '0%' }
    
    case 'LOWER_LEFT':
    case 'BOTTOM_LEFT': return { x: '0%', y: '100%' }
    
    case 'LOWER_RIGHT':
    case 'BOTTOM_RIGHT': return { x: '100%', y: '100%' }
    
    case 'CENTER':
    case 'CENTRE': return { x: '50%', y: '50%' }
    
    case 'CENTER_UP':
    case 'CENTER_TOP':
    case 'CENTRE_UP':
    case 'CENTRE_TOP': return { x: '50%', y: '0%' }
    
    case 'CENTER_DOWN':
    case 'CENTER_BOTTOM':
    case 'CENTRE_DOWN':
    case 'CENTRE_BOTTOM': return { x: '50%', y: '100%' }
    
    case 'CENTER_LEFT':
    case 'CENTRE_LEFT': return { x: '0%', y: '50%' }
    
    case 'CENTER_RIGHT':
    case 'CENTRE_RIGHT': return { x: '100%', y: '50%' }
    
    default: return { x: '0%', y: '0%' }
  }
}

// 基础样式计算
const nodeStyle = computed(() => {
  const p = props.node.properties
  const orientation = getAnchorPoint(p.orientation)
  const origo = getAnchorPoint(p.origo)
  
  // 宽度和高度逻辑精准化：
  // 1. 优先使用显式定义的 size
  // 2. 其次使用图片的真实尺寸 (针对 iconType/buttonType)
  // 3. 容器类如果没有定义，则默认为 0 (由子项撑开或保持 0)，但在预览中为了可见性给一个最小尺寸
  let width = '0px'
  let height = '0px'
  
  if (p.size?.width) {
    width = `${p.size.width}px`
  } else if (imageDimensions.value) {
    width = `${imageDimensions.value.width}px`
  } else if (p.max_width) {
    width = `${p.max_width}px`
  }

  if (p.size?.height) {
    height = `${p.size.height}px`
  } else if (imageDimensions.value) {
    height = `${imageDimensions.value.height}px`
  } else if (p.max_height) {
    height = `${p.max_height}px`
  }

  // 特殊处理：如果是根节点或显式容器且完全没有尺寸，预览时给予提示
  if (width === '0px' && height === '0px' && (props.node.node_type === 'container_window' || props.node.node_type === 'window_type')) {
    width = '100px'
    height = '100px'
  }

  const style: any = {
    position: 'absolute',
    left: orientation.x,
    top: orientation.y,
    width,
    height,
    transformOrigin: `${origo.x} ${origo.y}`,
    pointerEvents: 'auto',
  }

  // 最终坐标 = ParentAnchor(Orientation) + Position - OrigoOffset
  const posX = p.position?.x || 0
  const posY = p.position?.y || 0

  style.left = `calc(${orientation.x} + ${posX}px)`
  style.top = `calc(${orientation.y} + ${posY}px)`
  
  let transform = ''
  
  // 1. 处理 Origo 偏移
  if (origo.x !== '0%' || origo.y !== '0%') {
    transform += `translate(-${origo.x}, -${origo.y}) `
  }

  // 2. 处理 Scale
  if (p.scale && p.scale !== 1) {
    transform += `scale(${p.scale}) `
  }

  if (transform) {
    style.transform = transform.trim()
  }

  // 特殊修正：如果是按钮或图标，且宽度为 0，这通常意味着图片还没加载完。
  // 我们给一个临时的 transition 让它在加载后平滑显示，或者预设一个透明度
  if (imageDimensions.value === null && (props.node.node_type === 'icon' || props.node.node_type === 'button')) {
    style.opacity = '0.3' // 未加载完时半透明
  } else {
    style.opacity = '1'
  }

  // 调试用背景
  if (!spriteUrl.value && (props.node.node_type === 'container_window' || props.node.node_type === 'window_type')) {
    style.backgroundColor = 'rgba(120, 120, 120, 0.1)'
    style.border = '1px dashed var(--theme-border)'
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
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
  }

  if (noOfFrames > 1) {
    const frame = props.node.properties.frame || 1
    style.backgroundSize = `${noOfFrames * 100}% 100%`
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
  const style: any = {
    fontSize: '14px',
    color: 'var(--theme-fg)',
    fontFamily: p.font || 'Arial',
    textAlign: (p.format || 'left') as any,
    display: 'flex',
    padding: '0 4px',
    whiteSpace: 'normal',
    wordBreak: 'break-word',
    textShadow: '1px 1px 0px rgba(0,0,0,0.8)',
    lineHeight: '1.2',
    width: '100%',
    height: '100%',
    left: 0,
    top: 0
  }

  // 水平对齐
  if (p.format === 'center') {
    style.justifyContent = 'center'
    style.textAlign = 'center'
  } else if (p.format === 'right') {
    style.justifyContent = 'flex-end'
    style.textAlign = 'right'
  } else {
    style.justifyContent = 'flex-start'
    style.textAlign = 'left'
  }

  // 垂直对齐 (HOI4 默认为 center)
  style.alignItems = 'center'

  return style
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
