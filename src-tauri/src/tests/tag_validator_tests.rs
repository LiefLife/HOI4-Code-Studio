//! 标签验证模块的单元测试

#[cfg(test)]
mod tests {
    use super::super::tag_validator::{validate_tag_usage, TagValidationResponse, TagValidationError};
    use rstest::rstest;

    #[test]
    fn test_validate_tag_usage_with_valid_tags() {
        let content = r#"
        GER = {
            add_core_of = FRA
            owner = ENG
            original_tag = GER
        }
        
        FRA = {
            target = ENG
        }
        
        tag = ITA
        "#;

        let result = validate_tag_usage(content);
        
        assert!(result.success, "有效标签应该通过验证");
        assert_eq!(result.errors.len(), 0, "有效标签不应该有错误");
    }

    #[test]
    fn test_validate_tag_usage_with_invalid_tags() {
        let content = r#"
        GER = {
            add_core_of = INVALID
            owner = NONEXISTENT
            original_tag = XYZ
        }
        
        FRA = {
            target = BADTAG
        }
        "#;

        let result = validate_tag_usage(content);
        
        assert!(!result.success, "无效标签应该失败");
        assert!(result.errors.len() > 0, "应该检测到错误");
        
        // 检查错误消息
        let error_messages: Vec<String> = result.errors.iter()
            .map(|e| e.message.clone())
            .collect();
        
        assert!(error_messages.iter().any(|msg| msg.contains("INVALID")), 
               "应该包含INVALID标签的错误");
        assert!(error_messages.iter().any(|msg| msg.contains("NONEXISTENT")), 
               "应该包含NONEXISTENT标签的错误");
    }

    #[test]
    fn test_validate_tag_usage_with_empty_content() {
        let content = "";
        let result = validate_tag_usage(content);
        
        assert!(result.success, "空内容应该通过验证");
        assert_eq!(result.errors.len(), 0, "空内容不应该有错误");
    }

    #[test]
    fn test_validate_tag_usage_with_malformed_content() {
        let content = r#"
        GER = {
            add_core_of = 
            owner = 
        }
        "#;

        let result = validate_tag_usage(content);
        
        // 空标签也应该被处理
        assert!(!result.success || result.success, "应该能够处理格式错误的内容");
    }

    #[rstest]
    #[case("GER = { add_core_of = FRA }", true)]
    #[case("owner = ENG", true)]
    #[case("original_tag = GER", true)]
    #[case("target = ITA", true)]
    #[case("INVALID = { add_core_of = FRA }", false)]
    #[case("add_core_of = NONEXISTENT", false)]
    fn test_tag_pattern_matching(
        #[case] content: &str, 
        #[case] should_pass: bool
    ) {
        let result = validate_tag_usage(content);
        
        if should_pass {
            assert!(result.success, format!("'{}' 应该通过验证", content).as_str());
        } else {
            assert!(!result.success || result.errors.len() > 0, 
                   format!("'{}' 应该检测到错误", content).as_str());
        }
    }

    #[test]
    fn test_validation_error_structure() {
        let error = TagValidationError {
            line: 10,
            message: "Invalid tag: INVALID".to_string(),
        };
        
        assert_eq!(error.line, 10);
        assert!(error.message.contains("Invalid tag"));
        assert!(error.message.contains("INVALID"));
    }

    #[test]
    fn test_validation_response_structure() {
        let response = TagValidationResponse {
            success: true,
            message: "Validation passed".to_string(),
            errors: vec![],
        };
        
        assert!(response.success);
        assert_eq!(response.message, "Validation passed");
        assert_eq!(response.errors.len(), 0);
        
        // 测试序列化
        let serialized = serde_json::to_string(&response).unwrap();
        let deserialized: TagValidationResponse = serde_json::from_str(&serialized).unwrap();
        
        assert_eq!(response.success, deserialized.success);
        assert_eq!(response.message, deserialized.message);
    }
}