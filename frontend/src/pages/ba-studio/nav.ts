/**
 * BA Studio — khai báo view + API điều hướng dùng chung giữa shell và các view.
 * View được đồng bộ vào URL query (?view=&doc=&cr=&tab=&a=&b=&pillar=) để share link được.
 */
import type { PillarId } from '../../data/ba-ai-adoption'
import type { MergeState } from '../../lib/ba-studio/types'

export type ViewKey =
  'console' | 'docs' | 'doc' | 'crs' | 'cr' | 'compare' | 'compare-doc' | 'ai' | 'pillar'
export type DocTab = 'content' | 'versions' | 'crs'
export type CrFilter = MergeState | 'all'

export interface BaStudioNav {
  goConsole: () => void
  goDocs: () => void
  goDoc: (docId: string, tab?: DocTab) => void
  goCrs: (filter?: CrFilter) => void
  goCr: (crId: string) => void
  /** so sánh 2 phiên bản của CÙNG một tài liệu */
  goCompare: (docId?: string, a?: string, b?: string) => void
  /** so sánh 2 tài liệu khác nhau (kiểu text-compare) */
  goCompareDoc: (leftDocId?: string, rightDocId?: string) => void
  goAi: (pillar?: PillarId) => void
}
