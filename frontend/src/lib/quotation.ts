import type { Quotation, QuotationLineItem, QuotationStatus } from '@/types/api'

export const QUOTATION_STATUS_META: Record<
  QuotationStatus,
  { label: string; tone: 'slate' | 'blue' | 'emerald' | 'rose' | 'amber' }
> = {
  draft: { label: 'Draft', tone: 'slate' },
  sent: { label: 'Sent', tone: 'blue' },
  accepted: { label: 'Accepted', tone: 'emerald' },
  rejected: { label: 'Rejected', tone: 'rose' },
  expired: { label: 'Expired', tone: 'amber' },
}

export const QUOTATION_STATUS_VARIANT: Record<QuotationStatus, 'neutral' | 'info' | 'success' | 'danger' | 'warning'> = {
  draft: 'neutral',
  sent: 'info',
  accepted: 'success',
  rejected: 'danger',
  expired: 'warning',
}

export function formatMoney(amount: number, currency = 'USD'): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount || 0)
  } catch {
    return `${currency} ${(amount || 0).toFixed(2)}`
  }
}

export function emptyLineItem() {
  return {
    category: '',
    description: '',
    qty: 1,
    unit: '',
    unit_price: 0,
    type: 'one_time' as const,
    discount_pct: 0,
    tax_pct: 0,
  }
}

export function emptySubscriptionItem() {
  return {
    category: 'Subscription',
    description: '',
    qty: 1,
    unit: 'year',
    unit_price: 0,
    type: 'recurring' as const,
    discount_pct: 0,
    tax_pct: 0,
  }
}

export interface QuoteTotals {
  subtotal: number
  discount_total: number
  tax_amount: number
  total: number
}

export function computeTotals(
  items: Array<Pick<QuotationLineItem, 'qty' | 'unit_price' | 'discount_pct' | 'tax_pct'>>
): QuoteTotals {
  let subtotal = 0
  let discount_total = 0
  let tax_amount = 0
  for (const it of items) {
    const gross = (it.qty || 0) * (it.unit_price || 0)
    const disc = gross * (it.discount_pct || 0) / 100
    const net = gross - disc
    const tax = net * (it.tax_pct || 0) / 100
    subtotal += gross
    discount_total += disc
    tax_amount += tax
  }
  const net = subtotal - discount_total
  return {
    subtotal: round2(subtotal),
    discount_total: round2(discount_total),
    tax_amount: round2(tax_amount),
    total: round2(net + tax_amount),
  }
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function lineTotal(it: Pick<QuotationLineItem, 'qty' | 'unit_price' | 'discount_pct' | 'tax_pct'>): number {
  const gross = (it.qty || 0) * (it.unit_price || 0)
  const net = gross - gross * (it.discount_pct || 0) / 100
  const tax = net * (it.tax_pct || 0) / 100
  return round2(net + tax)
}

export function canEditQuotation(q: Quotation | null, userId: string | undefined, role?: string): boolean {
  if (!q) return false
  if (role === 'admin') return true
  return q.owner_id === userId || q.owner_id == null
}
