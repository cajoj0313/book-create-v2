/**
 * API 服务 - 与 Backend 交互
 * 功能：
 * - SSE URL生成（POST方式）
 * - 请求超时处理
 * - 错误统一处理
 */

import axios, { AxiosError } from 'axios'
import type { NovelMeta, Novel, WorldSetting, CharactersLibrary, Character, Outline, Chapter, ValidationReport, ApiResponse, TimelineState, CharacterState, ForeshadowingState, ForeshadowingItem } from '@/types/novel'

const API_BASE = '/api' // 通过 Vite proxy 转发到 localhost:8000

// 超时配置
const TIMEOUT_CONFIG = {
  default: 30000,    // 30秒 - 默认
  short: 10000,      // 10秒 - 快速请求
  long: 60000,       // 60秒 - 长请求
  generation: 120000, // 120秒 - AI生成请求
}

// 创建axios实例
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: TIMEOUT_CONFIG.default,
  headers: {
    'Content-Type': 'application/json',
  },
})

// 请求拦截器 - 添加超时配置
apiClient.interceptors.request.use(
  (config) => {
    // 根据请求类型设置超时时间
    if (config.url?.includes('/validate')) {
      config.timeout = TIMEOUT_CONFIG.long
    } else if (config.url?.includes('/generation')) {
      config.timeout = TIMEOUT_CONFIG.generation
    } else if (config.method === 'get') {
      config.timeout = TIMEOUT_CONFIG.short
    }

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器 - 统一错误处理
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    // 转换错误格式
    const apiError = {
      success: false,
      error: getErrorMessage(error),
      message: error.message,
    }
    console.error('API Error:', apiError)
    return Promise.reject(apiError)
  }
)

/**
 * 获取错误消息
 */
function getErrorMessage(error: AxiosError): string {
  if (error.code === 'ECONNABORTED') {
    return '请求超时，请稍后重试'
  }
  if (!error.response) {
    return '网络连接失败，请检查网络'
  }
  const status = error.response.status
  switch (status) {
    case 400:
      return '请求参数错误'
    case 401:
      return '未授权，请重新登录'
    case 403:
      return '无权限访问'
    case 404:
      return '资源不存在'
    case 500:
      return '服务器内部错误'
    case 503:
      return '服务暂时不可用'
    default:
      return `请求失败 (${status})`
  }
}

// ==================== 小说管理 ====================

/**
 * 获取小说列表
 */
export async function getNovelList(): Promise<ApiResponse<NovelMeta[]>> {
  const response = await apiClient.get('/novels/')
  return response.data
}

/**
 * 获取小说详情
 */
export async function getNovelDetail(novelId: string): Promise<ApiResponse<NovelMeta>> {
  const response = await apiClient.get(`/novels/${novelId}/`)
  return response.data
}

/**
 * 创建小说
 */
export async function createNovel(data: {
  title: string
  genre: string
  theme?: string[]
  target_chapters?: number
}): Promise<ApiResponse<NovelMeta>> {
  const response = await apiClient.post('/novels/', data)
  return response.data
}

/**
 * 更新小说元信息
 */
export async function updateNovel(novelId: string, data: Partial<NovelMeta>): Promise<ApiResponse<NovelMeta>> {
  const response = await apiClient.put(`/novels/${novelId}/`, data)
  return response.data
}

/**
 * 删除小说
 */
export async function deleteNovel(novelId: string): Promise<ApiResponse<void>> {
  const response = await apiClient.delete(`/novels/${novelId}/`)
  return response.data
}

// ==================== 世界观 ====================

/**
 * 获取世界观设定
 */
export async function getWorldSetting(novelId: string): Promise<ApiResponse<WorldSetting>> {
  const response = await apiClient.get(`/novels/${novelId}/world-setting/`)
  return response.data
}

/**
 * 更新世界观设定
 */
export async function updateWorldSetting(novelId: string, data: Partial<WorldSetting>): Promise<ApiResponse<WorldSetting>> {
  const response = await apiClient.put(`/novels/${novelId}/world-setting/`, data)
  return response.data
}

/**
 * SSE 流式生成世界观 - POST方式
 * 返回 SSE 配置对象
 */
export function getWorldSettingStreamConfig(
  novelId: string,
  description: string,
  storyPreference?: string
): { url: string; body: Record<string, unknown> } {
  return {
    url: `${API_BASE}/generation/world-setting/stream/`,
    body: {
      novel_id: novelId,
      user_description: description,
      story_preference: storyPreference || '经典成长线',
    },
  }
}

/**
 * SSE 流式生成世界观 - 旧版URL（兼容）
 */
