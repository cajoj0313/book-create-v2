/**
 * 小说详情页面
 * 功能：
 * - 小说基本信息展示
 * - 创作进度面板
 * - 人物关系图谱可视化
 * - 伏笔状态面板显示
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { novelApi, getOutline, getForeshadowingState, updateForeshadowingState, addCharacter, updateCharacter, deleteCharacter } from '@services/api'
import type { Novel, Character, Outline, ForeshadowingPlan, ForeshadowingItem, ForeshadowingState } from '@/types/novel'

// 关系类型颜色映射
const RELATION_COLORS: Record<string, string> = {
  love: '#ef4444',      // 红色 - 爱情
  mentor: '#3b82f6',    // 蓝色 - 师徒
  friend: '#22c55e',    // 绿色 - 朋友
  enemy: '#ef4444',     // 红色 - 敌人
  family: '#f59e0b',    // 黄色 - 家人
  default: '#6b7280',   // 灰色 - 其他
}

// 关系类型标签
const RELATION_LABELS: Record<string, string> = {
  love: '恋人',
  mentor: '师徒',
  friend: '朋友',
  enemy: '敌人',
  family: '家人',
  default: '关系',
}

export default function NovelDetail() {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'characters' | 'foreshadowing'>('overview')

  // 大纲详情（用于伏笔信息）
  const [outline, setOutline] = useState<Outline | null>(null)

  // 弹窗状态
  const [characterModal, setCharacterModal] = useState<{
    open: boolean
    mode: 'add' | 'edit'
    character?: Character
  }>({ open: false, mode: 'add' })
  const [foreshadowingModal, setForeshadowingModal] = useState<{
    open: boolean
    item?: ForeshadowingItem
  }>({ open: false })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    type: 'character' | 'foreshadowing'
    id: string
    name: string
  }>({ open: false, type: 'character', id: '', name: '' })

  // 伏笔状态数据
  const [foreshadowingState, setForeshadowingState] = useState<ForeshadowingState | null>(null)

  useEffect(() => {
    if (novelId) {
      loadNovelData(novelId)
    }
  }, [novelId])

  async function loadNovelData(id: string) {
    try {
      setLoading(true)

      // 加载小说详情
      const data = await novelApi.getNovel(id)
      setNovel(data)

      // 加载大纲（用于伏笔信息）
      const outlineRes = await getOutline(id)
      if (outlineRes.success && outlineRes.data) {
        setOutline(outlineRes.data)
      }

      // 加载伏笔状态
      const fsStateRes = await getForeshadowingState(id)
      if (fsStateRes.success && fsStateRes.data) {
        setForeshadowingState(fsStateRes.data)
      }

    } catch (err) {
      console.error('Failed to load novel:', err)
    } finally {
      setLoading(false)
    }
  }

  // 刷新人物数据
  async function refreshCharacters() {
    if (!novelId) return
    const data = await novelApi.getNovel(novelId)
    setNovel(data)
  }

  // 刷新伏笔状态数据
  async function refreshForeshadowing() {
    if (!novelId) return
    const fsStateRes = await getForeshadowingState(novelId)
    if (fsStateRes.success && fsStateRes.data) {
      setForeshadowingState(fsStateRes.data)
    }
    // 同时刷新大纲（伏笔计划）
    const outlineRes = await getOutline(novelId)
    if (outlineRes.success && outlineRes.data) {
      setOutline(outlineRes.data)
    }
  }

  // 删除人物
  async function handleDeleteCharacter(charId: string) {
    if (!novelId) return
    try {
      await deleteCharacter(novelId, charId)
      await refreshCharacters()
      setDeleteConfirm({ open: false, type: 'character', id: '', name: '' })
    } catch (err) {
      console.error('Failed to delete character:', err)
    }
  }

  // 删除伏笔（标记为已回收或删除）
  async function handleDeleteForeshadowing(fsId: string) {
    if (!novelId) return
    try {
      // 将伏笔标记为已回收
      await updateForeshadowingState(novelId, fsId, { status: 'recycled' })
      await refreshForeshadowing()
      setDeleteConfirm({ open: false, type: 'foreshadowing', id: '', name: '' })
    } catch (err) {
      console.error('Failed to update foreshadowing:', err)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  if (!novel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-500">小说不存在或已删除</div>
          <Link to="/" className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded-md">
            返回列表
          </Link>
        </div>
      </div>
    )
  }

  const meta = novel.meta
  const characters = novel.characters?.characters || []
  const relationshipEdges = novel.characters?.relationship_graph?.edges || []
  const foreshadowingPlan = outline?.foreshadowing_plan || []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 头部 */}
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/" className="text-gray-500 hover:text-gray-700">
                ← 返回列表
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{meta.title}</h1>
                <div className="text-sm text-gray-500">
                  {meta.genre} | {(meta.word_count ?? 0).toLocaleString()}字
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className={`px-3 py-1 rounded-full text-sm ${
                meta.status === 'completed' ? 'bg-green-100 text-green-700' :
                meta.status === 'writing' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {meta.status}
              </span>

              <span className="text-sm text-gray-500">
                章节: {meta.completed_chapters ?? 0}/{meta.target_chapters ?? 0}
              </span>
            </div>
          </div>

          {/* Tab导航 */}
          <nav className="flex gap-2 mt-4">
            {(['overview', 'characters', 'foreshadowing'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'overview' ? '概览' : tab === 'characters' ? '人物关系' : '伏笔状态'}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* 概览Tab */}
        {activeTab === 'overview' && (
          <OverviewTab
            novel={novel}
            novelId={novelId!}
            onNavigate={navigate}
          />
        )}

        {/* 人物关系Tab */}
        {activeTab === 'characters' && (
          <CharactersTab
            characters={characters}
            relationships={relationshipEdges}
            novelId={novelId!}
            onEditCharacter={(char) => setCharacterModal({ open: true, mode: 'edit', character: char })}
            onAddCharacter={() => setCharacterModal({ open: true, mode: 'add' })}
            onDeleteCharacter={(char) => setDeleteConfirm({ open: true, type: 'character', id: char.character_id, name: char.name })}
          />
        )}

        {/* 伏笔状态Tab */}
        {activeTab === 'foreshadowing' && (
          <ForeshadowingTab
            foreshadowings={foreshadowingPlan}
            foreshadowingState={foreshadowingState}
            completedChapters={meta.completed_chapters ?? 0}
            novelId={novelId!}
            onEditForeshadowing={(item) => setForeshadowingModal({ open: true, item })}
            onDeleteForeshadowing={(item) => setDeleteConfirm({ open: true, type: 'foreshadowing', id: item.id, name: item.hint })}
          />
        )}
      </main>

      {/* 人物编辑弹窗 */}
      {characterModal.open && (
        <CharacterModal
          novelId={novelId!}
          mode={characterModal.mode}
          character={characterModal.character}
          onClose={() => setCharacterModal({ open: false, mode: 'add' })}
          onSuccess={() => {
            setCharacterModal({ open: false, mode: 'add' })
            refreshCharacters()
          }}
        />
      )}

      {/* 伏笔编辑弹窗 */}
      {foreshadowingModal.open && foreshadowingModal.item && (
        <ForeshadowingModal
          novelId={novelId!}
          item={foreshadowingModal.item}
          onClose={() => setForeshadowingModal({ open: false })}
          onSuccess={() => {
            setForeshadowingModal({ open: false })
            refreshForeshadowing()
          }}
        />
      )}

      {/* 删除确认弹窗 */}
      {deleteConfirm.open && (
        <DeleteConfirmModal
          type={deleteConfirm.type}
          name={deleteConfirm.name}
          onCancel={() => setDeleteConfirm({ open: false, type: 'character', id: '', name: '' })}
          onConfirm={() => {
            if (deleteConfirm.type === 'character') {
              handleDeleteCharacter(deleteConfirm.id)
            } else {
              handleDeleteForeshadowing(deleteConfirm.id)
            }
          }}
        />
      )}
    </div>
  )
}

// 概览Tab
function OverviewTab({
  novel,
  novelId,
  onNavigate,
}: {
  novel: Novel
  novelId: string
  onNavigate: (path: string) => void
}) {
  const meta = novel.meta

  return (
    <div className="space-y-6">
      {/* 创作进度 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-semibold mb-4">创作进度</h2>

        <div className="grid grid-cols-4 gap-4">
          {/* 世界观 */}
          <ProgressCard
            title="世界观"
            status={novel.world_setting ? 'completed' : 'pending'}
            onClick={() => onNavigate(`/novels/${novelId}/world-setting`)}
          />

          {/* 人物库 */}
          <ProgressCard
            title="人物库"
            status={novel.characters ? 'completed' : 'pending'}
            subtitle={novel.characters ? `${(novel.characters.characters ?? []).length}人` : undefined}
            onClick={() => onNavigate(`/novels/${novelId}/world-setting`)}
          />

          {/* 大纲 */}
          <ProgressCard
            title="大纲"
            status={novel.outline ? 'completed' : 'pending'}
            subtitle={novel.outline ? `${(novel.outline.volumes ?? []).length}卷` : undefined}
            onClick={() => onNavigate(`/novels/${novelId}/outline`)}
          />

          {/* 章节 */}
          <ProgressCard
            title="章节"
            status={(meta.completed_chapters ?? 0) > 0 ? 'in_progress' : 'pending'}
            subtitle={`${meta.completed_chapters ?? 0}/${meta.target_chapters ?? 0}`}
            progress={(meta.completed_chapters ?? 0) / (meta.target_chapters ?? 1)}
            onClick={() => onNavigate(`/novels/${novelId}/chapters`)}
          />
        </div>
      </div>

      {/* 基本信息 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-semibold mb-4">基本信息</h2>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">类型</span>
            <span>{meta.genre ?? '未设置'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">主题</span>
            <span>{(meta.theme ?? []).join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">创建时间</span>
            <span>{meta.created_at ? new Date(meta.created_at).toLocaleDateString() : '未知'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">更新时间</span>
            <span>{meta.updated_at ? new Date(meta.updated_at).toLocaleDateString() : '未知'}</span>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="grid grid-cols-3 gap-4">
        {!novel.world_setting && (
          <ActionButton
            label="构建世界观"
            onClick={() => onNavigate(`/novels/${novelId}/world-setting`)}
            primary
          />
        )}
        {novel.world_setting && !novel.outline && (
          <ActionButton
            label="生成大纲"
            onClick={() => onNavigate(`/novels/${novelId}/outline`)}
            primary
          />
        )}
        {novel.outline && (
          <ActionButton
            label="开始写作"
            onClick={() => onNavigate(`/novels/${novelId}/chapters`)}
            primary
            highlight
          />
        )}
        <ActionButton
          label="校验报告"
          onClick={() => onNavigate(`/novels/${novelId}/validation`)}
        />
        <ActionButton
          label="删除小说"
          onClick={() => {
            if (confirm('确定要删除这部小说吗？此操作不可恢复。')) {
              novelApi.deleteNovel(novelId).then(() => onNavigate('/'))
            }
          }}
          danger
        />
      </div>
    </div>
  )
}

// 进度卡片
function ProgressCard({
  title,
  status,
  subtitle,
  progress,
  onClick,
}: {
  title: string
  status: 'completed' | 'in_progress' | 'pending'
  subtitle?: string
  progress?: number
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="text-center p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
    >
      <div className="text-sm text-gray-500">{title}</div>

      {status === 'completed' && (
        <div className="text-lg font-semibold text-green-600">✓ 完成</div>
      )}
      {status === 'in_progress' && (
        <div>
          <div className="text-lg font-semibold text-blue-600">{subtitle}</div>
          {progress && (
            <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          )}
        </div>
      )}
      {status === 'pending' && (
        <div className="text-lg font-semibold text-gray-400">待完成</div>
      )}
    </button>
  )
}

// 操作按钮
function ActionButton({
  label,
  onClick,
  primary = false,
  highlight = false,
  danger = false,
}: {
  label: string
  onClick: () => void
  primary?: boolean
  highlight?: boolean
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-4 rounded-lg text-lg font-medium transition-colors ${
        highlight
          ? 'bg-green-500 text-white hover:bg-green-600'
          : primary
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : danger
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
      }`}
    >
      {label}
    </button>
  )
}

