import { cn } from '@/lib/utils'

export interface GeneralTab {
  key: string
  label: string
}

export default function SegmentedTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: GeneralTab[]
  active: string
  onChange: (key: string) => void
}) {
  return (
    <div className="inline-flex items-center gap-1 p-1 glass rounded-xl">
      {tabs.map((t) => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
            active === t.key
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}