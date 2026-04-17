/**
 * 小说详情页面（都市言情简化版）
 * 功能：
 * - 小说基本信息展示
 * - 创作进度面板
 * - 人物管理（男主/女主/配角）
 */

import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { novelApi, addCharacter, updateCharacter, deleteCharacter } from '@services/api'
import type { Novel, Character } from '@/types/novel'
import FlowProgress from '@components/FlowProgress'

// 关系类型颜色映射
const RELATION_COLORS: Record<string, string> = {
  love: '#ef4444',      // 红色 - 爱情
  mentor: '#3b82f6',    // 蓝色 - 师徒/上下级
  friend: '#22c55e',    // 绿色 - 朋友
  enemy: '#ef4444',     // 红色 - 敌人/情敌
  family: '#f59e0b',    // 黄色 - 家人
  default: '#6b7280',   // 灰色 - 其他
}

// 关系类型标签
const RELATION_LABELS: Record<string, string> = {
  love: '恋人',
  mentor: '上下级',
  friend: '朋友',
  enemy: '情敌',
  family: '家人',
  default: '关系',
}

export default function NovelDetail() {
  const { novelId } = useParams<{ novelId: string }>()
  const navigate = useNavigate()
  const [novel, setNovel] = useState<Novel | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'characters'>('overview')

  // 弹窗状态（都市言情简化版：仅保留人物管理）
  const [characterModal, setCharacterModal] = useState<{
    open: boolean
    mode: 'add' | 'edit'
    character?: Character
  }>({ open: false, mode: 'add' })
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean
    type: 'character'
    id: string
    name: string
  }>({ open: false, type: 'character', id: '', name: '' })

  useEffect(() => {
    if (novelId) {
      loadNovelData(novelId)
    }
  }, [novelId])

  async function loadNovelData(id: string) {
    try {
      setLoading(true)

      // 加载小说详情（都市言情简化版：移除伏笔加载）
      const data = await novelApi.getNovel(id)
      setNovel(data)

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

  // 删除人物（都市言情简化版）
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

  // 都市言情简化版：移除 handleDeleteForeshadowing 函数

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
  // 都市言情简化版：移除 foreshadowingPlan

  // 获取当前阶段和章节进度
  const currentPhase = meta.current_phase || 'world_building'
  const completedChapters = meta.completed_chapters || 0
  const targetChapters = meta.target_chapters || 12

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 4 阶段进度条（短篇小说 MVP） */}
      <FlowProgress
        currentPhase={currentPhase}
        completedChapters={completedChapters}
        targetChapters={targetChapters}
      />
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

          {/* Tab导航（都市言情简化版：移除伏笔Tab） */}
          <nav className="flex gap-2 mt-4">
            {(['overview', 'characters'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'overview' ? '概览' : '人物关系'}
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

        {/* 都市言情简化版：移除伏笔Tab */}
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

      {/* 都市言情简化版：移除伏笔弹窗 */}

      {/* 删除确认弹窗（都市言情简化版：仅人物） */}
      {deleteConfirm.open && (
        <DeleteConfirmModal
          name={deleteConfirm.name}
          onCancel={() => setDeleteConfirm({ open: false, type: 'character', id: '', name: '' })}
          onConfirm={() => handleDeleteCharacter(deleteConfirm.id)}
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
        {character.abilities?.skills && character.abilities.skills.length > 0 && (
          <div>技能: {character.abilities.skills.slice(0, 3).join(' · ')}</div>
        )}
      </div>

      <div className="text-xs text-gray-400 mt-2">
        {(character.personality ?? []).slice(0, 3).join(' · ')}
      </div>
    </div>
  )
}

// 都市言情简化版：移除 ForeshadowingTab 组件和 StatCard 组件

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

// 都市言情简化版：移除 ForeshadowingModal 组件

// 删除确认弹窗（都市言情简化版：仅人物）
function DeleteConfirmModal({
  name,
  onCancel,
  onConfirm,
}: {
  name: string
  onCancel: () => void
  onConfirm: () => void
}) {
  const title = '删除人物'
  const message = `确定要删除人物「${name}」吗？此操作不可恢复。`
  const confirmText = '删除'
  const confirmClass = 'bg-red-500 hover:bg-red-600'

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