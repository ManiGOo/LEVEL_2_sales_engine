import type { QuotationModule, QuotationModuleItem } from '@/types/api'
import { Button } from './button'
import { Plus, Trash2, GripVertical } from 'lucide-react'

interface ModuleEditorProps {
  modules: QuotationModule[]
  onChange: (modules: QuotationModule[]) => void
  disabled?: boolean
}

const ICONS = ['document', 'alert', 'clipboard', 'truck', 'settings', 'shield', 'database', 'flask', 'box', 'cpu']

export function ModuleEditor({ modules, onChange, disabled }: ModuleEditorProps) {
  function addModule() {
    onChange([...modules, { title: 'New Module', icon: 'document', category: '', items: [{ title: 'Feature 1', description: '' }] }])
  }

  function removeModule(index: number) {
    const next = [...modules]
    next.splice(index, 1)
    onChange(next)
  }

  function updateModule(index: number, update: Partial<QuotationModule>) {
    const next = [...modules]
    next[index] = { ...next[index], ...update }
    onChange(next)
  }

  function addItem(mIndex: number) {
    const m = modules[mIndex]
    updateModule(mIndex, { items: [...m.items, { title: 'New feature', description: '' }] })
  }

  function removeItem(mIndex: number, iIndex: number) {
    const m = modules[mIndex]
    const items = [...m.items]
    items.splice(iIndex, 1)
    updateModule(mIndex, { items })
  }

  function updateItem(mIndex: number, iIndex: number, patch: Partial<QuotationModuleItem>) {
    const m = modules[mIndex]
    const items = [...m.items]
    items[iIndex] = { ...items[iIndex], ...patch }
    updateModule(mIndex, { items })
  }

  return (
    <div className="space-y-4">
      {modules.map((m, mIndex) => (
        <div key={mIndex} className="p-4 rounded-xl border border-slate-700/60 bg-slate-900/50 space-y-4 relative group">
          {!disabled && (
            <button
              onClick={() => removeModule(mIndex)}
              className="absolute top-4 right-4 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Module Title</label>
              <input
                disabled={disabled}
                value={m.title}
                onChange={(e) => updateModule(mIndex, { title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Category Badge</label>
              <input
                disabled={disabled}
                value={m.category || ''}
                onChange={(e) => updateModule(mIndex, { category: e.target.value })}
                placeholder="e.g. CORE, ASSETS"
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Icon</label>
              <select
                disabled={disabled}
                value={m.icon}
                onChange={(e) => updateModule(mIndex, { icon: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
              >
                {ICONS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-2">Features</label>
            <div className="space-y-3">
              {m.items.map((item: QuotationModuleItem, iIndex: number) => (
                <div key={iIndex} className="rounded-lg border border-slate-700/60 p-3 bg-slate-800/40 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500"><GripVertical className="w-4 h-4" /></span>
                    <input
                      disabled={disabled}
                      value={item.title}
                      onChange={(e) => updateItem(mIndex, iIndex, { title: e.target.value })}
                      placeholder="Feature title… add ✨ AI for badge"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                    />
                    {!disabled && (
                      <button
                        onClick={() => removeItem(mIndex, iIndex)}
                        className="text-slate-500 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <textarea
                    disabled={disabled}
                    value={item.description || ''}
                    onChange={(e) => updateItem(mIndex, iIndex, { description: e.target.value })}
                    placeholder="Optional feature description…"
                    rows={2}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 resize-none"
                  />
                </div>
              ))}
            </div>
            {!disabled && (
              <Button variant="ghost" size="sm" onClick={() => addItem(mIndex)} className="mt-2 text-indigo-400">
                <Plus className="w-3 h-3 mr-1" /> Add feature
              </Button>
            )}
          </div>
        </div>
      ))}

      {!disabled && (
        <Button variant="secondary" onClick={addModule} className="w-full border-dashed border-slate-700 border-2">
          <Plus className="w-4 h-4 mr-2" /> Add Module
        </Button>
      )}
    </div>
  )
}
