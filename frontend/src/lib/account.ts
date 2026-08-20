import type { AccountStageStatus } from '@/types/api'

export const ACCOUNT_STAGE_STATUSES: AccountStageStatus[] = ['planned', 'active', 'completed', 'blocked']

export const STAGE_STATUS_META: Record<
  AccountStageStatus,
  { label: string; badge: 'neutral' | 'success' | 'info' | 'danger'; dot: string; ring: string }
> = {
  planned: { label: 'Planned', badge: 'neutral', dot: 'bg-slate-400', ring: 'ring-slate-500/30' },
  active: { label: 'Active', badge: 'success', dot: 'bg-emerald-400', ring: 'ring-emerald-500/30' },
  completed: { label: 'Completed', badge: 'info', dot: 'bg-sky-400', ring: 'ring-sky-500/30' },
  blocked: { label: 'Blocked', badge: 'danger', dot: 'bg-red-400', ring: 'ring-red-500/30' },
}

export function stageStatusMeta(status: string) {
  return STAGE_STATUS_META[(status as AccountStageStatus)] ?? STAGE_STATUS_META.planned
}
