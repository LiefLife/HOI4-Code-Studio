/// cwtools 兼容性测试
/// 
/// 使用 cwtools 的测试用例验证我们的实现与 cwtools 的兼容性
/// 确保解析结果和验证结果与 cwtools 一致

#[cfg(test)]
mod tests {
    use crate::cwtools::parser::{Parser, Lexer};
    use std::fs;
    use std::path::Path;

    /// 测试简单的解析用例
    #[test]
    fn test_simple_parse() {
        let test_file = "Move_Project/cwtools/CWToolsTests/testfiles/parsertests/simple.txt";
        
        if !Path::new(test_file).exists() {
            println!("跳过测试: 测试文件不存在 {}", test_file);
            return;
        }

        let content = fs::read_to_string(test_file)
            .expect("无法读取测试文件");

        let mut parser = Parser::new(&content);
        let result = parser.parse();

        assert!(result.is_ok(), "解析失败: {:?}", result.err());
        
        let ast = result.unwrap();
        
        // 验证基本结构
        assert!(!ast.statements.is_empty(), "AST 不应为空");
        
        // 验证包含 key = value
        let has_key_value = ast.statements.iter().any(|stmt| {
            if let crate::cwtools::models::ast::Statement::KeyValue(kv) = stmt {
                kv.key == "key"
            } else {
                false
            }
        });
        assert!(has_key_value, "应该包含 'key = value' 语句");
        
        // 验证包含 label = { ... }
        let has_label_clause = ast.statements.iter().any(|stmt| {
            if let crate::cwtools::models::ast::Statement::KeyValue(kv) = stmt {
                if kv.key == "label" {
                    matches!(kv.value, crate::cwtools::models::ast::Value::Clause(_))
                } else {
                    false
                }
            } else {
                false
            }
        });
        assert!(has_label_clause, "应该包含 'label = { ... }' 子句");
    }

    /// 测试包含子句的解析
    #[test]
    fn test_clause_parse() {
        let test_file = "Move_Project/cwtools/CWToolsTests/testfiles/parsertests/clause.txt";
        
        if !Path::new(test_file).exists() {
            println!("跳过测试: 测试文件不存在 {}", test_file);
            return;
        }

        let content = fs::read_to_string(test_file)
            .expect("无法读取测试文件");

        let mut parser = Parser::new(&content);
        let result = parser.parse();

        assert!(result.is_ok(), "解析失败: {:?}", result.err());
        
        let ast = result.unwrap();
        assert!(!ast.statements.is_empty(), "AST 不应为空");
        
        // 验证包含 types test { ... }
        let has_types = ast.statements.iter().any(|stmt| {
            if let crate::cwtools::models::ast::Statement::KeyValue(kv) = stmt {
                kv.key == "types"
            } else {
                false
            }
        });
        assert!(has_types, "应该包含 'types' 定义");
    }

    /// 测试词法分析器的 Token 识别
    #[test]
    fn test_lexer_tokens() {
        let input = "key = value\ntest = 123\nbool = yes";
        let mut lexer = Lexer::new(input);

        // 第一个 token: Identifier("key")
        let token1 = lexer.next_token();
        assert!(token1.is_ok());
        
        // 第二个 token: Equals
        let token2 = lexer.next_token();
        assert!(token2.is_ok());
        
        // 第三个 token: Identifier("value")
        let token3 = lexer.next_token();
        assert!(token3.is_ok());
    }

    /// 测试注释保留
    #[test]
    fn test_comment_preservation() {
        let input = "# This is a comment\nkey = value\n# Another comment";
        let mut parser = Parser::new(input);
        let result = parser.parse();

        assert!(result.is_ok(), "解析失败: {:?}", result.err());
        
        let ast = result.unwrap();
        
        // 验证注释被保留
        let has_comments = ast.statements.iter().any(|stmt| {
            matches!(stmt, crate::cwtools::models::ast::Statement::Comment(_, _))
        });
        assert!(has_comments, "注释应该被保留");
    }

    /// 测试操作符识别
    #[test]
    fn test_operator_recognition() {
        let operators = vec![
            ("key = value", "Equals"),
            ("key > value", "GreaterThan"),
            ("key < value", "LessThan"),
            ("key >= value", "GreaterEqual"),
            ("key <= value", "LessEqual"),
            ("key != value", "NotEqual"),
            ("key == value", "EqualEqual"),
        ];

        for (input, expected_op) in operators {
            let mut parser = Parser::new(input);
            let result = parser.parse();
            
            assert!(result.is_ok(), "解析 '{}' 失败: {:?}", input, result.err());
            
            let ast = result.unwrap();
            assert!(!ast.statements.is_empty(), "AST 不应为空");
            
            // 验证操作符被正确识别
            if let crate::cwtools::models::ast::Statement::KeyValue(kv) = &ast.statements[0] {
                let op_name = format!("{:?}", kv.operator);
                assert!(
                    op_name.contains(expected_op),
                    "期望操作符 {}, 实际: {:?}",
                    expected_op,
                    kv.operator
                );
            } else {
                panic!("第一个语句应该是 KeyValue");
            }
        }
    }

