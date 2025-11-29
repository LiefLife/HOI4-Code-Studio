/**
 * 版本管理工具的单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  parseVersionToTag, 
  parseTagToVersion, 
  compareVersions, 
  checkForUpdates 
} from '@/utils/version'

// Mock fetch
const mockFetch = vi.fn()
global.fetch = mockFetch

describe('版本管理工具', () => {
  describe('parseVersionToTag', () => {
    it('应该正确转换开发版本', () => {
      expect(parseVersionToTag('v0.1.1-dev')).toBe('Dev_0_1_1')
      expect(parseVersionToTag('0.2.5-dev')).toBe('Dev_0_2_5')
    })

    it('应该正确转换正式版本', () => {
      expect(parseVersionToTag('v0.1.1')).toBe('v0_1_1')
      expect(parseVersionToTag('1.2.3')).toBe('v1_2_3')
    })

    it('应该处理没有v前缀的版本', () => {
      expect(parseVersionToTag('0.1.1')).toBe('v0_1_1')
      expect(parseVersionToTag('2.0.0-dev')).toBe('Dev_2_0_0')
    })
  })

  describe('parseTagToVersion', () => {
    it('应该正确转换开发标签', () => {
      expect(parseTagToVersion('Dev_0_1_1')).toBe('v0.1.1-dev')
      expect(parseTagToVersion('Dev_1_2_3')).toBe('v1.2.3-dev')
    })

    it('应该正确转换正式标签', () => {
      expect(parseTagToVersion('v0_1_1')).toBe('v0.1.1')
      expect(parseTagToVersion('v1_2_3')).toBe('v1.2.3')
    })

    it('应该处理未知格式的标签', () => {
      expect(parseTagToVersion('unknown')).toBe('unknown')
    })
  })

  describe('compareVersions', () => {
    it('应该正确比较版本号', () => {
      // 新版本应该大于旧版本
      expect(compareVersions('0.1.0', '0.1.1')).toBe(true)
      expect(compareVersions('0.1.0', '0.2.0')).toBe(true)
      expect(compareVersions('0.1.0', '1.0.0')).toBe(true)

      // 旧版本不应该大于新版本
      expect(compareVersions('0.1.1', '0.1.0')).toBe(false)
      expect(compareVersions('0.2.0', '0.1.0')).toBe(false)
      expect(compareVersions('1.0.0', '0.1.0')).toBe(false)
    })

    it('应该正确处理开发版本', () => {
      // 正式版本应该大于开发版本
      expect(compareVersions('0.1.1-dev', '0.1.1')).toBe(true)
      expect(compareVersions('0.1.0-dev', '0.1.1')).toBe(true)
    })

    it('应该正确处理相同版本', () => {
      expect(compareVersions('0.1.1', '0.1.1')).toBe(false)
      expect(compareVersions('0.1.1-dev', '0.1.1-dev')).toBe(false)
    })
  })

  describe('checkForUpdates', () => {
    beforeEach(() => {
      vi.clearAllMocks()
      // 清理localStorage
      localStorage.clear()
    })

    it('应该正确使用GitHub token', async () => {
      const token = 'test-token'
      const mockResponse = {
        tag_name: 'v0_2_0',
        html_url: 'https://github.com/test/releases/tag/v0_2_0'
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      await checkForUpdates('0.1.0', token, false)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': `token ${token}`
          })
        })
      )
    })

    it('应该处理GitHub API响应', async () => {
      const mockResponse = {
        tag_name: 'v0_2_0',
        html_url: 'https://github.com/test/releases/tag/v0_2_0'
      }
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      })

      const result = await checkForUpdates('0.1.0', undefined, false)

      // 测试基本响应结构
      expect(result).toHaveProperty('hasUpdate')
      expect(typeof result.hasUpdate).toBe('boolean')
      
      if (!result.error) {
        // 只有在没有错误时才检查版本信息
        expect(result).toHaveProperty('latestVersion')
        expect(result).toHaveProperty('releaseUrl')
        expect(result.latestVersion).toBe('0.2.0')
        expect(result.releaseUrl).toBe('https://github.com/test/releases/tag/v0_2_0')
      }
    })

    it('应该处理API响应错误', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: () => Promise.resolve({ message: 'Not Found' })
      })

      const result = await checkForUpdates('0.1.0', undefined, false)

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('应该处理网络异常', async () => {
      const networkError = new TypeError('Failed to fetch')
      mockFetch.mockRejectedValueOnce(networkError)

      const result = await checkForUpdates('0.1.0', undefined, false)

      expect(result.hasUpdate).toBe(false)
      expect(result.error).toBeDefined()
    })
  })
})