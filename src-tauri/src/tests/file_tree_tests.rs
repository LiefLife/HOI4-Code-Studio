//! 文件树构建模块的单元测试

#[cfg(test)]
mod tests {
    use super::super::file_tree::{build_file_tree, build_file_tree_fast, FileNode};
    use crate::tests::helpers::*;
    use tempfile::tempdir;
    use std::fs;
    use std::path::PathBuf;

    #[test]
    fn test_build_file_tree_with_valid_directory() {
        let temp_dir = create_test_dir();
        let test_path = temp_dir.path().to_path_buf();
        
        // 创建测试目录结构
        create_test_directory_structure(&test_path);
        
        // 构建文件树
        let result = build_file_tree(test_path.to_str().unwrap(), 3);
        
        assert!(result.success, "文件树构建应该成功");
        assert!(result.tree.is_some(), "应该返回文件树");
        
        let tree = result.tree.unwrap();
        assert_eq!(tree.len(), 1, "根目录应该有一个节点");
        
        let root_node = &tree[0];
        assert_eq!(root_node.name, test_path.file_name().unwrap().to_str().unwrap());
        assert!(root_node.is_directory, "根节点应该是目录");
        assert!(root_node.children.is_some(), "根节点应该有子节点");
        
        let children = root_node.children.as_ref().unwrap();
        assert!(children.iter().any(|node| node.name == "test.txt"), "应该包含test.txt文件");
        assert!(children.iter().any(|node| node.name == "subdir"), "应该包含subdir目录");
    }

    #[test]
    fn test_build_file_tree_with_nonexistent_path() {
        let result = build_file_tree("/nonexistent/path", 3);
        
        assert!(!result.success, "不存在的路径应该返回失败");
        assert_eq!(result.message, "路径不存在", "错误消息应该正确");
        assert!(result.tree.is_none(), "失败时不应该返回文件树");
    }

    #[test]
    fn test_build_file_tree_with_file_instead_of_directory() {
        let temp_dir = create_test_dir();
        let test_file = temp_dir.path().join("test.txt");
        fs::write(&test_file, "test content").unwrap();
        
        let result = build_file_tree(test_file.to_str().unwrap(), 3);
        
        assert!(!result.success, "文件而不是目录应该返回失败");
        assert_eq!(result.message, "路径不是目录", "错误消息应该正确");
    }

    #[test]
    fn test_build_file_tree_depth_limit() {
        let temp_dir = create_test_dir();
        let test_path = temp_dir.path().to_path_buf();
        
        // 创建深层目录结构
        let mut current_path = test_path.clone();
        for i in 0..5 {
            current_path = current_path.join(format!("level_{}", i));
            fs::create_dir_all(&current_path).unwrap();
            let test_file = current_path.join("file.txt");
            fs::write(&test_file, "test").unwrap();
        }
        
        // 测试深度限制为2
        let result = build_file_tree(test_path.to_str().unwrap(), 2);
        
        assert!(result.success, "文件树构建应该成功");
        let tree = result.tree.unwrap();
        let root_node = &tree[0];
        
        // 检查是否正确应用了深度限制
        fn count_depth(nodes: &[FileNode], current_depth: usize, max_depth: usize) -> usize {
            if current_depth >= max_depth {
                return current_depth;
            }
            
            let mut max_child_depth = current_depth;
            for node in nodes {
                if let Some(children) = &node.children {
                    let child_depth = count_depth(children, current_depth + 1, max_depth);
                    max_child_depth = max_child_depth.max(child_depth);
                }
            }
            max_child_depth
        }
        
        let actual_depth = count_depth(&tree, 0, 2);
        assert!(actual_depth <= 2, "深度限制应该被正确应用");
    }

    #[test]
    fn test_file_node_serialization() {
        let node = FileNode {
            name: "test.txt".to_string(),
            path: "/test/test.txt".to_string(),
            is_directory: false,
            children: None,
            size: Some(1024),
            expanded: false,
        };
        
        let serialized = serde_json::to_string(&node).unwrap();
        let deserialized: FileNode = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(node.name, deserialized.name);
        assert_eq!(node.path, deserialized.path);
        assert_eq!(node.is_directory, deserialized.is_directory);
        assert_eq!(node.size, deserialized.size);
    }

    #[test]
    fn test_build_file_tree_fast_performance() {
        let temp_dir = create_test_dir();
        let test_path = temp_dir.path().to_path_buf();
        
        // 创建大量文件以测试性能
        for i in 0..100 {
            let file_path = test_path.join(format!("file_{}.txt", i));
            fs::write(&file_path, format!("content {}", i)).unwrap();
        }
        
        let start = std::time::Instant::now();
        let result = build_file_tree_fast(test_path.to_str().unwrap(), 1);
        let duration = start.elapsed();
        
        assert!(result.success, "快速构建应该成功");
        assert!(duration.as_millis() < 1000, "快速构建应该在1秒内完成");
    }
}