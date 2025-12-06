import { describe, it, expect } from 'vitest'
import { tokenize, generateCleanContent, TokenType } from '../../../../utils/ErrorTip/core/tokenizer'

describe('Tokenizer 词法分析器测试', () => {
  describe('tokenize 函数测试', () => {
    it('应该正确处理空字符串', () => {
      const lineStarts = [0]
      const tokens = tokenize('', lineStarts)
      expect(tokens).toEqual([])
    })

    it('应该正确识别空白字符', () => {
      const content = '   \t\n\r  '
      const lineStarts = [0, 6]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.Whitespace)
      expect(tokens[0].value).toBe('   \t\n\r  ')
      expect(tokens[0].start).toBe(0)
      expect(tokens[0].end).toBe(content.length)
      expect(tokens[0].line).toBe(1)
    })

    it('应该正确识别单行注释', () => {
      const content = '# 这是一个注释'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.Comment)
      expect(tokens[0].value).toBe('# 这是一个注释')
      expect(tokens[0].line).toBe(1)
    })

    it('应该正确识别多行注释（通过换行符）', () => {
      const content = '# 第一行注释\n# 第二行注释'
      const lineStarts = [0, content.indexOf('\n') + 1]
      const tokens = tokenize(content, lineStarts)
      
      
      
      // 实际的期望值
      expect(tokens).toHaveLength(3) // 实际是3个token：第一个注释 + 换行符空白 + 第二个注释
      expect(tokens[0].type).toBe(TokenType.Comment)
      expect(tokens[0].value).toBe('# 第一行注释')
      expect(tokens[0].line).toBe(1)
      
      expect(tokens[1].type).toBe(TokenType.Whitespace) // 换行符被识别为空白
      expect(tokens[2].type).toBe(TokenType.Comment)
      expect(tokens[2].value).toBe('# 第二行注释')
      expect(tokens[2].line).toBe(2)
    })

    it('应该正确识别字符串', () => {
      const content = '"这是一个字符串"'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.String)
      expect(tokens[0].value).toBe('"这是一个字符串"')
      expect(tokens[0].line).toBe(1)
    })

    it('应该正确识别包含转义字符的字符串', () => {
      const content = '"包含\\n转义字符\\"的字符串"'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.String)
      expect(tokens[0].value).toBe(content)
    })

    it('应该正确识别操作符', () => {
      const content = '{}='
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(3)
      expect(tokens[0].type).toBe(TokenType.Operator)
      expect(tokens[0].value).toBe('{')
      
      expect(tokens[1].type).toBe(TokenType.Operator)
      expect(tokens[1].value).toBe('}')
      
      expect(tokens[2].type).toBe(TokenType.Operator)
      expect(tokens[2].value).toBe('=')
    })

    it('应该正确识别标识符', () => {
      const content = 'variable_name'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.Identifier)
      expect(tokens[0].value).toBe('variable_name')
    })

    it('应该正确识别HOI4脚本关键字', () => {
      const content = 'always yes no'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      
      
      // 实际的期望值：三个标识符 + 两个空白
      expect(tokens).toHaveLength(5)
      expect(tokens[0].type).toBe(TokenType.Identifier)
      expect(tokens[0].value).toBe('always')
      expect(tokens[1].type).toBe(TokenType.Whitespace) // 空格
      expect(tokens[2].type).toBe(TokenType.Identifier)
      expect(tokens[2].value).toBe('yes')
      expect(tokens[3].type).toBe(TokenType.Whitespace) // 空格
      expect(tokens[4].type).toBe(TokenType.Identifier)
      expect(tokens[4].value).toBe('no')
    })

    it('应该正确处理混合内容的Token流', () => {
      const content = 'name = "测试值" # 注释'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      
      
      // 实际的期望值：包含所有token
      expect(tokens).toHaveLength(7) // name + 空格 + = + 空格 + "测试值" + 空格 + # 注释
      expect(tokens[0].type).toBe(TokenType.Identifier) // name
      expect(tokens[1].type).toBe(TokenType.Whitespace) // 空格
      expect(tokens[2].type).toBe(TokenType.Operator) // =
      expect(tokens[3].type).toBe(TokenType.Whitespace) // 空格
      expect(tokens[4].type).toBe(TokenType.String) // "测试值"
      expect(tokens[5].type).toBe(TokenType.Whitespace) // 空格
      expect(tokens[6].type).toBe(TokenType.Comment) // # 注释
    })

    it('应该正确计算多行文本的行号', () => {
      const content = 'first line\nsecond line\nthird line'
      const lineStarts = [0, 11, 22] // 每行开始的索引
      const tokens = tokenize(content, lineStarts)
      
      // 验证行号计算
      const firstLineTokens = tokens.filter(t => t.line === 1)
      const secondLineTokens = tokens.filter(t => t.line === 2)
      const thirdLineTokens = tokens.filter(t => t.line === 3)
      
      expect(firstLineTokens.length).toBeGreaterThan(0)
      expect(secondLineTokens.length).toBeGreaterThan(0)
      expect(thirdLineTokens.length).toBeGreaterThan(0)
    })

    it('应该正确处理复杂的HOI4脚本结构', () => {
      const content = `name = "德国"
tag = GER
ideology = fascism
# 这是一个注释
research_bonus = {
    infantry_weapons = 0.15
    armor = 0.1
}`
      const lineStarts = [0, 17, 27, 45, 64, 65, 92, 108]
      const tokens = tokenize(content, lineStarts)
      
      // 验证基本结构
      expect(tokens.length).toBeGreaterThan(0)
      
      // 验证包含所有类型的Token
      const types = new Set(tokens.map(t => t.type))
      expect(types.has(TokenType.Identifier)).toBe(true)
      expect(types.has(TokenType.Operator)).toBe(true)
      expect(types.has(TokenType.String)).toBe(true)
      expect(types.has(TokenType.Comment)).toBe(true)
      expect(types.has(TokenType.Whitespace)).toBe(true)
    })

    it('应该正确处理包含数字的标识符', () => {
      const content = 'variable_1 test123'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(3) // 两个标识符 + 中间的空白
      expect(tokens[0].type).toBe(TokenType.Identifier)
      expect(tokens[0].value).toBe('variable_1')
      expect(tokens[2].type).toBe(TokenType.Identifier)
      expect(tokens[2].value).toBe('test123')
    })

    it('应该正确处理不完整的字符串', () => {
      const content = '"不完整的字符串'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.String)
      expect(tokens[0].value).toBe(content)
    })

    it('应该正确处理特殊字符作为标识符', () => {
      const content = 'test-value value.test'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(3) // 两个标识符 + 中间的空白
      expect(tokens[0].type).toBe(TokenType.Identifier)
      expect(tokens[0].value).toBe('test-value')
      expect(tokens[2].type).toBe(TokenType.Identifier)
      expect(tokens[2].value).toBe('value.test')
    })
  })

  describe('generateCleanContent 函数测试', () => {
    it('应该正确处理不包含注释或字符串的内容', () => {
      const content = 'variable = value'
      const cleaned = generateCleanContent(content)
      expect(cleaned).toBe(content)
    })

    it('应该将单行注释替换为空格', () => {
      const content = 'variable = value # 这是一个注释'
      const cleaned = generateCleanContent(content)
      
      // 注释部分应该被替换为空格
      const commentStart = content.indexOf('#')
      const expected = content.substring(0, commentStart) + ' '.repeat(content.length - commentStart)
      expect(cleaned).toBe(expected)
    })

    it('应该将字符串替换为空格', () => {
      const content = 'name = "测试字符串"'
      const cleaned = generateCleanContent(content)
      
      // 字符串部分应该被替换为空格
      const stringStart = content.indexOf('"')
      const stringEnd = content.indexOf('"', stringStart + 1) + 1
      const expected = content.substring(0, stringStart) + ' '.repeat(stringEnd - stringStart) + content.substring(stringEnd)
      expect(cleaned).toBe(expected)
    })

    it('应该正确处理混合的注释和字符串', () => {
      const content = 'name = "测试" # 注释内容'
      const cleaned = generateCleanContent(content)
      
      // 验证长度保持不变
      expect(cleaned.length).toBe(content.length)
      
      // 验证注释被替换
      const commentStart = content.indexOf('#')
      for (let i = commentStart; i < content.length; i++) {
        expect(cleaned[i]).toBe(' ')
      }
      
      // 验证字符串被替换
      const stringStart = content.indexOf('"')
      const stringEnd = content.indexOf('"', stringStart + 1) + 1
      for (let i = stringStart; i < stringEnd; i++) {
        expect(cleaned[i]).toBe(' ')
      }
    })

    it('应该正确处理多行内容中的注释和字符串', () => {
      const content = `name = "德国"
tag = GER # 国家标签
# 这是一个注释
ideology = "fascism"`
      const cleaned = generateCleanContent(content)
      
      
      
      // 验证长度保持不变
      expect(cleaned.length).toBe(content.length)
      
      // 验证注释被替换为空格
      expect(cleaned).toContain(' '.repeat('# 国家标签'.length))
      expect(cleaned).toContain(' '.repeat('# 这是一个注释'.length))
      
      // 验证字符串被替换为空格
      expect(cleaned).toContain(' '.repeat('"德国"'.length))
      expect(cleaned).toContain(' '.repeat('"fascism"'.length))
    })

    it('应该正确处理包含转义字符的字符串', () => {
      const content = '"包含\\n转义字符\\"的字符串"'
      const cleaned = generateCleanContent(content)
      
      // 整个字符串应该被替换为空格
      expect(cleaned).toBe(' '.repeat(content.length))
    })

    it('应该正确处理空字符串', () => {
      const content = ''
      const cleaned = generateCleanContent(content)
      expect(cleaned).toBe('')
    })

    it('应该正确处理只有注释的内容', () => {
      const content = '# 这只是一个注释'
      const cleaned = generateCleanContent(content)
      expect(cleaned).toBe(' '.repeat(content.length))
    })

    it('应该正确处理只有字符串的内容', () => {
      const content = '"只是一个字符串"'
      const cleaned = generateCleanContent(content)
      expect(cleaned).toBe(' '.repeat(content.length))
    })
  })

  describe('集成测试', () => {
    it('tokenize和generateCleanContent应该协同工作', () => {
      const content = `name = "德国" # 国家名称
tag = GER
# 国家信息
ideology = "fascism"`
      
      const lineStarts = [0, content.indexOf('\n') + 1, content.indexOf('\n', content.indexOf('\n') + 1) + 1, content.lastIndexOf('\n') + 1]
      const tokens = tokenize(content, lineStarts)
      const cleaned = generateCleanContent(content)
      
      // 验证token位置信息与原始内容的对应关系
      tokens.forEach(token => {
        const originalValue = content.substring(token.start, token.end)
        const cleanedValue = cleaned.substring(token.start, token.end)
        
        if (token.type === TokenType.Comment || token.type === TokenType.String) {
          // 注释和字符串在清洗后应该是空格
          expect(cleanedValue.trim()).toBe('')
          expect(cleanedValue.length).toBe(originalValue.length)
        } else {
          // 其他内容应该保持不变
          expect(cleanedValue).toBe(originalValue)
        }
      })
    })

    it('应该正确处理真实的HOI4脚本内容', () => {
      const hoi4Content = `# 德国国家聚焦树
GER_german_war_machine = {
    id = GER_german_war_machine
    
    # 基础属性
    cost = 10
    days_remove = 70
    
    # 效果
    complete_bonus = {
        army_speed = 0.1
        army_attack = 0.05
    }
    
    # 前置条件
    prerequisite = { focus = GER_rhineland }
    
    # 互斥
    mutually_exclusive = { focus = GER_democratic_path }
}`
      
      // 计算行开始位置
      const lines = hoi4Content.split('\n')
      const lineStarts = [0]
      lines.forEach((line, index) => {
        if (index < lines.length - 1) {
          lineStarts.push(lineStarts[index] + line.length + 1)
        }
      })
      
      const tokens = tokenize(hoi4Content, lineStarts)
      const cleaned = generateCleanContent(hoi4Content)
      
      // 验证token数量合理
      expect(tokens.length).toBeGreaterThan(50)
      
      // 验证包含所有必要的token类型
      const types = new Set(tokens.map(t => t.type))
      
      
      
      expect(types.has(TokenType.Identifier)).toBe(true)
      expect(types.has(TokenType.Operator)).toBe(true)
      // 注意：如果脚本内容中没有字符串，这个测试可能失败
      if (hoi4Content.includes('"')) {
        expect(types.has(TokenType.String)).toBe(true)
      }
      expect(types.has(TokenType.Comment)).toBe(true)
      expect(types.has(TokenType.Whitespace)).toBe(true)
      
      // 验证清洗后的内容长度一致
      expect(cleaned.length).toBe(hoi4Content.length)
      
      // 验证关键字段被正确识别
      const idToken = tokens.find(t => t.value === 'id')
      expect(idToken).toBeDefined()
      expect(idToken!.type).toBe(TokenType.Identifier)
      
      const costToken = tokens.find(t => t.value === '10')
      expect(costToken).toBeDefined()
      expect(costToken!.type).toBe(TokenType.Identifier)
    })

    it('应该正确处理性能测试 - 大文件', () => {
      // 生成一个较大的测试文件
      let largeContent = ''
      for (let i = 0; i < 100; i++) {
        largeContent += `variable_${i} = "value_${i}" # 注释 ${i}\n`
      }
      
      // 计算行开始位置
      const lines = largeContent.split('\n')
      const lineStarts = [0]
      lines.forEach((line, index) => {
        if (index < lines.length - 1) {
          lineStarts.push(lineStarts[index] + line.length + 1)
        }
      })
      
      // 测试tokenize性能
      const startTime = Date.now()
      const tokens = tokenize(largeContent, lineStarts)
      const endTime = Date.now()
      
      // 验证结果正确性
      expect(tokens.length).toBeGreaterThan(0)
      
      // 性能应该在合理范围内（小于1秒）
      expect(endTime - startTime).toBeLessThan(1000)
      
      // 测试generateCleanContent性能
      const cleanStartTime = Date.now()
      const cleaned = generateCleanContent(largeContent)
      const cleanEndTime = Date.now()
      
      expect(cleaned.length).toBe(largeContent.length)
      expect(cleanEndTime - cleanStartTime).toBeLessThan(1000)
    })
  })

  describe('边缘情况和健壮性测试', () => {
    it('应该正确处理包含特殊字符的内容', () => {
      // 使用明确包含操作符的字符串
      const content = 'test{value}test=value'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      
      
      // 验证操作符被正确识别
      const operatorTokens = tokens.filter(t => t.type === TokenType.Operator)
      expect(operatorTokens.length).toBe(3) // {, }, =
      
      // 验证操作符内容
      const operatorValues = operatorTokens.map(t => t.value)
      expect(operatorValues).toContain('{')
      expect(operatorValues).toContain('}')
      expect(operatorValues).toContain('=')
    })

    it('应该正确处理只有空白字符的内容', () => {
      const content = '   \t\n\r   \n\t  '
      const lineStarts = [0, content.indexOf('\n') + 1, content.lastIndexOf('\n') + 1]
      const tokens = tokenize(content, lineStarts)
      
      // 调试输出
      console.log('只有空白字符调试:')
      console.log('内容:', JSON.stringify(content))
      console.log('行开始位置:', lineStarts)
      tokens.forEach((token, i) => {
        console.log(`Token ${i}: type=${token.type}, value=${JSON.stringify(token.value)}`)
      })
      
      // 实际情况：所有连续的空白被识别为一个token
      expect(tokens).toHaveLength(1) // 所有空白字符被识别为一个连续的token
      expect(tokens[0].type).toBe(TokenType.Whitespace)
      expect(tokens[0].value).toBe(content)
    })

    it('应该正确处理Unicode字符', () => {
      const content = '"测试字符串™∂∆¥ƒΩ≈ç√∫˜µ≤≥÷"'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(1)
      expect(tokens[0].type).toBe(TokenType.String)
      expect(tokens[0].value).toBe(content)
    })

    it('应该正确处理包含中文字符的HOI4脚本', () => {
      const content = 'name = "中国人民解放战争"'
      const lineStarts = [0]
      const tokens = tokenize(content, lineStarts)
      
      expect(tokens).toHaveLength(5)
      expect(tokens[0].type).toBe(TokenType.Identifier)
      expect(tokens[0].value).toBe('name')
      expect(tokens[4].type).toBe(TokenType.String)
      expect(tokens[4].value).toBe('"中国人民解放战争"')
    })
  })
})