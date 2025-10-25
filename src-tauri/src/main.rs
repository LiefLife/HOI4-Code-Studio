// 发布版本隐藏 Windows 控制台窗口
// cfg_attr 是条件编译属性，只在非 debug 模式下生效
// windows_subsystem = "windows" 表示不显示控制台窗口
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// 程序入口函数
// main() 是 Rust 程序的入口点
fn main() {
    // 调用库中的 run() 函数启动 Tauri 应用
    hoi4_code_studio_lib::run()
}
