import { Modal } from '@/components/ui/Modal'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { CheckCircle2, Clock, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface Reminder {
  id: string
  account_key: string
  subject: string
  due_at: string
  is_completed: boolean
}

export function ReminderListModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const { data: reminders, isLoading } = useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/reminders')
      if (!res.ok) return []
      return res.json()
    },
    enabled: isOpen
  })

  const handleComplete = async (id: string) => {
    await fetchApi(`/api/v1/reminders/${id}/complete`, { method: 'PUT' })
    queryClient.invalidateQueries({ queryKey: ['reminders'] })
  }

  const now = new Date()

  return (
    <Modal open={isOpen} onClose={onClose} title="All Reminders" className="max-w-2xl">
      <div className="p-1 space-y-3 mt-4 max-h-[60vh] overflow-y-auto pr-2">
        {isLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : reminders && reminders.length > 0 ? (
          reminders.map(r => {
            const isExpired = new Date(r.due_at) <= now && !r.is_completed
            return (
              <div key={r.id} className={`p-4 rounded-xl border flex items-center justify-between ${
                r.is_completed ? 'bg-slate-900/50 border-white/5 opacity-70' : 
                isExpired ? 'bg-red-500/10 border-red-500/20' : 
                'bg-indigo-500/10 border-indigo-500/20'
              }`}>
                <div>
                  <h4 className={`text-sm font-medium ${r.is_completed ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                    {r.subject}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    {r.is_completed ? <CheckCircle2 size={12} className="text-emerald-500"/> : <Clock size={12} />}
                    {new Date(r.due_at).toLocaleString()}
                    <span className="text-slate-600 mx-1">•</span>
                    <span className="uppercase">{r.account_key}</span>
                  </p>
                </div>
                {!r.is_completed && (
                  <Button size="sm" variant="outline" onClick={() => handleComplete(r.id)} className="h-8 text-xs">
                    <Check size={14} className="mr-1.5"/> Complete
                  </Button>
                )}
              </div>
            )
          })
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">No reminders found.</p>
        )}
      </div>
    </Modal>
  )
}