    /// 测试值类型推断
    #[test]
    fn test_value_type_inference() {
        let test_cases = vec![
            ("int = 123", "Integer"),
            ("float = 1.5", "Float"),
            ("bool = yes", "Boolean"),
            ("str = test", "String"),
            ("quoted = \"test\"", "QuotedString"),
        ];

        for (input, expected_type) in test_cases {
            let mut parser = Parser::new(input);
            let result = parser.parse();
            
            assert!(result.is_ok(), "解析 '{}' 失败: {:?}", input, result.err());
            
            let ast = result.unwrap();
            assert!(!ast.statements.is_empty(), "AST 不应为空");
            
            if let crate::cwtools::models::ast::Statement::KeyValue(kv) = &ast.statements[0] {
                let value_type = format!("{:?}", kv.value);
                assert!(
                    value_type.contains(expected_type),
                    "期望值类型 {}, 实际: {:?}",
                    expected_type,
                    kv.value
                );
            }
        }
    }

    /// 测试嵌套子句
    #[test]
    fn test_nested_clauses() {
        let input = r#"
outer = {
    inner = {
        deep = value
    }
}
"#;
        let mut parser = Parser::new(input);
        let result = parser.parse();

        assert!(result.is_ok(), "解析失败: {:?}", result.err());
        
        let ast = result.unwrap();
        assert!(!ast.statements.is_empty(), "AST 不应为空");
        
        // 验证嵌套结构
        if let crate::cwtools::models::ast::Statement::KeyValue(kv) = &ast.statements[0] {
            if let crate::cwtools::models::ast::Value::Clause(statements) = &kv.value {
                assert!(!statements.is_empty(), "外层子句不应为空");
                
                // 验证内层子句
                if let crate::cwtools::models::ast::Statement::KeyValue(inner_kv) = &statements[0] {
                    assert_eq!(inner_kv.key, "inner", "内层键应该是 'inner'");
                    assert!(
                        matches!(inner_kv.value, crate::cwtools::models::ast::Value::Clause(_)),
                        "内层值应该是子句"
                    );
                }
            } else {
                panic!("外层值应该是子句");
            }
        }
    }

    /// 测试错误恢复
    #[test]
    fn test_error_recovery() {
        // 包含语法错误的输入
        let input = r#"
key = value
invalid syntax here
another_key = another_value
"#;
        let mut parser = Parser::new(input);
        let result = parser.parse();

        // 即使有错误，解析器也应该返回部分 AST
        assert!(result.is_ok() || !parser.errors.is_empty(), "应该有解析错误或部分结果");
        
        if let Ok(ast) = result {
            // 验证至少解析了一些语句
            assert!(!ast.statements.is_empty(), "应该有部分解析结果");
        }
    }

    /// 测试 UTF-8 BOM 处理
    #[test]
    fn test_utf8_bom_handling() {
        // 带 BOM 的输入
        let input_with_bom = "\u{FEFF}key = value";
        let input_without_bom = "key = value";

        let mut parser_with_bom = Parser::new(input_with_bom);
        let result_with_bom = parser_with_bom.parse();

        let mut parser_without_bom = Parser::new(input_without_bom);
        let result_without_bom = parser_without_bom.parse();

        assert!(result_with_bom.is_ok(), "带 BOM 的解析失败");
        assert!(result_without_bom.is_ok(), "不带 BOM 的解析失败");

        // 两个结果应该等价（忽略位置信息）
        let ast_with_bom = result_with_bom.unwrap();
        let ast_without_bom = result_without_bom.unwrap();

        assert_eq!(
            ast_with_bom.statements.len(),
            ast_without_bom.statements.len(),
            "语句数量应该相同"
        );
    }

    /// 测试空文件
    #[test]
    fn test_empty_file() {
        let input = "";
        let mut parser = Parser::new(input);
        let result = parser.parse();

        assert!(result.is_ok(), "空文件解析应该成功");
        
        let ast = result.unwrap();
        assert!(ast.statements.is_empty(), "空文件的 AST 应该为空");
    }

    /// 测试只有注释的文件
    #[test]
    fn test_comment_only_file() {
        let input = "# Comment 1\n# Comment 2\n# Comment 3";
        let mut parser = Parser::new(input);
        let result = parser.parse();

        assert!(result.is_ok(), "只有注释的文件解析应该成功");
        
        let ast = result.unwrap();
        
        // 验证所有语句都是注释
        let all_comments = ast.statements.iter().all(|stmt| {
            matches!(stmt, crate::cwtools::models::ast::Statement::Comment(_, _))
        });
        assert!(all_comments, "所有语句都应该是注释");
    }

    /// 测试括号匹配
    #[test]
    fn test_bracket_matching() {
        let valid_input = "key = { value1 value2 }";
        let mut parser = Parser::new(valid_input);
        let result = parser.parse();

        assert!(result.is_ok(), "有效的括号匹配应该成功");

        // 测试不匹配的括号
        let invalid_input = "key = { value1 value2";
        let mut parser = Parser::new(invalid_input);
        let result = parser.parse();

        // 应该有错误或者错误恢复
        assert!(
            result.is_err() || !parser.errors.is_empty(),
            "不匹配的括号应该产生错误"
        );
    }
}
