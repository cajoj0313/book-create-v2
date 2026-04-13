/**
 * 大纲编辑页面 - 墨韵书香风格
 * 功能：
 * - SSE流式大纲生成
 * - JSON解析和可视化展示（卷划分、章节规划）
 * - 编辑功能（可编辑章节标题、事件等）
 * - 确认按钮（生成后需确认）
 * - 伏笔计划展示
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SSEClient } from '@services/sse-client'
import { getOutline, updateOutline, getWorldSetting } from '@services/api'
import type { Outline, ChapterOutline, WorldSetting } from '@/types/novel'

// 生成状态
type GenerateStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'

// 编辑模式
type EditMode = 'view' | 'edit'

// 确认对话框
type ConfirmDialog = 'none' | 'confirm' | 'success'

// 展开状态
interface ExpandState {
  volumes: Record<string, boolean>
  chapters: Record<number, boolean>
}

export default function OutlineEditor() {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()

  // 用户配置
  const [targetChapters, setTargetChapters] = useState(200)
  const [storyPreference, setStoryPreference] = useState('经典成长线')
  const [pacingPreference, setPacingPreference] = useState('适中节奏')

  // 生成状态
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [generatedContent, setGeneratedContent] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 解析后的大纲数据
  const [outline, setOutline] = useState<Outline | null>(null)
  const [pendingOutline, setPendingOutline] = useState<Outline | null>(null) // 待确认的大纲

  // 编辑模式
  const [editMode, setEditMode] = useState<EditMode>('view')
  const [editedOutline, setEditedOutline] = useState<Outline | null>(null)

  // 加载状态
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 世界观（用于生成上下文）
  const [worldSetting, setWorldSetting] = useState<WorldSetting | null>(null)

  // 确认对话框
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>('none')

  // 提示消息
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // 展开状态
  const [expandState, setExpandState] = useState<ExpandState>({
    volumes: {},
    chapters: {},
  })

  // SSE客户端
  const sseClientRef = useRef<SSEClient | null>(null)

  // 自动关闭提示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 加载已有大纲和世界观
  useEffect(() => {
    if (novelId) {
      loadExistingData(novelId)
    }
  }, [novelId])

  // 清理SSE连接
  useEffect(() => {
    return () => {
      if (sseClientRef.current) {
        sseClientRef.current.disconnect()
      }
    }
  }, [])

  // 当生成内容变化时，尝试解析JSON
  useEffect(() => {
    if (generateStatus === 'completed' && generatedContent) {
      const parsed = tryParseJSON(generatedContent)
      if (parsed) {
        setPendingOutline(parsed)
        setConfirmDialog('confirm')
      }
    }
  }, [generateStatus, generatedContent])

  async function loadExistingData(id: string) {
    try {
      setLoading(true)

      // 加载大纲
      const outlineRes = await getOutline(id)
      if (outlineRes.success && outlineRes.data) {
        setOutline(outlineRes.data)
        setEditedOutline(outlineRes.data)

        // 初始化展开状态
        const volumesExpand: Record<string, boolean> = {}
        const chaptersExpand: Record<number, boolean> = {}
        if (outlineRes.data.volumes) {
          outlineRes.data.volumes.forEach(v => {
            volumesExpand[v.volume_id] = true
          })
        }
        (outlineRes.data.chapters ?? []).slice(0, 10).forEach(ch => {
          chaptersExpand[ch.chapter_num] = true
        })
        setExpandState({ volumes: volumesExpand, chapters: chaptersExpand })
      }

      // 加载世界观（生成大纲时需要）
      const worldRes = await getWorldSetting(id)
      if (worldRes.success && worldRes.data) {
        setWorldSetting(worldRes.data)
      }

    } catch (err) {
      console.error('加载大纲失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 尝试解析JSON
  function tryParseJSON(content: string): Outline | null {
    try {
      let jsonContent = content
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      }
      const parsed = JSON.parse(jsonContent)
      // 只检查 chapters 是否存在（兼容武侠和都市言情）
      if (parsed.chapters && Array.isArray(parsed.chapters)) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  // 开始生成
  const handleGenerate = useCallback(() => {
    if (!novelId) return

    setGenerateStatus('connecting')
    setGeneratedContent('')
    setGenerateError(null)
    setOutline(null)
    setPendingOutline(null)

    const client = new SSEClient()
    sseClientRef.current = client

    client.connect(
      `/api/generation/outline/stream`,
      {
        method: 'POST',
        body: JSON.stringify({
          novel_id: novelId,
          target_chapters: targetChapters,
          story_preference: storyPreference,
          pacing_preference: pacingPreference,
        }),
      },
      {
        onEvent: (event) => {
          if (event.event === 'start') {
            setGenerateStatus('streaming')
          } else if (event.event === 'chunk') {
            setGeneratedContent(prev => prev + event.data)
          } else if (event.event === 'complete') {
            setGenerateStatus('completed')
          } else if (event.event === 'error') {
            setGenerateStatus('error')
            setGenerateError(event.data)
          }
        },
        onError: (err) => {
          setGenerateStatus('error')
          setGenerateError(err.message)
        },
        onComplete: () => {
          setGenerateStatus('completed')
        },
      }
    )
  }, [novelId, targetChapters, storyPreference, pacingPreference])

  // 停止生成
  const handleStopGenerate = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect()
      sseClientRef.current = null
    }
    setGenerateStatus('idle')
  }, [])

  // 确认使用生成的大纲
  const handleConfirmUse = useCallback(() => {
    if (pendingOutline) {
      setOutline(pendingOutline)
      setEditedOutline(pendingOutline)
      setEditMode('view')
      setConfirmDialog('success')
      setToast({ type: 'success', message: '大纲已生成，可进行编辑或保存' })

      // 初始化展开状态
      const volumesExpand: Record<string, boolean> = {}
      const chaptersExpand: Record<number, boolean> = {}
      if (pendingOutline.volumes) {
        pendingOutline.volumes.forEach(v => {
          volumesExpand[v.volume_id] = true
        })
      }
      (pendingOutline.chapters ?? []).slice(0, 10).forEach(ch => {
        chaptersExpand[ch.chapter_num] = true
      })
      setExpandState({ volumes: volumesExpand, chapters: chaptersExpand })
    }
  }, [pendingOutline])

  // 拒绝生成结果，重新生成
  const handleRejectAndRegenerate = useCallback(() => {
    setConfirmDialog('none')
    setPendingOutline(null)
    setGeneratedContent('')
    setGenerateStatus('idle')
  }, [])

  // 保存大纲
  async function handleSave() {
    if (!novelId || !editedOutline) return

    try {
      setSaving(true)
      const response = await updateOutline(novelId, editedOutline)
      if (response.success && response.data) {
        setOutline(response.data)
        setEditMode('view')
        setToast({ type: 'success', message: '大纲已保存' })
      } else {
        setToast({ type: 'error', message: '保存失败，请重试' })
      }
    } catch {
      setToast({ type: 'error', message: '保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  // 继续下一步（跳转章节写作）
  const handleNextStep = useCallback(() => {
    setConfirmDialog('confirm')
  }, [])

  // 确认继续下一步
  const handleConfirmNextStep = useCallback(async () => {
    if (novelId && outline) {
      try {
        await updateOutline(novelId, outline)
      } catch {
        console.error('保存失败:', console.error)
      }
    }
    setConfirmDialog('none')
    navigate(`/novels/${novelId}/chapters/1`)
  }, [novelId, outline, navigate])

  // 切换卷展开状态
  const toggleVolumeExpand = useCallback((volumeId: string) => {
    setExpandState(prev => ({
      ...prev,
      volumes: {
        ...prev.volumes,
        [volumeId]: !prev.volumes[volumeId],
      },
    }))
  }, [])

  // 切换章节展开状态
  const toggleChapterExpand = useCallback((chapterNum: number) => {
    setExpandState(prev => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        [chapterNum]: !prev.chapters[chapterNum],
      },
    }))
  }, [])

  // 全部展开/收起
  const toggleAllExpand = useCallback((expand: boolean) => {
    if (!outline) return

    const volumesExpand: Record<string, boolean> = {}
    const chaptersExpand: Record<number, boolean> = {}

    if (outline.volumes) {
      outline.volumes.forEach(v => {
        volumesExpand[v.volume_id] = expand
      })
    }
    if (outline.chapters) {
      outline.chapters.forEach(ch => {
        chaptersExpand[ch.chapter_num] = expand
      })
    }

    setExpandState({ volumes: volumesExpand, chapters: chaptersExpand })
  }, [outline])

  if (loading) {
    return (
      <div className="min-h-screen bg-paper-cream flex items-center justify-center">
        <div className="flex items-center gap-4">
          <div className="loading-spinner" />
          <span className="loading-text">加载中...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper-cream">
      {/* 提示消息 */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : toast.type === 'error' ? 'toast-error' : 'toast-warning'}`}>
          <span className="font-title-sm">{toast.message}</span>
        </div>
      )}

      {/* 头部 */}
      <header className="bg-paper-white border-b border-ink-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/novels/${novelId}`)} className="btn-text">
              ← 返回
            </button>
            <div className="flex items-center gap-3">
              <div className="seal-lg">纲</div>
              <h1 className="text-title-xl font-bold text-ink-800">大纲生成</h1>
            </div>
          </div>

          {outline && (
            <div className="flex gap-3">
              {editMode === 'view' ? (
                <button onClick={() => setEditMode('edit')} className="btn-outline-ink">
                  编辑
                </button>
              ) : (
                <button onClick={() => setEditMode('view')} className="btn-outline-ink">
                  取消编辑
                </button>
              )}
              <button onClick={handleSave} disabled={saving} className="btn-indigo">
                {saving ? '保存中...' : '保存'}
              </button>
              <button onClick={handleNextStep} className="btn-vermilion">
                开始写作 →
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 生成控制面板 */}
        {!outline && (
          <div className="paper p-8 mb-8">
            <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-vermilion-500 rounded-full" />
              大纲生成配置
            </h2>

            <div className="grid grid-cols-3 gap-6">
              <div>
                <label className="block text-title-sm text-ink-600 mb-2">目标章节数</label>
                <input
                  type="number"
                  value={targetChapters}
                  onChange={(e) => setTargetChapters(Number(e.target.value))}
                  className="input-ink"
                  min={50}
                  max={500}
                  disabled={generateStatus === 'streaming'}
                />
              </div>

              <div>
                <label className="block text-title-sm text-ink-600 mb-2">故事走向偏好</label>
                <select
                  value={storyPreference}
                  onChange={(e) => setStoryPreference(e.target.value)}
                  className="input-ink"
                  disabled={generateStatus === 'streaming'}
                >
                  <option value="经典成长线">经典成长线</option>
                  <option value="复仇逆袭">复仇逆袭</option>
                  <option value="轻松日常">轻松日常</option>
                  <option value="悬疑推理">悬疑推理</option>
                  <option value="爱情甜蜜">爱情甜蜜</option>
                </select>
              </div>

              <div>
                <label className="block text-title-sm text-ink-600 mb-2">节奏偏好</label>
                <select
                  value={pacingPreference}
                  onChange={(e) => setPacingPreference(e.target.value)}
                  className="input-ink"
                  disabled={generateStatus === 'streaming'}
                >
                  <option value="适中节奏">适中节奏</option>
                  <option value="快节奏">快节奏（高潮频繁）</option>
                  <option value="慢节奏">慢节奏（细腻铺垫）</option>
                </select>
              </div>
            </div>

            {/* 世界观提示 */}
            {worldSetting && (
              <div className="mt-6 paper-flat p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-indigo-500">◆</span>
                  <span className="font-title-sm text-ink-700">基于已有世界观生成</span>
                </div>
                <div className="font-prose text-sm text-ink-600">
                  城市: {worldSetting.background?.city || '未设定'} ·
                  职场: {worldSetting.background?.workplace || '未设定'} ·
                  男主: {worldSetting.male_lead?.name || '未设定'} ·
                  女主: {worldSetting.female_lead?.name || '未设定'}
                </div>
              </div>
            )}

            {!worldSetting && (
              <div className="mt-6 bg-amber-50 border border-amber-200 p-4 rounded-paper-md">
                <div className="flex items-center gap-2 text-amber-700">
                  <span>⚠</span>
                  <span className="font-title-sm">未检测到世界观，建议先创建世界观</span>
                </div>
                <button
                  onClick={() => navigate(`/novels/${novelId}/world-builder`)}
                  className="mt-3 btn-outline-vermilion"
                >
                  前往创建世界观
                </button>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              {generateStatus === 'streaming' ? (
                <button onClick={handleStopGenerate} className="btn-vermilion">
                  停止生成
                </button>
              ) : (
                <button
                  onClick={handleGenerate}
                  disabled={generateStatus === 'connecting'}
                  className="btn-vermilion"
                >
                  {generateStatus === 'connecting' ? (
                    <span className="flex items-center gap-2">
                      <div className="loading-spinner w-4 h-4" />
                      连接中...
                    </span>
                  ) : '生成大纲'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* 生成状态指示 */}
        {generateStatus !== 'idle' && (
          <div className={`paper-flat p-6 mb-8 ${
            generateStatus === 'streaming' ? 'border-indigo-300' :
            generateStatus === 'completed' ? 'border-indigo-200' :
            generateStatus === 'error' ? 'border-vermilion-300' : ''
          }`}>
            {generateStatus === 'connecting' && (
              <div className="flex items-center gap-3 text-ink-600">
                <div className="loading-spinner" />
                <span>正在连接AI服务...</span>
              </div>
            )}
            {generateStatus === 'streaming' && (
              <div className="flex items-center gap-3 text-indigo-700">
                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse-ink" />
                <span className="font-title-sm">AI正在生成大纲，实时显示中...</span>
                <div className="flex-1">
                  <div className="progress-bar">
                    <div className="progress-bar-fill w-1/3 animate-stream-flow" style={{ backgroundSize: '200% 100%' }} />
                  </div>
                </div>
              </div>
            )}
            {generateStatus === 'completed' && (
              <div className="flex items-center gap-2 text-indigo-600">
                <span className="text-indigo-500">✓</span>
                <span className="font-title-sm">生成完成，请确认内容</span>
              </div>
            )}
            {generateStatus === 'error' && (
              <div className="flex items-center gap-2 text-vermilion-700">
                <span className="text-vermilion-500">✗</span>
                <span className="font-title-sm">生成失败: {generateError}</span>
              </div>
            )}
          </div>
        )}

        {/* 流式生成内容（未解析时显示） */}
        {(generateStatus === 'streaming' || (generateStatus === 'completed' && !pendingOutline)) && generatedContent && (
          <div className="paper p-8 mb-8">
            <h2 className="font-title-lg text-ink-800 mb-4">生成内容</h2>
            <div className="bg-paper-aged rounded-paper-md p-6 max-h-96 overflow-y-auto scrollbar-ink">
              <pre className="font-prose text-writing-base whitespace-pre-wrap text-ink-800">
                {generatedContent}
              </pre>
              {generateStatus === 'streaming' && <span className="stream-cursor" />}
            </div>
          </div>
        )}

        {/* 大纲可视化展示 */}
        {outline && (
          <OutlineViewer
            outline={editMode === 'edit' ? editedOutline! : outline}
            editable={editMode === 'edit'}
            onChange={setEditedOutline}
            expandState={expandState}
            onToggleVolume={toggleVolumeExpand}
            onToggleChapter={toggleChapterExpand}
            onToggleAll={toggleAllExpand}
          />
        )}
      </main>

      {/* 确认对话框 - 生成结果确认 */}
      {confirmDialog === 'confirm' && pendingOutline && !outline && (
        <div className="dialog-overlay">
          <div className="dialog-paper w-full max-w-2xl">
            <h2 className="font-title-xl text-ink-800 mb-4 flex items-center gap-3">
              <div className="seal">确</div>
              确认使用此大纲？
            </h2>

            <div className="bg-paper-aged rounded-paper-md p-4 mb-6 max-h-48 overflow-y-auto scrollbar-ink">
              <div className="font-prose text-sm text-ink-700">
                <p className="mb-2"><strong>章节数:</strong> {pendingOutline.chapters.length}</p>
                {pendingOutline.volumes && pendingOutline.volumes.length > 0 && (
                  <>
                    <p className="mb-2"><strong>卷数:</strong> {pendingOutline.volumes.length}</p>
                    <p className="mb-2"><strong>第一卷:</strong> {pendingOutline.volumes[0]?.name}</p>
                  </>
                )}
                {pendingOutline.emotion_arc && (
                  <p className="mb-2"><strong>感情节奏:</strong> {pendingOutline.emotion_arc.length} 个阶段</p>
                )}
                {pendingOutline.sweet_points && (
                  <p className="mb-2"><strong>爽点计划:</strong> {pendingOutline.sweet_points.length} 个</p>
                )}
                {pendingOutline.foreshadowing_plan && (
                  <p><strong>伏笔计划:</strong> {pendingOutline.foreshadowing_plan.length} 条</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={handleRejectAndRegenerate} className="btn-outline-vermilion flex-1">
                拒绝，重新生成
              </button>
              <button onClick={handleConfirmUse} className="btn-vermilion flex-1">
                确认使用
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认对话框 - 继续下一步确认 */}
      {confirmDialog === 'confirm' && outline && (
        <div className="dialog-overlay">
          <div className="dialog-paper">
            <h2 className="font-title-xl text-ink-800 mb-4">开始写作？</h2>
            <p className="text-ink-600 mb-6 font-prose">
              大纲已完成，下一步将进入章节写作。当前大纲会自动保存。
            </p>

            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog('none')} className="btn-outline-ink flex-1">
                取消
              </button>
              <button onClick={handleConfirmNextStep} className="btn-vermilion flex-1">
                开始写作
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 成功提示 */}
      {confirmDialog === 'success' && (
        <div className="dialog-overlay">
          <div className="dialog-paper">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-2xl">
                ✓
              </div>
              <h2 className="font-title-xl text-ink-800">大纲生成成功</h2>
            </div>
            <p className="text-ink-600 mb-6 font-prose">
              你可以在下方编辑调整章节规划，或直接保存并开始写作。
            </p>
            <button onClick={() => setConfirmDialog('none')} className="btn-indigo w-full">
              开始编辑
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// 大纲可视化组件 - 墨韵书香风格
function OutlineViewer({
  outline,
  editable,
  onChange,
  expandState,
  onToggleVolume,
  onToggleChapter,
  onToggleAll,
}: {
  outline: Outline
  editable: boolean
  onChange: (outline: Outline) => void
  expandState: ExpandState
  onToggleVolume: (volumeId: string) => void
  onToggleChapter: (chapterNum: number) => void
  onToggleAll: (expand: boolean) => void
}) {
  // 更新字段
  const updateField = (path: string, value: unknown) => {
    if (!editable) return
    const newOutline = JSON.parse(JSON.stringify(outline))
    const keys = path.split('.')
    let obj: Record<string, unknown> = newOutline
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]] as Record<string, unknown>
    }
    obj[keys[keys.length - 1]] = value
    onChange(newOutline)
  }

  // 更新章节
  const updateChapter = (chapterNum: number, field: string, value: unknown) => {
    if (!editable) return
    const newOutline = JSON.parse(JSON.stringify(outline))
    const chapter = newOutline.chapters.find((ch: ChapterOutline) => ch.chapter_num === chapterNum)
    if (chapter) {
      (chapter as Record<string, unknown>)[field] = value
      onChange(newOutline)
    }
  }

  // 删除章节事件
  const removeChapterEvent = (chapterNum: number, eventIndex: number) => {
    if (!editable) return
    const newOutline = JSON.parse(JSON.stringify(outline))
    const chapter = newOutline.chapters.find((ch: ChapterOutline) => ch.chapter_num === chapterNum)
    if (chapter && chapter.key_events) {
      chapter.key_events.splice(eventIndex, 1)
      onChange(newOutline)
    }
  }

  // 添加章节事件
  const addChapterEvent = (chapterNum: number, event: string) => {
    if (!editable) return
    const newOutline = JSON.parse(JSON.stringify(outline))
    const chapter = newOutline.chapters.find((ch: ChapterOutline) => ch.chapter_num === chapterNum)
    if (chapter) {
      if (!chapter.key_events) chapter.key_events = []
      chapter.key_events.push(event)
      onChange(newOutline)
    }
  }

  // 按卷分组章节（武侠修仙版本）
  const chaptersByVolume: Record<string, ChapterOutline[]> = {}
  const hasVolumes = outline.volumes && outline.volumes.length > 0

  if (hasVolumes) {
    (outline.chapters ?? []).forEach(ch => {
      const volId = ch.volume_id || 'default'
      if (!chaptersByVolume[volId]) {
        chaptersByVolume[volId] = []
      }
      chaptersByVolume[volId].push(ch)
    })
  }

  return (
    <div className="space-y-8">
      {/* 操作工具栏 */}
      <div className="paper-flat p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-title-sm text-ink-600">展开控制:</span>
          <button onClick={() => onToggleAll(true)} className="btn-text text-title-sm">
            全部展开
          </button>
          <button onClick={() => onToggleAll(false)} className="btn-text text-title-sm">
            全部收起
          </button>
        </div>

        <div className="flex items-center gap-4 text-ink-600">
          <span className="font-title-sm">共 {(outline.chapters ?? []).length} 章</span>
          {hasVolumes && (
            <span className="font-title-sm">{outline.volumes!.length} 卷</span>
          )}
          {outline.foreshadowing_plan && (
            <span className="font-title-sm">{outline.foreshadowing_plan.length} 伏笔</span>
          )}
        </div>
      </div>

      {/* 都市言情版本 - 感情节奏表 */}
      {outline.emotion_arc && outline.emotion_arc.length > 0 && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-pink-500 rounded-full" />
            <span>感情节奏表</span>
            <span className="badge bg-pink-100 text-pink-800">{outline.emotion_arc.length} 个阶段</span>
          </h2>

          <div className="space-y-3">
            {outline.emotion_arc.map((arc, idx) => (
              <div key={idx} className="paper-flat p-4 flex items-center gap-4">
                <span className="seal w-8 h-8 bg-pink-500">{idx + 1}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge-vermilion">{arc.range}</span>
                    <span className="font-title-sm text-ink-800">{arc.stage}</span>
                  </div>
                  <div className="font-prose text-sm text-ink-600">
                    <span className="text-pink-600">{arc.emotion}</span> · {arc.description}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 都市言情版本 - 爽点计划 */}
      {outline.sweet_points && outline.sweet_points.length > 0 && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-gold-500 rounded-full" />
            <span>爽点计划</span>
            <span className="badge-gold">{outline.sweet_points.length} 个</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outline.sweet_points.map((sp, idx) => (
              <div key={idx} className="paper-flat p-4 float-paper">
                <div className="flex items-center justify-between mb-2">
                  <span className="badge-gold">第 {sp.chapter} 章</span>
                  <span className="text-title-xs text-gold-600">情感值: {sp.emotion_level}/10</span>
                </div>
                <div className="font-prose text-sm text-ink-700 mb-1">
                  <strong>{sp.type}</strong>: {sp.detail}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 都市言情版本 - 核心矛盾 */}
      {outline.main_conflict && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-vermilion-500 rounded-full" />
            <span>核心矛盾</span>
          </h2>

          <div className="paper-flat p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="badge-vermilion">{outline.main_conflict.type}</span>
              {outline.main_conflict.resolve_chapter && (
                <span className="text-title-xs text-ink-500">解决于第 {outline.main_conflict.resolve_chapter} 章</span>
              )}
            </div>
            <div className="font-prose text-ink-700">{outline.main_conflict.description}</div>
          </div>
        </section>
      )}

      {/* 武侠修仙版本 - 卷划分展示 */}
      {hasVolumes && (outline.volumes ?? []).map((volume) => (
        <section key={volume.volume_id} className="paper p-8">
          {/* 卷标题 */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 cursor-pointer" onClick={() => onToggleVolume(volume.volume_id)}>
              <div className="w-2 h-8 bg-vermilion-500 rounded-full" />
              <h2 className="font-title-lg text-ink-800">
                {editable ? (
                  <input
                    value={volume.name}
                    onChange={(e) => {
                      const newVolumes = (outline.volumes ?? []).map(v =>
                        v.volume_id === volume.volume_id ? { ...v, name: e.target.value } : v
                      )
                      updateField('volumes', newVolumes)
                    }}
                    className="input-ink"
                  />
                ) : volume.name}
              </h2>
              <span className="badge-vermilion">
                第 {volume.chapters_range.start}-{volume.chapters_range.end} 章
              </span>
            </div>

            <button
              onClick={() => onToggleVolume(volume.volume_id)}
              className="btn-text"
            >
              {expandState.volumes[volume.volume_id] ? '收起' : '展开'}
            </button>
          </div>

          {/* 卷主题 */}
          <div className="mb-6">
            <span className="text-title-sm text-ink-500">主题: </span>
            {editable ? (
              <input
                value={volume.theme}
                onChange={(e) => {
                  const newVolumes = (outline.volumes ?? []).map(v =>
                    v.volume_id === volume.volume_id ? { ...v, theme: e.target.value } : v
                  )
                  updateField('volumes', newVolumes)
                }}
                className="input-ink"
              />
            ) : (
              <span className="font-prose text-ink-700">{volume.theme}</span>
            )}
          </div>

          {/* 卷故事弧线 */}
          <div className="paper-flat p-4 mb-6">
            <span className="text-title-sm text-ink-500">故事弧线: </span>
            {editable ? (
              <textarea
                value={volume.arc_summary}
                onChange={(e) => {
                  const newVolumes = (outline.volumes ?? []).map(v =>
                    v.volume_id === volume.volume_id ? { ...v, arc_summary: e.target.value } : v
                  )
                  updateField('volumes', newVolumes)
                }}
                className="input-ink mt-2"
                rows={2}
              />
            ) : (
              <span className="font-prose text-ink-700">{volume.arc_summary}</span>
            )}
          </div>

          {/* 章节列表 */}
          {expandState.volumes[volume.volume_id] && chaptersByVolume[volume.volume_id] && (
            <div className="space-y-4">
              {chaptersByVolume[volume.volume_id].map((chapter) => (
                <ChapterCard
                  key={chapter.chapter_num}
                  chapter={chapter}
                  editable={editable}
                  expanded={expandState.chapters[chapter.chapter_num]}
                  onToggle={() => onToggleChapter(chapter.chapter_num)}
                  onUpdate={(field, value) => updateChapter(chapter.chapter_num, field, value)}
                  onAddEvent={(event) => addChapterEvent(chapter.chapter_num, event)}
                  onRemoveEvent={(idx) => removeChapterEvent(chapter.chapter_num, idx)}
                />
              ))}
            </div>
          )}
        </section>
      ))}

      {/* 都市言情版本 - 直接展示章节列表（无卷分组） */}
      {!hasVolumes && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-500 rounded-full" />
            <span>章节规划</span>
          </h2>

          <div className="space-y-4">
            {(outline.chapters ?? []).map((chapter) => (
              <ChapterCard
                key={chapter.chapter_num}
                chapter={chapter}
                editable={editable}
                expanded={expandState.chapters[chapter.chapter_num]}
                onToggle={() => onToggleChapter(chapter.chapter_num)}
                onUpdate={(field, value) => updateChapter(chapter.chapter_num, field, value)}
                onAddEvent={(event) => addChapterEvent(chapter.chapter_num, event)}
                onRemoveEvent={(idx) => removeChapterEvent(chapter.chapter_num, idx)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 武侠修仙版本 - 伏笔计划 */}
      {outline.foreshadowing_plan && outline.foreshadowing_plan.length > 0 && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-gold-500 rounded-full" />
            <span>伏笔计划</span>
            <span className="badge-gold">{outline.foreshadowing_plan.length} 条</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {outline.foreshadowing_plan.map((foreshadow, idx) => (
              <div key={foreshadow.id} className="paper-flat p-4 float-paper">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="seal w-6 h-6 text-title-xs">{idx + 1}</span>
                    <span className={`badge ${
                      foreshadow.status === 'pending' ? 'badge-ink' :
                      foreshadow.status === 'planted' ? 'badge-indigo' : 'badge-vermilion'
                    }`}>
                      {foreshadow.status === 'pending' ? '待埋' :
                       foreshadow.status === 'planted' ? '已埋' : '已回收'}
                    </span>
                  </div>
                  <span className="text-title-xs text-gold-600">
                    回收于第 {foreshadow.recycle_chapter} 章
                  </span>
                </div>

                {editable ? (
                  <textarea
                    value={foreshadow.hint}
                    onChange={(e) => {
                      const newPlan = outline.foreshadowing_plan?.map(f =>
                        f.id === foreshadow.id ? { ...f, hint: e.target.value } : f
                      )
                      updateField('foreshadowing_plan', newPlan)
                    }}
                    className="input-ink text-sm"
                    rows={2}
                  />
                ) : (
                  <div className="font-prose text-sm text-ink-700">{foreshadow.hint}</div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

// 章节卡片组件
function ChapterCard({
  chapter,
  editable,
  expanded,
  onToggle,
  onUpdate,
  onAddEvent,
  onRemoveEvent,
}: {
  chapter: ChapterOutline
  editable: boolean
  expanded: boolean
  onToggle: () => void
  onUpdate: (field: string, value: unknown) => void
  onAddEvent: (event: string) => void
  onRemoveEvent: (index: number) => void
}) {
  const [newEvent, setNewEvent] = useState('')

  const handleAddEvent = () => {
    if (newEvent.trim()) {
      onAddEvent(newEvent.trim())
      setNewEvent('')
    }
  }

  return (
    <div className="paper-flat p-4">
      {/* 章节头部 */}
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center gap-3">
          <div className={`seal w-8 h-8 ${chapter.sweet_point ? 'bg-gold-500' : ''}`}>{chapter.chapter_num}</div>
          <div>
            {editable ? (
              <input
                value={chapter.title}
                onChange={(e) => onUpdate('title', e.target.value)}
                className="input-ink font-title-sm"
              />
            ) : (
              <span className="font-title-sm text-ink-800">{chapter.title}</span>
            )}
          </div>
          {/* 都市言情版本 - 感情阶段标记 */}
          {chapter.emotion_stage && (
            <span className="badge bg-pink-100 text-pink-800 text-title-xs">{chapter.emotion_stage}</span>
          )}
          {/* 爽点章节标记 */}
          {chapter.sweet_point && (
            <span className="badge-gold text-title-xs">爽点</span>
          )}
        </div>

        <button className="btn-text text-title-xs">
          {expanded ? '收起' : '展开'}
        </button>
      </div>

      {/* 章节详情 */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-ink-200">
          {/* 都市言情版本 - 感情进度 */}
          {chapter.emotion_progress && (
            <div className="mb-4 bg-pink-50 border border-pink-200 p-3 rounded-paper-md">
              <h4 className="font-title-sm text-pink-700 mb-2 flex items-center gap-2">
                <span className="text-pink-500">♡</span>
                感情进度
              </h4>
              <span className="font-prose text-sm text-ink-700">{chapter.emotion_progress}</span>
            </div>
          )}

          {/* 核心事件 */}
          <div className="mb-4">
            <h4 className="font-title-sm text-ink-700 mb-2 flex items-center gap-2">
              <span className="w-1 h-4 bg-indigo-500 rounded-full" />
              核心事件
            </h4>

            {chapter.key_events.length > 0 ? (
              <div className="space-y-2">
                {chapter.key_events.map((event, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="seal w-5 h-5 text-title-xs">{idx + 1}</span>
                    {editable ? (
                      <input
                        value={event}
                        onChange={(e) => {
                          const newEvents = [...chapter.key_events]
                          newEvents[idx] = e.target.value
                          onUpdate('key_events', newEvents)
                        }}
                        className="input-ink text-sm flex-1"
                      />
                    ) : (
                      <span className="font-prose text-sm text-ink-700">{event}</span>
                    )}
                    {editable && (
                      <button
                        onClick={() => onRemoveEvent(idx)}
                        className="btn-text text-vermilion-500 text-title-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-ink-400 font-prose text-sm">暂无核心事件</p>
            )}

            {/* 添加事件 */}
            {editable && (
              <div className="flex gap-2 mt-3">
                <input
                  value={newEvent}
                  onChange={(e) => setNewEvent(e.target.value)}
                  placeholder="添加新事件..."
                  className="input-ink text-sm flex-1"
                />
                <button onClick={handleAddEvent} className="btn-indigo text-title-xs">
                  添加
                </button>
              </div>
            )}
          </div>

          {/* 转折点 */}
          {chapter.turning_points && chapter.turning_points.length > 0 && (
            <div className="mb-4">
              <h4 className="font-title-sm text-ink-700 mb-2 flex items-center gap-2">
                <span className="text-gold-500">◆</span>
                转折点
              </h4>

              {chapter.turning_points.map((tp, idx) => (
                <div key={idx} className="bg-gold-50 border border-gold-200 p-3 rounded-paper-md mb-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="badge bg-gold-200 text-gold-800">{tp.type}</span>
                    <span className="text-title-xs text-ink-500">影响: {tp.impact}</span>
                  </div>
                  {editable ? (
                    <input
                      value={tp.event}
                      onChange={(e) => {
                        const newPoints = [...chapter.turning_points!]
                        newPoints[idx] = { ...tp, event: e.target.value }
                        onUpdate('turning_points', newPoints)
                      }}
                      className="input-ink text-sm"
                    />
                  ) : (
                    <span className="font-prose text-sm text-ink-700">{tp.event}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 人物成长 */}
          {chapter.character_growth && chapter.character_growth.length > 0 && (
            <div>
              <h4 className="font-title-sm text-ink-700 mb-2 flex items-center gap-2">
                <span className="text-vermilion-500">△</span>
                人物成长
              </h4>

              {chapter.character_growth.map((growth, idx) => (
                <div key={idx} className="paper-flat p-3 mb-2">
                  <span className="badge-vermilion text-title-xs">{growth.character_id}</span>
                  {editable ? (
                    <input
                      value={growth.change}
                      onChange={(e) => {
                        const newGrowth = [...chapter.character_growth!]
                        newGrowth[idx] = { ...growth, change: e.target.value }
                        onUpdate('character_growth', newGrowth)
                      }}
                      className="input-ink text-sm mt-2"
                    />
                  ) : (
                    <span className="font-prose text-sm text-ink-700 ml-2">{growth.change}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 伏笔 */}
          {chapter.foreshadowing && chapter.foreshadowing.length > 0 && (
            <div className="mt-4 pt-4 border-t border-ink-200">
              <h4 className="font-title-sm text-ink-700 mb-2 flex items-center gap-2">
                <span className="text-indigo-500">◇</span>
                伏笔操作
              </h4>

              {chapter.foreshadowing.map((fs, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <span className="badge-indigo">{fs.id}</span>
                  <span className="font-prose text-sm text-ink-700">{fs.hint}</span>
                  <span className="text-title-xs text-ink-400">→ 第 {fs.recycle_chapter} 章</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}