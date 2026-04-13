/**
 * 骨架屏组件 - 加载状态占位
 * 提供墨韵书香风格的加载占位效果
 */

import { cn } from '@/utils/cn'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rect' | 'circle' | 'card'
  width?: string | number
  height?: string | number
  lines?: number
  animated?: boolean
}

/**
 * 基础骨架屏
 */
export function Skeleton({
  className,
  variant = 'rect',
  width,
  height,
  animated = true,
}: SkeletonProps) {
  const variantStyles = {
    text: 'h-4 rounded-paper',
    rect: 'rounded-paper-md',
    circle: 'rounded-seal',
    card: 'rounded-paper-md shadow-ink-sm',
  }

  return (
    <div
      className={cn(
        'bg-ink-100',
        variantStyles[variant],
        animated && 'animate-pulse-gentle',
        className
      )}
      style={{
        width: width ? (typeof width === 'number' ? `${width}px` : width) : undefined,
        height: height ? (typeof height === 'number' ? `${height}px` : height) : undefined,
      }}
    />
  )
}

/**
 * 文本骨架屏（多行）
 */
export function TextSkeleton({
  lines = 3,
  className,
  animated = true,
}: {
  lines?: number
  className?: string
  animated?: boolean
}) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          width={i === lines - 1 ? '60%' : '100%'}
          animated={animated}
        />
      ))}
    </div>
  )
}

/**
 * 卡片骨架屏
 */
export function CardSkeleton({
  className,
  animated = true,
}: {
  className?: string
  animated?: boolean
}) {
  return (
    <div className={cn('paper p-6', className)}>
      <div className="flex items-center gap-4 mb-4">
        <Skeleton variant="circle" width={48} height={48} animated={animated} />
        <div className="flex-1">
          <Skeleton variant="text" width="40%" height={20} animated={animated} />
          <Skeleton variant="text" width="60%" height={16} animated={animated} className="mt-2" />
        </div>
      </div>
      <TextSkeleton lines={3} animated={animated} />
    </div>
  )
}

/**
 * 小说列表骨架屏
 */
export function NovelListSkeleton({
  count = 3,
}: {
  count?: number
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="paper-hover p-6 animate-pulse-gentle">
          <div className="flex items-center gap-3 mb-4">
            <Skeleton variant="circle" width={40} height={40} />
            <Skeleton variant="text" width="50%" height={24} />
          </div>
          <div className="flex items-center gap-2 mb-2">
            <Skeleton variant="rect" width={80} height={24} />
            <Skeleton variant="rect" width={60} height={24} />
          </div>
          <TextSkeleton lines={2} />
        </div>
      ))}
    </div>
  )
}

/**
 * 章节内容骨架屏
 */
export function ChapterContentSkeleton() {
  return (
    <div className="paper p-8 animate-pulse-gentle">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={48} height={48} />
          <Skeleton variant="text" width={120} height={28} />
        </div>
        <div className="flex gap-2">
          <Skeleton variant="rect" width={80} height={36} />
          <Skeleton variant="rect" width={60} height={36} />
        </div>
      </div>

      <div className="flex gap-8">
        <div className="w-64 paper-flat p-4">
          <Skeleton variant="text" width="40%" height={20} className="mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={40} />
            ))}
          </div>
        </div>

        <div className="flex-1">
          <TextSkeleton lines={10} />
        </div>

        <div className="w-48 paper-flat p-4">
          <Skeleton variant="text" width="40%" height={20} className="mb-4" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} variant="rect" height={60} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 世界观骨架屏
 */
export function WorldSettingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse-gentle">
      {/* 背景设定 */}
      <div className="paper p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="rect" width={40} height={32} />
          <Skeleton variant="text" width={120} height={24} />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <Skeleton variant="rect" height={80} />
          <Skeleton variant="rect" height={80} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={100} />
          ))}
        </div>
      </div>

      {/* 能力体系 */}
      <div className="paper p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="rect" width={40} height={32} />
          <Skeleton variant="text" width={160} height={24} />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={48} />
          ))}
        </div>
      </div>

      {/* 核心冲突 */}
      <div className="paper p-6">
        <div className="flex items-center gap-3 mb-4">
          <Skeleton variant="rect" width={40} height={32} />
          <Skeleton variant="text" width={100} height={24} />
        </div>
        <Skeleton variant="rect" height={120} className="bg-gold-50" />
      </div>
    </div>
  )
}

/**
 * 伏笔状态骨架屏
 */
export function ForeshadowingSkeleton() {
  return (
    <div className="animate-pulse-gentle">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rect" height={80} />
        ))}
      </div>

      <div className="paper p-6">
        <Skeleton variant="text" width={80} height={20} className="mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} variant="rect" height={100} />
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * 流式生成骨架屏
 */
export function StreamSkeleton() {
  return (
    <div className="paper p-8 animate-pulse-gentle">
      <div className="bg-indigo-50 border border-indigo-200 rounded-paper-md p-4 mb-6">
        <div className="flex items-center gap-3">
          <Skeleton variant="circle" width={12} height={12} />
          <Skeleton variant="text" width={200} height={20} />
          <Skeleton variant="rect" width="100%" height={4} className="flex-1" />
        </div>
      </div>

      <div className="min-h-[500px]">
        <TextSkeleton lines={15} />
      </div>
    </div>
  )
}

/**
 * 通用加载状态组件
 */
export function LoadingState({
  type = 'default',
  message = '加载中...',
}: {
  type?: 'default' | 'novel-list' | 'chapter' | 'world-setting' | 'foreshadowing' | 'stream'
  message?: string
}) {
  if (type === 'novel-list') {
    return <NovelListSkeleton />
  }
  if (type === 'chapter') {
    return <ChapterContentSkeleton />
  }
  if (type === 'world-setting') {
    return <WorldSettingSkeleton />
  }
  if (type === 'foreshadowing') {
    return <ForeshadowingSkeleton />
  }
  if (type === 'stream') {
    return <StreamSkeleton />
  }

  return (
    <div className="min-h-screen bg-paper-cream flex items-center justify-center">
      <div className="text-center">
        <div className="loading-spinner mx-auto mb-4" />
        <p className="text-ink-600 font-title-sm">{message}</p>
      </div>
    </div>
  )
}