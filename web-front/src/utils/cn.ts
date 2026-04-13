/**
 * 类名合并工具函数
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 合并 TailwindCSS 类名
 * 使用 clsx 处理条件类名，twMerge 处理 Tailwind 冲突
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}