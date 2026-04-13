/**
 * 世界观构建页面 - 墨韵书香风格
 * 功能：
 * - SSE流式世界观生成
 * - JSON解析和可视化展示
 * - 编辑功能（用户可调整生成结果）
 * - 确认按钮（生成后需确认）
 * - 加载动画、成功提示、确认对话框
 */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { SSEClient } from '@services/sse-client'
import { getWorldSetting, updateWorldSetting } from '@services/api'
import type { WorldSetting } from '@/types/novel'

// 生成状态
type GenerateStatus = 'idle' | 'connecting' | 'streaming' | 'completed' | 'error'

// 编辑模式
type EditMode = 'view' | 'edit'

// 确认对话框
type ConfirmDialog = 'none' | 'confirm' | 'success'

export default function WorldBuilder() {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()

  // 用户描述
  const [description, setDescription] = useState('')
  const [storyPreference, setStoryPreference] = useState('经典成长线')

  // 生成状态
  const [generateStatus, setGenerateStatus] = useState<GenerateStatus>('idle')
  const [generatedContent, setGeneratedContent] = useState('')
  const [generateError, setGenerateError] = useState<string | null>(null)

  // 解析后的世界观数据
  const [worldSetting, setWorldSetting] = useState<WorldSetting | null>(null)
  const [pendingSetting, setPendingSetting] = useState<WorldSetting | null>(null) // 待确认的世界观

  // 编辑模式
  const [editMode, setEditMode] = useState<EditMode>('view')
  const [editedSetting, setEditedSetting] = useState<WorldSetting | null>(null)

  // 加载状态
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 确认对话框
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialog>('none')

  // 提示消息
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null)

  // SSE客户端
  const sseClientRef = useRef<SSEClient | null>(null)

  // 自动关闭提示
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // 加载已有世界观
  useEffect(() => {
    if (novelId) {
      loadExistingWorldSetting(novelId)
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
        setPendingSetting(parsed) // 先放入待确认状态
        setConfirmDialog('confirm') // 显示确认对话框
      }
    }
  }, [generateStatus, generatedContent])

  async function loadExistingWorldSetting(id: string) {
    try {
      setLoading(true)
      const response = await getWorldSetting(id)
      if (response.success && response.data) {
        setWorldSetting(response.data)
        setEditedSetting(response.data)
      }
    } catch (err) {
      console.error('加载世界观失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 尝试解析JSON
  function tryParseJSON(content: string): WorldSetting | null {
    try {
      let jsonContent = content
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/)
      if (jsonMatch) {
        jsonContent = jsonMatch[1]
      }
      const parsed = JSON.parse(jsonContent)
      // 只检查 background 字段，novel_id 由后端添加
      if (parsed.background) {
        return parsed
      }
      return null
    } catch {
      return null
    }
  }

  // 开始生成
  const handleGenerate = useCallback(() => {
    if (!description.trim() || !novelId) return

    setGenerateStatus('connecting')
    setGeneratedContent('')
    setGenerateError(null)
    setWorldSetting(null)
    setPendingSetting(null)

    const client = new SSEClient()
    sseClientRef.current = client

    client.connect(
      `/api/generation/world-setting/stream`,
      {
        method: 'POST',
        body: JSON.stringify({
          novel_id: novelId,
          user_description: description,
          story_preference: storyPreference,
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
  }, [novelId, description, storyPreference])

  // 停止生成
  const handleStopGenerate = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect()
      sseClientRef.current = null
    }
    setGenerateStatus('idle')
  }, [])

  // 确认使用生成的世界观
  const handleConfirmUse = useCallback(() => {
    if (pendingSetting) {
      setWorldSetting(pendingSetting)
      setEditedSetting(pendingSetting)
      setEditMode('view')
      setConfirmDialog('success')
      setToast({ type: 'success', message: '世界观已生成，可进行编辑或保存' })
    }
  }, [pendingSetting])

  // 拒绝生成结果，重新生成
  const handleRejectAndRegenerate = useCallback(() => {
    setConfirmDialog('none')
    setPendingSetting(null)
    setGeneratedContent('')
    setGenerateStatus('idle')
  }, [])

  // 保存世界观
  async function handleSave() {
    if (!novelId || !editedSetting) return

    try {
      setSaving(true)
      const response = await updateWorldSetting(novelId, editedSetting)
      if (response.success && response.data) {
        setWorldSetting(response.data)
        setEditMode('view')
        setToast({ type: 'success', message: '世界观已保存' })
      } else {
        setToast({ type: 'error', message: '保存失败，请重试' })
      }
    } catch {
      setToast({ type: 'error', message: '保存失败，请重试' })
    } finally {
      setSaving(false)
    }
  }

  // 继续下一步（跳转大纲）- 需确认
  const handleNextStep = useCallback(() => {
    setConfirmDialog('confirm')
  }, [])

  // 确认继续下一步
  const handleConfirmNextStep = useCallback(async () => {
    if (novelId && worldSetting) {
      try {
        await updateWorldSetting(novelId, worldSetting)
      } catch {
        console.error('保存失败:', console.error)
      }
    }
    setConfirmDialog('none')
    navigate(`/novels/${novelId}/outline`)
  }, [novelId, worldSetting, navigate])

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
              <div className="seal-lg">世</div>
              <h1 className="text-title-xl font-bold text-ink-800">世界观构建</h1>
            </div>
          </div>

          {worldSetting && (
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
                继续下一步 →
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* 生成控制面板 */}
        {!worldSetting && (
          <div className="paper p-8 mb-8">
            <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-vermilion-500 rounded-full" />
              输入小说背景描述
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-title-sm text-ink-600 mb-2">简短描述（必填）</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例如：一个武侠世界的修仙故事，主角从世家子弟成长为宗师..."
                  className="textarea-writing h-24"
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

              <div className="flex gap-4">
                {generateStatus === 'streaming' ? (
                  <button onClick={handleStopGenerate} className="btn-vermilion">
                    停止生成
                  </button>
                ) : (
                  <button
                    onClick={handleGenerate}
                    disabled={!description.trim() || generateStatus === 'connecting'}
                    className="btn-vermilion"
                  >
                    {generateStatus === 'connecting' ? (
                      <span className="flex items-center gap-2">
                        <div className="loading-spinner w-4 h-4" />
                        连接中...
                      </span>
                    ) : '开始生成'}
                  </button>
                )}
              </div>
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
                <span className="font-title-sm">AI正在生成世界观，实时显示中...</span>
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
        {(generateStatus === 'streaming' || (generateStatus === 'completed' && !pendingSetting)) && generatedContent && (
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

        {/* 世界观可视化展示 */}
        {worldSetting && (
          <WorldSettingViewer
            setting={editMode === 'edit' ? editedSetting! : worldSetting}
            editable={editMode === 'edit'}
            onChange={setEditedSetting}
          />
        )}
      </main>

      {/* 确认对话框 - 生成结果确认 */}
      {confirmDialog === 'confirm' && pendingSetting && !worldSetting && (
        <div className="dialog-overlay">
          <div className="dialog-paper w-full max-w-2xl">
            <h2 className="font-title-xl text-ink-800 mb-4 flex items-center gap-3">
              <div className="seal">确</div>
              确认使用此世界观？
            </h2>

            <div className="bg-paper-aged rounded-paper-md p-4 mb-6 max-h-48 overflow-y-auto scrollbar-ink">
              <div className="font-prose text-sm text-ink-700">
                <p className="mb-2"><strong>时代:</strong> {pendingSetting.background.era_name}</p>
                <p className="mb-2"><strong>世界:</strong> {pendingSetting.background.geography.world_name}</p>
                {pendingSetting.power_system && (
                  <p className="mb-2"><strong>体系:</strong> {pendingSetting.power_system.name}</p>
                )}
                <p><strong>核心冲突:</strong> {pendingSetting.core_conflict.main_conflict.type}</p>
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
      {confirmDialog === 'confirm' && worldSetting && (
        <div className="dialog-overlay">
          <div className="dialog-paper">
            <h2 className="font-title-xl text-ink-800 mb-4">继续下一步？</h2>
            <p className="text-ink-600 mb-6 font-prose">
              世界观已完成，下一步将生成大纲。当前世界观会自动保存。
            </p>

            <div className="flex gap-4">
              <button onClick={() => setConfirmDialog('none')} className="btn-outline-ink flex-1">
                取消
              </button>
              <button onClick={handleConfirmNextStep} className="btn-vermilion flex-1">
                继续
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
              <h2 className="font-title-xl text-ink-800">世界观生成成功</h2>
            </div>
            <p className="text-ink-600 mb-6 font-prose">
              你可以在下方编辑调整，或直接保存并继续下一步。
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

// 世界观可视化组件 - 墨韵书香风格
function WorldSettingViewer({
  setting,
  editable,
  onChange,
}: {
  setting: WorldSetting
  editable: boolean
  onChange: (setting: WorldSetting) => void
}) {
  const updateField = (path: string, value: unknown) => {
    if (!editable) return
    const newSetting = JSON.parse(JSON.stringify(setting))
    const keys = path.split('.')
    let obj: Record<string, unknown> = newSetting
    for (let i = 0; i < keys.length - 1; i++) {
      obj = obj[keys[i]] as Record<string, unknown>
    }
    obj[keys[keys.length - 1]] = value
    onChange(newSetting)
  }

  return (
    <div className="space-y-8">
      {/* 背景设定 */}
      <section className="paper p-8">
        <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-indigo-500 rounded-full" />
          <span>世界设定</span>
          <span className="badge-indigo">背景</span>
        </h2>

        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-title-sm text-ink-600 mb-2">时代类型</label>
            {editable ? (
              <input value={setting.background.era} onChange={(e) => updateField('background.era', e.target.value)} className="input-ink" />
            ) : (
              <div className="font-title-base text-ink-800">{setting.background.era}</div>
            )}
          </div>
          <div>
            <label className="block text-title-sm text-ink-600 mb-2">具体时代</label>
            {editable ? (
              <input value={setting.background.era_name} onChange={(e) => updateField('background.era_name', e.target.value)} className="input-ink" />
            ) : (
              <div className="font-title-base text-ink-800">{setting.background.era_name}</div>
            )}
          </div>
        </div>

        {/* 地理设定 */}
        <div className="mt-8 pt-6 border-t border-ink-200">
          <h3 className="font-title-base text-ink-700 mb-4">{setting.background.geography.world_name}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {setting.background.geography.regions.map((region, idx) => (
              <div key={idx} className="paper-flat p-4 float-paper">
                <div className="font-title-sm text-ink-800">{region.name}</div>
                {editable ? (
                  <textarea value={region.description} onChange={(e) => {
                    const newRegions = [...setting.background.geography.regions]
                    newRegions[idx] = { ...region, description: e.target.value }
                    updateField('background.geography.regions', newRegions)
                  }} className="input-ink text-sm mt-2" rows={2} />
                ) : (
                  <div className="font-prose text-sm text-ink-600 mt-2">{region.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 社会设定 */}
        <div className="mt-8 pt-6 border-t border-ink-200">
          <h3 className="font-title-base text-ink-700 mb-4">社会结构</h3>
          <div className="font-prose text-ink-600 mb-4">{setting.background.society.power_structure}</div>
          <div className="flex gap-2">
            {setting.background.society.social_classes.map((cls, idx) => (
              <span key={idx} className="badge-ink">{cls}</span>
            ))}
          </div>
        </div>
      </section>

      {/* 能力体系 */}
      {setting.power_system && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-vermilion-500 rounded-full" />
            <span>{setting.power_system.name}</span>
            <span className="badge-vermilion">体系</span>
          </h2>

          <div className="space-y-4">
            {setting.power_system.levels.map((level) => (
              <div key={level.rank} className="flex items-center gap-6 paper-flat p-4">
                <div className="w-16 h-8 bg-vermilion-100 rounded-paper flex items-center justify-center font-title-xs text-vermilion-700 font-bold">
                  Lv.{level.rank}
                </div>
                <div className="font-title-sm text-ink-800">{level.name}</div>
                <div className="font-prose text-sm text-ink-600">{level.description}</div>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-ink-200">
            <h3 className="font-title-base text-ink-700 mb-4">核心规则</h3>
            <ul className="space-y-2">
              {setting.power_system.key_rules.map((rule, idx) => (
                <li key={idx} className="flex items-start gap-2 font-prose text-ink-600">
                  <span className="text-vermilion-500">•</span>
                  {rule}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* 核心冲突 */}
      <section className="paper p-8">
        <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
          <div className="w-2 h-8 bg-gold-500 rounded-full" />
          <span>核心矛盾</span>
          <span className="badge-gold">冲突</span>
        </h2>

        <div className="bg-gold-50 border border-gold-200 rounded-paper-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="badge bg-gold-200 text-gold-800">{setting.core_conflict.main_conflict.type}</span>
          </div>
          <div className="font-title-base text-ink-800 mb-2">{setting.core_conflict.main_conflict.description}</div>
          <div className="font-prose text-sm text-ink-600">反派势力: {setting.core_conflict.main_conflict.antagonist}</div>
        </div>

        {setting.core_conflict.sub_conflicts.map((conflict, idx) => (
          <div key={idx} className="mt-4 paper-flat p-4">
            <span className="text-ink-500 font-title-xs">{conflict.type}:</span>
            <span className="ml-2 font-prose text-ink-700">{conflict.description}</span>
          </div>
        ))}
      </section>

      {/* 特殊元素 */}
      {setting.special_elements.length > 0 && (
        <section className="paper p-8">
          <h2 className="font-title-lg text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-2 h-8 bg-indigo-400 rounded-full" />
            <span>特殊设定</span>
            <span className="badge-indigo">元素</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {setting.special_elements.map((elem, idx) => (
              <div key={idx} className="paper-flat p-4 float-paper">
                <div className="font-title-sm text-ink-800">{elem.name}</div>
                <div className="text-xs text-indigo-600 font-title-xs mt-1">{elem.type}</div>
                <div className="font-prose text-sm text-ink-600 mt-2">{elem.description}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}