import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import type { NovelMeta } from '@/types/novel'
import { novelApi } from '@services/api'

export default function NovelList() {
  const navigate = useNavigate()
  const [novels, setNovels] = useState<NovelMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  // 删除确认弹窗状态
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingNovel, setDeletingNovel] = useState<NovelMeta | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    loadNovels()
  }, [])

  const loadNovels = async () => {
    try {
      const data = await novelApi.listNovels()
      setNovels(data)
    } catch (err) {
      console.error('Failed to load novels:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!newTitle.trim()) return
    setCreating(true)
    try {
      const novel = await novelApi.createNovel({
        title: newTitle,
        genre: '都市职场',
        target_chapters: 200
      })
      navigate(`/novels/${novel.novel_id}/world-setting`)
    } catch (err) {
      console.error('Failed to create novel:', err)
    } finally {
      setCreating(false)
      setNewTitle('')
    }
  }

  // 打开删除确认弹窗
  const handleDeleteClick = (novel: NovelMeta, e: React.MouseEvent) => {
    e.stopPropagation() // 阻止触发卡片点击导航
    setDeletingNovel(novel)
    setShowDeleteConfirm(true)
  }

  // 确认删除
  const handleConfirmDelete = async () => {
    if (!deletingNovel) return
    setDeleting(true)
    try {
      await novelApi.deleteNovel(deletingNovel.novel_id)
      setNovels(prev => prev.filter(n => n.novel_id !== deletingNovel.novel_id))
      setShowDeleteConfirm(false)
      setDeletingNovel(null)
    } catch (err) {
      console.error('Failed to delete novel:', err)
    } finally {
      setDeleting(false)
    }
  }

  // 取消删除
  const handleCancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeletingNovel(null)
  }

  return (
    <div className="min-h-screen bg-paper-cream p-8">
      <div className="max-w-4xl mx-auto">
        {/* 品牌标题区 - 墨韵书香风格 */}
        <div className="flex items-center gap-6 mb-10">
          <div className="seal-lg text-2xl">笔</div>
          <div>
            <h1 className="text-title-3xl font-bold text-ink-800">
              灵笔
            </h1>
            <p className="text-title-sm text-ink-500 mt-1">
              都市言情小说生成器
            </p>
          </div>
        </div>

        {/* 创建新小说 */}
        <div className="paper p-8 mb-10">
          <h2 className="text-title-xl font-semibold text-ink-800 mb-6 flex items-center gap-3">
            <div className="w-1.5 h-7 bg-vermilion-500 rounded-full" />
            创建新小说
          </h2>
          <div className="flex gap-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="输入小说标题，如：霸道总裁的职场恋情..."
              className="input-ink flex-1"
              disabled={creating}
              data-testid="title-input"
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newTitle.trim()}
              className="btn-vermilion min-w-[100px]"
              data-testid="create-button"
            >
              {creating ? (
                <span className="flex items-center gap-2">
                  <div className="loading-spinner w-4 h-4" />
                  创建中
                </span>
              ) : '创建'}
            </button>
          </div>
          <p className="text-title-xs text-ink-400 mt-4">
            提示：创建后可使用 AI 随机生成世界观，或手动输入背景描述
          </p>
        </div>

        {/* 小说列表 */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="loading-spinner" />
            <span className="loading-text ml-4">加载中...</span>
          </div>
        ) : novels.length === 0 ? (
          <div className="text-center py-16 paper-flat p-10">
            <div className="w-16 h-16 bg-ink-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-ink-400 text-2xl">空</span>
            </div>
            <p className="text-title-base text-ink-600 mb-2">暂无小说作品</p>
            <p className="text-title-sm text-ink-400">
              创建新小说，开启您的都市言情创作之旅
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {novels.map((novel) => (
              <div
                key={novel.novel_id}
                onClick={() => navigate(`/novels/${novel.novel_id}`)}
                className="paper-hover p-8 cursor-pointer group relative"
                data-testid="novel-card"
              >
                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDeleteClick(novel, e)}
                  className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-ink-400 hover:text-vermilion-600 p-2 rounded-paper hover:bg-vermilion-50"
                  title="删除小说"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>

                {/* 卡片内容 */}
                <div className="flex items-start gap-6">
                  {/* 章节进度印章 */}
                  <div className="seal-lg flex-shrink-0">
                    {novel.completed_chapters}
                  </div>

                  <div className="flex-1">
                    {/* 标题 */}
                    <h3 className="text-title-lg font-bold text-ink-800 group-hover:text-vermilion-700 transition-colors">
                      {novel.title}
                    </h3>

                    {/* 信息栏 */}
                    <div className="flex items-center gap-4 mt-3 text-title-sm text-ink-500">
                      <span className="badge-ink">{novel.genre}</span>
                      <span className="text-ink-300">|</span>
                      <span>
                        <span className="text-vermilion-600 font-semibold">{novel.completed_chapters}</span>
                        <span className="text-ink-400">/{novel.target_chapters}</span>
                        章
                      </span>
                      <span className="text-ink-300">|</span>
                      <span className="text-ink-600">
                        {novel.word_count > 1000
                          ? `${(novel.word_count / 1000).toFixed(1)}k`
                          : novel.word_count}字
                      </span>
                    </div>

                    {/* 状态标签 */}
                    <div className="mt-4 flex items-center gap-3">
                      <span className={`status-${novel.status === 'writing' ? 'generating' : novel.status === 'planning' ? 'draft' : novel.status}`}>
                        {novel.status === 'writing' ? '创作中' :
                         novel.status === 'completed' ? '已完成' :
                         novel.status === 'planning' ? '规划中' :
                         novel.status === 'world_building' ? '世界观' :
                         novel.status === 'outline' ? '大纲' :
                         novel.status === 'validation' ? '校验中' : novel.status}
                      </span>

                      {/* 进度条 */}
                      {novel.target_chapters > 0 && (
                        <div className="flex-1 max-w-xs">
                          <div className="progress-bar">
                            <div
                              className="progress-bar-fill bg-vermilion-gradient"
                              style={{ width: `${Math.min(100, (novel.completed_chapters / novel.target_chapters) * 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 删除确认弹窗 - 墨韵书香风格 */}
      {showDeleteConfirm && deletingNovel && (
        <div className="dialog-overlay" data-testid="dialog-overlay">
          <div className="dialog-paper">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-vermilion-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-vermilion-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.166 2.502-2.86 0-3.14-3.51-5.74-7-5.74s-7 2.6-7 5.74c0 1.694.962 2.86 2.502 2.86z" />
                </svg>
              </div>
              <div>
                <h2 className="text-title-xl text-ink-800">确认删除小说？</h2>
                <p className="text-title-sm text-ink-500 mt-1">此操作不可撤销</p>
              </div>
            </div>

            <div className="bg-paper-aged rounded-paper-md p-4 mb-6">
              <p className="font-prose text-ink-700">
                即将删除：<span className="font-semibold text-vermilion-600">{deletingNovel.title}</span>
              </p>
              <p className="text-title-xs text-ink-500 mt-2">
                所有章节、人物、大纲等数据将永久丢失
              </p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleCancelDelete}
                disabled={deleting}
                className="btn-outline-ink flex-1"
              >
                取消
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="btn-vermilion flex-1"
              >
                {deleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="loading-spinner w-4 h-4" />
                    删除中
                  </span>
                ) : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}