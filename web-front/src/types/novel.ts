/**
 * 小说相关类型定义
 */

// 小说元信息
export interface NovelMeta {
  novel_id: string
  title: string
  genre: string
  theme: string[]
  target_chapters: number
  status: 'planning' | 'world_building' | 'outline' | 'writing' | 'validation' | 'completed'
  created_at: string
  updated_at: string
  current_phase: string
  completed_chapters: number
  word_count: number
}

// 小说完整信息（包含世界观、人物、大纲、章节）
export interface Novel {
  meta: NovelMeta
  world_setting?: WorldSetting
  characters?: CharactersLibrary
  outline?: Outline
  chapters?: Chapter[]
}

// 世界观设定
export interface WorldSetting {
  novel_id: string
  version: number
  background: {
    era: string
    era_name: string
    geography: {
      world_name: string
      regions: Array<{ name: string; description: string }>
    }
    society: {
      power_structure: string
      social_classes: string[]
      key_institutions: string[]
    }
  }
  power_system: {
    name: string
    levels: Array<{ name: string; rank: number; description: string }>
    key_rules: string[]
  } | null
  core_conflict: {
    main_conflict: {
      type: string
      description: string
      antagonist: string
    }
    sub_conflicts: Array<{ type: string; description: string }>
  }
  special_elements: Array<{ name: string; type: string; description: string }>
}

// 人物信息
export interface Character {
  character_id: string
  name: string
  role: '主角' | '女主角' | '重要配角' | '次要配角' | '反派'
  age: number
  gender: string
  appearance: string
  personality: string[]
  background: string
  abilities: {
    cultivation_level?: string
    skills: string[]
    special_ability?: string
  }
  goals: string[]
  relationships?: Array<{
    target_id: string
    type: string
    status: string
  }>
}

export interface CharactersLibrary {
  novel_id: string
  version: number
  characters: Character[]
  relationship_graph?: {
    edges: Array<{
      from: string
      to: string
      type: string
      strength: number
    }>
  }
}

// 章节大纲
export interface ChapterOutline {
  chapter_num: number
  title: string
  volume_id: string
  key_events: string[]
  turning_points?: Array<{
    event: string
    type: string
    impact: string
  }>
  character_growth?: Array<{
    character_id: string
    change: string
  }>
  foreshadowing?: Array<{
    id: string
    hint: string
    recycle_chapter: number
  }>
}

export interface Outline {
  novel_id: string
  version: number
  volumes: Array<{
    volume_id: string
    name: string
    chapters_range: { start: number; end: number }
    theme: string
    arc_summary: string
  }>
  chapters: ChapterOutline[]
  foreshadowing_plan?: ForeshadowingPlan[]
}

// 伏笔计划
export interface ForeshadowingPlan {
  id: string
  hint: string
  recycle_chapter: number
  status: 'pending' | 'planted' | 'recycled'
}

// 章节内容
export interface Chapter {
  novel_id: string
  chapter_num: number
  title: string
  version: number
  created_at: string
  content: string
  word_count: number
  summary?: {
    key_events: string[]
    emotional_tone: string
  }
  validation_status?: {
    last_validated: string
    issues_found: number
    issues_fixed: number
  }
}

// 校验问题
export interface ValidationIssue {
  issue_id: string
  rule_id: string
  severity: 'high' | 'medium' | 'low'
  confidence: number
  description: string
  location?: {
    start_line?: number
    end_line?: number
  }
  suggestion: string
  auto_fix_available: boolean
  auto_fix_text?: string
  status: 'pending' | 'auto_fixed' | 'user_fixed' | 'ignored'
}

export interface ValidationReport {
  novel_id: string
  chapter_num?: number
  validated_at: string
  validation_type: 'single_chapter' | 'full_novel'
  issues: ValidationIssue[]
  statistics: {
    total_issues: number
    high_severity: number
    medium_severity: number
    low_severity: number
    auto_fixed: number
    pending: number
  }
}

// SSE 流式响应事件
export interface SSEEvent {
  event: 'start' | 'chunk' | 'complete' | 'error'
  data: string
  timestamp?: string
}

// API 响应类型
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}