// 人物关系Tab
function CharactersTab({
  characters,
  relationships,
  novelId: _novelId,
  onEditCharacter,
  onAddCharacter,
  onDeleteCharacter,
}: {
  characters: Character[]
  relationships: Array<{ from: string; to: string; type: string; strength: number }>
  novelId: string
  onEditCharacter: (char: Character) => void
  onAddCharacter: () => void
  onDeleteCharacter: (char: Character) => void
}) {
  // 人物ID到名字的映射
  const characterMap = new Map<string, Character>()
  characters.forEach(c => characterMap.set(c.character_id, c))

  return (
    <div className="space-y-6">
      {/* 人物关系图谱（简化版可视化） */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-semibold mb-4">人物关系图谱</h2>

        {relationships.length > 0 ? (
          <div className="relative min-h-[400px] bg-gray-50 rounded-lg p-4">
            {/* 简化版关系图 - 使用列表展示 */}
            <div className="space-y-3">
              {relationships.map((rel, idx) => {
                const fromChar = characterMap.get(rel.from)
                const toChar = characterMap.get(rel.to)

                if (!fromChar || !toChar) return null

                const color = RELATION_COLORS[rel.type] || RELATION_COLORS.default
                const label = RELATION_LABELS[rel.type] || rel.type

                return (
                  <div key={idx} className="flex items-center gap-4 bg-white p-3 rounded shadow-sm">
                    {/* 来源人物 */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}
                        style={{ backgroundColor: color }}>
                        {fromChar.name[0]}
                      </div>
                      <div className="text-xs text-center mt-1">{fromChar.name}</div>
                    </div>

                    {/* 关系箭头 */}
                    <div className="flex-1 flex items-center justify-center">
                      <div className="flex items-center gap-2">
                        <div className="h-0.5 w-16" style={{ backgroundColor: color }} />
                        <span className="px-2 py-1 rounded text-sm" style={{ backgroundColor: color + '20', color }}>
                          {label}
                        </span>
                        <span className="text-xs text-gray-400">强度: {rel.strength}</span>
                        <div className="h-0.5 w-16" style={{ backgroundColor: color }} />
                      </div>
                    </div>

                    {/* 目标人物 */}
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold`}
                        style={{ backgroundColor: color }}>
                        {toChar.name[0]}
                      </div>
                      <div className="text-xs text-center mt-1">{toChar.name}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            暂无人物关系数据
          </div>
        )}
      </div>

      {/* 人物列表 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">人物列表</h2>
          <button
            onClick={onAddCharacter}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            添加人物
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <CharacterCard
              key={char.character_id}
              character={char}
              onEdit={() => onEditCharacter(char)}
              onDelete={() => onDeleteCharacter(char)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

// 人物卡片
function CharacterCard({
  character,
  onEdit,
  onDelete,
}: {
  character: Character
  onEdit: () => void
  onDelete: () => void
}) {
  const roleColors: Record<string, string> = {
    '主角': 'bg-blue-100 text-blue-700',
    '女主角': 'bg-pink-100 text-pink-700',
    '重要配角': 'bg-purple-100 text-purple-700',
    '次要配角': 'bg-gray-100 text-gray-700',
    '反派': 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
            {character.name[0]}
          </div>
          <div>
            <div className="font-medium">{character.name}</div>
            <div className={`text-xs px-2 py-0.5 rounded ${roleColors[character.role] || 'bg-gray-100 text-gray-700'}`}>
              {character.role}
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
            title="编辑"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-600 mt-2">
        <div>年龄: {character.age}岁</div>
        {character.abilities?.cultivation_level && (
          <div>境界: {character.abilities.cultivation_level}</div>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-2">
        {character.personality.slice(0, 3).join(' · ')}
      </div>
    </div>
  )
}

// 伏笔状态Tab
function ForeshadowingTab({
  foreshadowings,
  foreshadowingState,
  completedChapters,
  novelId: _novelId,
  onEditForeshadowing,
  onDeleteForeshadowing,
}: {
  foreshadowings: ForeshadowingPlan[]
  foreshadowingState: ForeshadowingState | null
  completedChapters: number
  novelId: string
  onEditForeshadowing: (item: ForeshadowingItem) => void
  onDeleteForeshadowing: (item: ForeshadowingItem) => void
}) {
  // 分类统计
  const planted = foreshadowings.filter(f => f.status === 'planted')
  const pending = foreshadowings.filter(f => f.status === 'pending')
  const recycled = foreshadowings.filter(f => f.status === 'recycled')

  // 待回收的伏笔（已到达回收章节）
  const dueForRecycle = planted.filter(f => f.recycle_chapter <= completedChapters)

  // 合并伏笔状态数据（优先使用 state 数据）
  const displayItems: ForeshadowingItem[] = foreshadowingState?.foreshadowings || foreshadowings.map(f => ({
    id: f.id,
    hint: f.hint,
    planted_chapter: null,
    planned_recycle_chapter: f.recycle_chapter,
    recycle_chapter: null,
    status: f.status,
    significance: 'medium' as const,
    resolution_hint: undefined,
  }))

  return (
    <div className="space-y-6">
      {/* 统计概览 */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="总伏笔" value={foreshadowings.length} color="gray" />
        <StatCard label="已埋下" value={planted.length} color="blue" />
        <StatCard label="已回收" value={recycled.length} color="green" />
        <StatCard label="待埋/待回收" value={pending.length + dueForRecycle.length} color="yellow" />
      </div>

      {/* 待回收提醒 */}
      {dueForRecycle.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-medium text-yellow-700 mb-2">
            需要注意：以下伏笔已到达回收章节
          </h3>
          <div className="space-y-2">
            {dueForRecycle.map((fs) => (
              <div key={fs.id} className="bg-white p-3 rounded text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">ID: {fs.id}</span>
                    <span className="ml-2 text-gray-600">{fs.hint}</span>
                  </div>
                  <span className="text-yellow-600">
                    第{fs.recycle_chapter}章回收
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 伏笔列表 */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="font-semibold mb-4">伏笔清单</h2>

        {displayItems.length > 0 ? (
          <div className="space-y-3">
            {displayItems.map((fs) => {
              const statusColor =
                fs.status === 'recycled' ? 'bg-green-100 text-green-700' :
                fs.status === 'planted' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'

              const isDue = fs.status === 'planted' && fs.planned_recycle_chapter <= completedChapters

              return (
                <div key={fs.id} className={`p-4 rounded-lg border ${
                  isDue ? 'bg-yellow-50 border-yellow-200' : 'bg-gray-50 border-gray-200'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm text-gray-500">{fs.id}</span>
                      <span className={`px-2 py-0.5 rounded text-xs ${statusColor}`}>
                        {fs.status === 'recycled' ? '已回收' :
                         fs.status === 'planted' ? '已埋下' : '待埋'}
                      </span>
                      {fs.significance === 'high' && (
                        <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">重要</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-sm text-gray-500">
                        回收章节: 第{fs.planned_recycle_chapter}章
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onEditForeshadowing(fs)}
                          className="p-1.5 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                          title="编辑"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {fs.status !== 'recycled' && (
                          <button
                            onClick={() => onDeleteForeshadowing(fs)}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="标记已回收"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-700">
                    {fs.hint}
                  </div>

                  {fs.resolution_hint && (
                    <div className="mt-2 text-sm text-gray-500">
                      解答提示: {fs.resolution_hint}
                    </div>
                  )}

                  {isDue && (
                    <div className="mt-2 text-sm text-yellow-600">
                      当前已写到第{completedChapters}章，此伏笔需要回收
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-8">
            暂无伏笔规划
          </div>
        )}
      </div>
    </div>
  )
}

// 统计卡片
function StatCard({
  label,
  value,
  color,
}: {
  label: string
  value: number
  color: 'gray' | 'blue' | 'green' | 'yellow'
}) {
  const colors = {
    gray: 'bg-gray-100',
    blue: 'bg-blue-100',
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
  }

  return (
    <div className={`${colors[color]} rounded-lg p-4 text-center`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm text-gray-600">{label}</div>
    </div>
  )
}

// ==================== 弹窗组件 ====================

// 人物编辑弹窗
function CharacterModal({
  novelId,
  mode,
  character,
  onClose,
  onSuccess,
}: {
  novelId: string
  mode: 'add' | 'edit'
  character?: Character
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<Partial<Character>>({
    name: character?.name || '',
    role: character?.role || '重要配角',
    age: character?.age || 18,
    gender: character?.gender || '男',
    appearance: character?.appearance || '',
    personality: character?.personality || [],
    background: character?.background || '',
    goals: character?.goals || [],
    abilities: character?.abilities || { skills: [] },
  })
  const [personalityInput, setPersonalityInput] = useState('')
  const [goalsInput, setGoalsInput] = useState('')
  const [skillsInput, setSkillsInput] = useState('')
  const [loading, setLoading] = useState(false)

  // 初始化多值字段
  useEffect(() => {
    if (character) {
      setPersonalityInput(character.personality?.join(', ') || '')
      setGoalsInput(character.goals?.join(', ') || '')
      setSkillsInput(character.abilities?.skills?.join(', ') || '')
    }
  }, [character])

  async function handleSubmit() {
    if (!formData.name) {
      alert('请填写人物姓名')
      return
    }

    try {
      setLoading(true)
      const data = {
        ...formData,
        personality: personalityInput.split(',').map(s => s.trim()).filter(Boolean),
        goals: goalsInput.split(',').map(s => s.trim()).filter(Boolean),
        abilities: {
          ...formData.abilities,
          skills: skillsInput.split(',').map(s => s.trim()).filter(Boolean),
        },
      }

      if (mode === 'add') {
        await addCharacter(novelId, data)
      } else if (character?.character_id) {
        await updateCharacter(novelId, character.character_id, data)
      }

      onSuccess()
    } catch (err) {
      console.error('Failed to save character:', err)
      alert('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="dialog-paper bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题 */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">
            {mode === 'add' ? '添加人物' : '编辑人物'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4">
          {/* 姓名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="人物姓名"
            />
          </div>

          {/* 角色类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">角色类型</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as Character['role'] })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="主角">主角</option>
              <option value="女主角">女主角</option>
              <option value="重要配角">重要配角</option>
              <option value="次要配角">次要配角</option>
              <option value="反派">反派</option>
            </select>
          </div>

          {/* 年龄和性别 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          {/* 外貌描述 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">外貌描述</label>
            <textarea
              value={formData.appearance}
              onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="人物外貌特征"
            />
          </div>

          {/* 性格特点 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性格特点（逗号分隔）</label>
            <input
              type="text"
              value={personalityInput}
              onChange={(e) => setPersonalityInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="坚韧, 冷静, 重情义"
            />
          </div>

          {/* 背景 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">背景故事</label>
            <textarea
              value={formData.background}
              onChange={(e) => setFormData({ ...formData, background: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="人物背景经历"
            />
          </div>

          {/* 技能 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">技能（逗号分隔）</label>
            <input
              type="text"
              value={skillsInput}
              onChange={(e) => setSkillsInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="剑法, 轻功"
            />
          </div>

          {/* 目标 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">目标（逗号分隔）</label>
            <input
              type="text"
              value={goalsInput}
              onChange={(e) => setGoalsInput(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="复仇, 成为强者"
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
          >
            {loading ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  )
}

// 伏笔编辑弹窗
function ForeshadowingModal({
  novelId,
  item,
  onClose,
  onSuccess,
}: {
  novelId: string
  item: ForeshadowingItem
  onClose: () => void
  onSuccess: () => void
}) {
  const [formData, setFormData] = useState<Partial<ForeshadowingItem>>({
    id: item.id,
    hint: item.hint,
    planned_recycle_chapter: item.planned_recycle_chapter,
    status: item.status,
    significance: item.significance,
    resolution_hint: item.resolution_hint || '',
  })
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!formData.hint) {
      alert('请填写伏笔提示内容')
      return
    }

    try {
      setLoading(true)
      await updateForeshadowingState(novelId, item.id, formData)
      onSuccess()
    } catch (err) {
      console.error('Failed to update foreshadowing:', err)
      alert('保存失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkPlanted() {
    try {
      setLoading(true)
      await updateForeshadowingState(novelId, item.id, { status: 'planted' })
      onSuccess()
    } catch (err) {
      console.error('Failed to mark as planted:', err)
      alert('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkRecycled() {
    try {
      setLoading(true)
      await updateForeshadowingState(novelId, item.id, { status: 'recycled' })
      onSuccess()
    } catch (err) {
      console.error('Failed to mark as recycled:', err)
      alert('操作失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="dialog-paper bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* 标题 */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-lg">编辑伏笔</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-4">
          {/* ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">伏笔ID</label>
            <input
              type="text"
              value={formData.id}
              disabled
              className="w-full px-3 py-2 border rounded-md bg-gray-50 text-gray-500"
            />
          </div>

          {/* 提示内容 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">提示内容</label>
            <textarea
              value={formData.hint}
              onChange={(e) => setFormData({ ...formData, hint: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
              placeholder="伏笔的具体提示"
            />
          </div>

          {/* 回收章节 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">计划回收章节</label>
            <input
              type="number"
              value={formData.planned_recycle_chapter}
              onChange={(e) => setFormData({ ...formData, planned_recycle_chapter: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* 重要性 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">重要性</label>
            <select
              value={formData.significance}
              onChange={(e) => setFormData({ ...formData, significance: e.target.value as 'high' | 'medium' | 'low' })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>

          {/* 解答提示 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">解答提示</label>
            <textarea
              value={formData.resolution_hint}
              onChange={(e) => setFormData({ ...formData, resolution_hint: e.target.value })}
              className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={2}
              placeholder="伏笔回收时的解答方向"
            />
          </div>

          {/* 当前状态 */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">当前状态:</span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              formData.status === 'recycled' ? 'bg-green-100 text-green-700' :
              formData.status === 'planted' ? 'bg-blue-100 text-blue-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {formData.status === 'recycled' ? '已回收' :
               formData.status === 'planted' ? '已埋下' : '待埋'}
            </span>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 border-t flex items-center justify-between gap-3">
          {/* 状态切换按钮 */}
          <div className="flex items-center gap-2">
            {formData.status === 'pending' && (
              <button
                onClick={handleMarkPlanted}
                disabled={loading}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
              >
                标记已埋
              </button>
            )}
            {formData.status === 'planted' && (
              <button
                onClick={handleMarkRecycled}
                disabled={loading}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors disabled:opacity-50"
              >
                标记已回收
              </button>
            )}
          </div>

          {/* 保存/取消 */}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:opacity-50"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// 删除确认弹窗
function DeleteConfirmModal({
  type,
  name,
  onCancel,
  onConfirm,
}: {
  type: 'character' | 'foreshadowing'
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const title = type === 'character' ? '删除人物' : '标记伏笔已回收'
  const message = type === 'character'
    ? `确定要删除人物「${name}」吗？此操作不可恢复。`
    : `确定要将伏笔「${name.substring(0, 30)}...」标记为已回收吗？`
  const confirmText = type === 'character' ? '删除' : '标记已回收'
  const confirmClass = type === 'character' ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'

  return (
    <div className="dialog-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="dialog-paper bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* 标题 */}
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-lg">{title}</h3>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4">
          <p className="text-gray-600">{message}</p>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-white rounded-md transition-colors ${confirmClass}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}