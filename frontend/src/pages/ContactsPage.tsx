import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Users, Search, Loader2, Building2, ExternalLink, User } from 'lucide-react'
import { useApi } from '@/hooks/useApi'
import { motion } from 'motion/react'
import Pagination from '@/components/ui/Pagination'
import type { ContactsPageResponse } from '@/types/api'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 30

export default function ContactsPage() {
  const { fetchApi } = useApi()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<ContactsPageResponse>({
    queryKey: ['contacts', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({ page: String(page), page_size: String(PAGE_SIZE) })
      if (search) params.set('q', search)
      const res = await fetchApi(`/api/v1/contacts?${params.toString()}`)
      return (await res.json()) as ContactsPageResponse
    },
  })

  const pages = data ? Math.ceil(data.total_count / PAGE_SIZE) : 0
  const start = data ? (page - 1) * PAGE_SIZE + 1 : 0
  const shown = data ? data.items.length : 0

  function go(dir: number) {
    setPage((p) => Math.max(1, Math.min(p + dir, pages)))
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Users className="text-indigo-400" />
            Decision Makers
          </h1>
          <p className="text-slate-400 mt-1">Verified contacts fetched from registries and web search</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, title, or company..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="w-full bg-slate-800/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="text-xs uppercase tracking-wider text-slate-400 border-b border-white/5 bg-white/5">
              <tr>
                <th className="px-6 py-4 font-semibold">Contact Name</th>
                <th className="px-6 py-4 font-semibold">Title</th>
                <th className="px-6 py-4 font-semibold">Company</th>
                <th className="px-6 py-4 font-semibold">Source</th>
                <th className="px-6 py-4 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading && !data ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    <Loader2 size={24} className="animate-spin mx-auto text-indigo-400 mb-2" />
                    Loading contacts...
                  </td>
                </tr>
              ) : data?.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No contacts found.
                  </td>
                </tr>
              ) : (
                data?.items.map((contact, i) => (
                  <motion.tr 
                    key={`${contact.company_key}-${contact.name}-${i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.3) }}
                    className="hover:bg-white/5 transition-colors group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                          <User size={16} />
                        </div>
                        <span className="font-medium text-slate-200">{contact.name || 'Unknown'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{contact.title || '—'}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Building2 size={14} className="text-slate-500" />
                        <span className="truncate max-w-[200px]">{contact.company_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "text-[11px] px-2.5 py-1 rounded-full font-medium tracking-wide uppercase",
                        contact.source === 'corporate_registry' ? "bg-emerald-500/10 text-emerald-400" :
                        contact.source === 'web_search' ? "bg-blue-500/10 text-blue-400" :
                        "bg-slate-500/10 text-slate-400"
                      )}>
                        {contact.source.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/companies/${contact.company_key}`}
                        className="inline-flex items-center gap-1.5 text-[13px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                      >
                        View Company
                        <ExternalLink size={14} />
                      </Link>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {data && data.total_count > 0 && (
          <div className="px-6 py-4 border-t border-white/5 bg-black/20">
            <Pagination
              page={page}
              pages={pages}
              start={start}
              shown={shown}
              total={data.total_count}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
