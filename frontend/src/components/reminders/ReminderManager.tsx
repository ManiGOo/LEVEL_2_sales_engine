import { useEffect, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { showToast } from '@/components/ui/toast'
import type { Reminder } from './ReminderListModal'

export function ReminderManager() {
  const { fetchApi } = useApi()
  const [triggeredReminders, setTriggeredReminders] = useState<Set<string>>(new Set())
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  
  const { data: reminders } = useQuery<Reminder[]>({
    queryKey: ['reminders'],
    queryFn: async () => {
      const res = await fetchApi('/api/v1/reminders')
      if (!res.ok) return []
      return res.json()
    },
    refetchInterval: 60000 // Refetch every minute
  })

  useEffect(() => {
    if (!reminders) return

    const checkReminders = () => {
      const now = new Date()
      reminders.forEach(reminder => {
        if (reminder.is_completed) return
        if (triggeredReminders.has(reminder.id)) return

        const dueAt = new Date(reminder.due_at)
        if (dueAt <= now) {
          showToast({ 
            title: 'Reminder', 
            description: reminder.subject,
            variant: 'info',
            duration: 10000 
          })
          setTriggeredReminders(prev => {
            const next = new Set(prev)
            next.add(reminder.id)
            return next
          })
        }
      })
    }

    checkReminders() // Run immediately

    intervalRef.current = setInterval(checkReminders, 10000) // Check every 10 seconds

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [reminders, triggeredReminders])

  return null // Render nothing, purely background logic
}
