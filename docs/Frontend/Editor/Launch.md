# 一键启动 (Launch)

## 概述
直接从编辑器启动 Hearts of Iron IV 并自动加载当前正在编辑的 Mod。

## 启动模式
后端支持两种启动策略（可在设置中配置）：
1. **Steam 模式** (默认): 通过 `steam://run/394360//...` 协议唤起 Steam 启动游戏。
2. **Pirate / Direct 模式**: 直接运行游戏可执行文件 (`hoi4.exe`)。

## 参数注入
启动时会自动生成 Paradox Launcher 需要的参数配置，确保当前 Mod 被启用，而无需在启动器中手动勾选。

