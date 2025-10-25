/**
 * 解析.txt文件中的错误提示
 * 检测 'is_* =' 和 'always =' 模式，如果右侧值不是 'yes' 或 'no'，则报错
 * @param {string} content - 文件内容
 * @returns {Array<{line: number, msg: string, type: string}>} 错误数组
 */
export function parseTxtErrors(content) {
  const errors = [];
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    const lineNumber = index + 1; // 行号从1开始
    let match;

    // 检测 'is_* =' 模式
    const isRegex = /\bis_\w+\s*=\s*([^;\s]+)/g;
    while ((match = isRegex.exec(line)) !== null) {
      const value = match[1].trim();
      if (value !== 'yes' && value !== 'no') {
        errors.push({
          line: lineNumber,
          msg: `Expected 'yes' or 'no' after 'is_* ='`,
          type: 'is'
        });
      }
    }

    // 检测 'always =' 模式
    const alwaysRegex = /\balways\s*=\s*([^;\s]+)/g;
    while ((match = alwaysRegex.exec(line)) !== null) {
      const value = match[1].trim();
      if (value !== 'yes' && value !== 'no') {
        errors.push({
          line: lineNumber,
          msg: `Expected 'yes' or 'no' after 'always ='`,
          type: 'always'
        });
      }
    }
  });

  return errors;
}