export function getWorldSettingStreamUrl(novelId: string, description: string): string {
  return `${API_BASE}/generation/world-setting/stream/?novel_id=${novelId}&description=${encodeURIComponent(description)}`
}

// ==================== 人物 ====================

/**
 * 获取人物库
 */
export async function getCharacters(novelId: string): Promise<ApiResponse<CharactersLibrary>> {
  const response = await apiClient.get(`/novels/${novelId}/characters/`)
  return response.data
}

/**
 * 添加人物
 */
export async function addCharacter(novelId: string, character: Partial<Character>): Promise<ApiResponse<Character>> {
  const response = await apiClient.post(`/novels/${novelId}/characters/`, character)
  return response.data
}

/**
 * 更新人物
 */
export async function updateCharacter(novelId: string, characterId: string, data: Partial<Character>): Promise<ApiResponse<Character>> {
  const response = await apiClient.put(`/novels/${novelId}/characters/${characterId}/`, data)
  return response.data
}

/**
 * 删除人物
 */
export async function deleteCharacter(novelId: string, characterId: string): Promise<ApiResponse<void>> {
  const response = await apiClient.delete(`/novels/${novelId}/characters/${characterId}/`)
  return response.data
}

// ==================== 大纲 ====================

/**
 * 获取大纲
 */
export async function getOutline(novelId: string): Promise<ApiResponse<Outline>> {
  const response = await apiClient.get(`/novels/${novelId}/outline/`)
  return response.data
}

/**
 * 更新大纲
 */
export async function updateOutline(novelId: string, data: Partial<Outline>): Promise<ApiResponse<Outline>> {
  const response = await apiClient.put(`/novels/${novelId}/outline/`, data)
  return response.data
}

/**
 * SSE 流式生成大纲 - POST方式
 */
export function getOutlineStreamConfig(
  novelId: string,
  targetChapters?: number,
  preferences?: { story_preference?: string; pacing_preference?: string }
): { url: string; body: Record<string, unknown> } {
  return {
    url: `${API_BASE}/generation/outline/stream/`,
    body: {
      novel_id: novelId,
      target_chapters: targetChapters,
      ...preferences,
    },
  }
}

/**
 * SSE 流式生成大纲 - 旧版URL（兼容）
 */
export function getOutlineStreamUrl(novelId: string): string {
  return `${API_BASE}/generation/outline/stream/${novelId}/`
}

// ==================== 章节 ====================

/**
 * 获取章节列表
 */
export async function getChapterList(novelId: string): Promise<ApiResponse<Chapter[]>> {
  const response = await apiClient.get(`/novels/${novelId}/chapters/`)
  return response.data
}

/**
 * 获取单个章节
 */
export async function getChapter(novelId: string, chapterNum: number): Promise<ApiResponse<Chapter>> {
  const response = await apiClient.get(`/novels/${novelId}/chapters/${chapterNum}/`)
  return response.data
}

/**
 * 更新章节内容
 */
export async function updateChapter(novelId: string, chapterNum: number, content: string): Promise<ApiResponse<Chapter>> {
  const response = await apiClient.put(`/novels/${novelId}/chapters/${chapterNum}/`, { content })
  return response.data
}

/**
 * 删除章节
 */
export async function deleteChapter(novelId: string, chapterNum: number): Promise<ApiResponse<void>> {
  const response = await apiClient.delete(`/novels/${novelId}/chapters/${chapterNum}/`)
  return response.data
}

/**
 * SSE 流式生成章节 - POST方式
 */
export function getChapterStreamConfig(
  novelId: string,
  chapterNum: number,
  outlineContext?: { key_events?: string[]; turning_points?: unknown[] }
): { url: string; body: Record<string, unknown> } {
  return {
    url: `${API_BASE}/generation/chapter/stream/`,
    body: {
      novel_id: novelId,
      chapter_num: chapterNum,
      outline_context: outlineContext,
    },
  }
}

/**
 * SSE 流式生成章节 - 旧版URL（兼容）
 */
export function getChapterStreamUrl(novelId: string, chapterNum: number): string {
  return `${API_BASE}/generation/chapter/stream/${novelId}/${chapterNum}/`
}

// ==================== 校验 ====================

/**
 * 执行单章校验
 */
export async function validateChapter(novelId: string, chapterNum: number): Promise<ApiResponse<ValidationReport>> {
  const response = await apiClient.post(`/novels/${novelId}/chapters/${chapterNum}/validate/`)
  return response.data
}

/**
 * 执行全书校验
 */
export async function validateNovel(novelId: string): Promise<ApiResponse<ValidationReport[]>> {
  const response = await apiClient.post(`/novels/${novelId}/validate/`)
  return response.data
}

/**
 * 获取校验报告
 */
