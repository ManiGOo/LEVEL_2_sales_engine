import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, User } from 'lucide-react'
import { motion } from 'motion/react'
import type { ContactsPageResponse, Contact } from '@/types/api'
import { cn } from '@/lib/utils'
import { TextContentSkeleton } from '@/components/ui/ResourceLoader'
import ContactDetailModal from '@/components/company/ContactDetailModal'

export default function CompanyContactsPanel({ companyKey }: { companyKey: string }) {
  const { fetchApi } = useApi()
  const [selected, setSelected] = useState<Contact | null>(null)

  const { data, isLoading } = useQuery<ContactsPageResponse>({
    queryKey: ['contacts', companyKey],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/contacts?company_key=${companyKey}&page=1&page_size=50`)
      return (await res.json()) as ContactsPageResponse
    },
    enabled: !!companyKey,
  })

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users size={16} className="text-indigo-400" />
            Decision Makers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TextContentSkeleton lines={3} className="h-32" />
        </CardContent>
      </Card>
    )
  }

  const contacts = data?.items || []

  if (contacts.length === 0) {
    return null
  }

  const panel = (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users size={16} className="text-indigo-400" />
          Decision Makers ({contacts.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contacts.map((contact, i) => (
            <motion.div
              key={`${contact.company_key}-${contact.name}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.3) }}
              onClick={() => setSelected(contact)}
              className="cursor-pointer rounded-xl border border-white/5 bg-slate-900/40 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                    <User size={18} />
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-200">{contact.name || 'Unknown'}</h4>
                    <p className="text-sm text-slate-400">{contact.title || '—'}</p>
                    
                    {(contact.email || contact.linkedin_url) && (
                      <div className="mt-2 space-y-1">
                        {contact.email && (
                          <a href={`mailto:${contact.email}`} className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors block truncate">
                            {contact.email}
                          </a>
                        )}
                        {contact.linkedin_url && (
                          <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 transition-colors block truncate">
                            LinkedIn Profile
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercase whitespace-nowrap shrink-0",
                  contact.source === 'corporate_registry' ? "bg-emerald-500/10 text-emerald-400" :
                  contact.source === 'web_search' ? "bg-blue-500/10 text-blue-400" :
                  "bg-slate-500/10 text-slate-400"
                )}>
                  {contact.source.replace('_', ' ')}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </CardContent>
    </Card>
  )

  return (
    <>
      {panel}
      <ContactDetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        contact={selected}
        companyKey={companyKey}
      />
    </>
  )
}
