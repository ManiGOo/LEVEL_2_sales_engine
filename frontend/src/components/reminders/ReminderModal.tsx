import React, { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/useApi'
import { showToast } from '@/components/ui/toast'
import { Bell } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'

export function ReminderModal({
  isOpen,
  onClose,
  accountKey,
  defaultSubject = ''
}: {
  isOpen: boolean
  onClose: () => void
  accountKey: string
  defaultSubject?: string
}) {
  const { fetchApi } = useApi()
  const [subject, setSubject] = useState(defaultSubject)
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [loading, setLoading] = useState(false)
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (isOpen) {
      setSubject(defaultSubject)
    }
  }, [isOpen, defaultSubject])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject || !date || !time) {
      showToast({ title: 'Please fill all fields', variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      // Local date string construction
      const localDateTimeString = `${date}T${time}:00`
      const dueAtDate = new Date(localDateTimeString)

      const res = await fetchApi('/api/v1/reminders', {
        method: 'POST',
        body: JSON.stringify({
          account_key: accountKey,
          subject,
          due_at: dueAtDate.toISOString(),
          is_completed: false
        })
      })

      if (!res.ok) throw new Error('Failed to create reminder')

      showToast({ title: 'Reminder created', variant: 'success' })
      queryClient.invalidateQueries({ queryKey: ['reminders'] })
      queryClient.invalidateQueries({ queryKey: ['reminders', accountKey] })
      onClose()
      setSubject('')
      setDate('')
      setTime('')
    } catch (err) {
      showToast({ title: 'Error creating reminder', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Create Reminder">
      <form onSubmit={handleSubmit} className="space-y-4 p-5">
        <div>
          <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Subject</label>
          <input
            type="text"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Follow up on pricing..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Date</label>
            <input
              type="date"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 uppercase mb-1">Time</label>
            <input
              type="time"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="pt-4 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            <Bell size={14} /> Schedule Reminder
          </Button>
        </div>
      </form>
    </Modal>
  )
}
