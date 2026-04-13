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
import { novelApi, getOutline } from '@services/api'
import type { Novel, Character, Outline, ForeshadowingPlan } from '@/types/novel'

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

    } catch (err) {
      console.error('Failed to load novel:', err)
    } finally {
      setLoading(false)
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
                  {meta.genre} | {meta.word_count.toLocaleString()}字
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
                章节: {meta.completed_chapters}/{meta.target_chapters}
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
          />
        )}

        {/* 伏笔状态Tab */}
        {activeTab === 'foreshadowing' && (
          <ForeshadowingTab
            foreshadowings={foreshadowingPlan}
            completedChapters={meta.completed_chapters}
          />
        )}
      </main>
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
            subtitle={novel.characters ? `${novel.characters.characters.length}人` : undefined}
            onClick={() => onNavigate(`/novels/${novelId}/world-setting`)}
          />

          {/* 大纲 */}
          <ProgressCard
            title="大纲"
            status={novel.outline ? 'completed' : 'pending'}
            subtitle={novel.outline ? `${novel.outline.volumes.length}卷` : undefined}
            onClick={() => onNavigate(`/novels/${novelId}/outline`)}
          />

          {/* 章节 */}
          <ProgressCard
            title="章节"
            status={meta.completed_chapters > 0 ? 'in_progress' : 'pending'}
            subtitle={`${meta.completed_chapters}/${meta.target_chapters}`}
            progress={meta.completed_chapters / meta.target_chapters}
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
            <span>{meta.genre}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">主题</span>
            <span>{meta.theme.join(', ')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">创建时间</span>
            <span>{new Date(meta.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">更新时间</span>
            <span>{new Date(meta.updated_at).toLocaleDateString()}</span>
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
}: {
  characters: Character[]
  relationships: Array<{ from: string; to: string; type: string; strength: number }>
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
        <h2 className="font-semibold mb-4">人物列表</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {characters.map((char) => (
            <CharacterCard key={char.character_id} character={char} />
          ))}
        </div>
      </div>
    </div>
  )
}

// 人物卡片
function CharacterCard({ character }: { character: Character }) {
  const roleColors: Record<string, string> = {
    '主角': 'bg-blue-100 text-blue-700',
    '女主角': 'bg-pink-100 text-pink-700',
    '重要配角': 'bg-purple-100 text-purple-700',
    '次要配角': 'bg-gray-100 text-gray-700',
    '反派': 'bg-red-100 text-red-700',
  }

  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-3 mb-2">
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
  completedChapters,
}: {
  foreshadowings: ForeshadowingPlan[]
  completedChapters: number
}) {
  // 分类统计
  const planted = foreshadowings.filter(f => f.status === 'planted')
  const pending = foreshadowings.filter(f => f.status === 'pending')
  const recycled = foreshadowings.filter(f => f.status === 'recycled')

  // 待回收的伏笔（已到达回收章节）
  const dueForRecycle = planted.filter(f => f.recycle_chapter <= completedChapters)

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
            ⚠️ 需要注意：以下伏笔已到达回收章节
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

        {foreshadowings.length > 0 ? (
          <div className="space-y-3">
            {foreshadowings.map((fs) => {
              const statusColor =
                fs.status === 'recycled' ? 'bg-green-100 text-green-700' :
                fs.status === 'planted' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'

              const isDue = fs.status === 'planted' && fs.recycle_chapter <= completedChapters

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
                    </div>
                    <div className="text-sm text-gray-500">
                      回收章节: 第{fs.recycle_chapter}章
                    </div>
                  </div>

                  <div className="text-gray-700">
                    {fs.hint}
                  </div>

                  {isDue && (
                    <div className="mt-2 text-sm text-yellow-600">
                      ⚠️ 当前已写到第{completedChapters}章，此伏笔需要回收
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