export async function getValidationReport(novelId: string, chapterNum?: number): Promise<ApiResponse<ValidationReport>> {
  const url = chapterNum
    ? `/novels/${novelId}/chapters/${chapterNum}/validation/`
    : `/novels/${novelId}/validation/`
  const response = await apiClient.get(url)
  return response.data
}

/**
 * 应用校验修正
 */
export async function applyValidationFix(novelId: string, issueId: string): Promise<ApiResponse<void>> {
  const response = await apiClient.post(`/novels/${novelId}/validation/fix/${issueId}/`)
  return response.data
}

// ==================== 状态追踪 ====================

/**
 * 获取时间线状态
 */
export async function getTimeline(novelId: string): Promise<ApiResponse<TimelineState>> {
  const response = await apiClient.get(`/state/${novelId}/timeline/`)
  return response.data
}

/**
 * 更新时间线状态
 */
export async function updateTimeline(novelId: string, data: Partial<TimelineState>): Promise<ApiResponse<TimelineState>> {
  const response = await apiClient.put(`/state/${novelId}/timeline/`, data)
  return response.data
}

/**
 * 获取人物状态列表
 */
export async function getCharacterStates(novelId: string): Promise<ApiResponse<CharacterState[]>> {
  const response = await apiClient.get(`/state/${novelId}/character-states/`)
  return response.data
}

/**
 * 更新人物状态
 */
export async function updateCharacterState(novelId: string, charId: string, updates: Partial<CharacterState>): Promise<ApiResponse<CharacterState>> {
  const response = await apiClient.put(`/state/${novelId}/character-states/${charId}/`, updates)
  return response.data
}

/**
 * 获取伏笔状态列表
 */
export async function getForeshadowingState(novelId: string): Promise<ApiResponse<ForeshadowingState>> {
  const response = await apiClient.get(`/state/${novelId}/foreshadowing/`)
  return response.data
}

/**
 * 更新伏笔状态
 */
export async function updateForeshadowingState(novelId: string, fsId: string, updates: Partial<ForeshadowingItem>): Promise<ApiResponse<ForeshadowingItem>> {
  const response = await apiClient.put(`/state/${novelId}/foreshadowing/${fsId}/`, updates)
  return response.data
}

// ==================== novelApi 对象（兼容旧代码）====================

export const novelApi = {
  baseUrl: API_BASE,

  // 小说管理
  listNovels: async (): Promise<NovelMeta[]> => {
    const response = await apiClient.get('/novels/')
    return response.data.data || []
  },

  getNovel: async (novelId: string): Promise<Novel> => {
    const [metaRes, worldRes, charactersRes, outlineRes, chaptersRes] = await Promise.all([
      apiClient.get(`/novels/${novelId}/`),
      apiClient.get(`/novels/${novelId}/world-setting/`),
      apiClient.get(`/novels/${novelId}/characters/`),
      apiClient.get(`/novels/${novelId}/outline/`),
      apiClient.get(`/novels/${novelId}/chapters/`),
    ])
    return {
      meta: metaRes.data.data,
      world_setting: worldRes.data.data,
      characters: charactersRes.data.data,
      outline: outlineRes.data.data,
      chapters: chaptersRes.data.data,
    }
  },

  createNovel: async (data: { title: string; genre: string; target_chapters?: number }): Promise<NovelMeta> => {
    const response = await apiClient.post('/novels/', data)
    return response.data.data
  },

  updateNovel: async (novelId: string, data: Partial<NovelMeta>): Promise<NovelMeta> => {
    const response = await apiClient.put(`/novels/${novelId}/`, data)
    return response.data.data
  },

  deleteNovel: async (novelId: string): Promise<void> => {
    await apiClient.delete(`/novels/${novelId}/`)
  },

  // 人物管理
  addCharacter: async (novelId: string, character: Partial<Character>): Promise<Character> => {
    const response = await apiClient.post(`/novels/${novelId}/characters/`, character)
    return response.data.data
  },

  updateCharacter: async (novelId: string, characterId: string, data: Partial<Character>): Promise<Character> => {
    const response = await apiClient.put(`/novels/${novelId}/characters/${characterId}/`, data)
    return response.data.data
  },

  deleteCharacter: async (novelId: string, characterId: string): Promise<void> => {
    await apiClient.delete(`/novels/${novelId}/characters/${characterId}/`)
  },

  // 章节管理
  deleteChapter: async (novelId: string, chapterNum: number): Promise<void> => {
    await apiClient.delete(`/novels/${novelId}/chapters/${chapterNum}/`)
  },
}

// 导出超时配置供外部使用
export { TIMEOUT_CONFIG }

export default apiClient