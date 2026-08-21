import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useApi } from '@/hooks/useApi'
import type { GeneralCompany } from '@/types/api'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { TextContentSkeleton } from '@/components/ui/ResourceLoader'
import { LeadResultContent } from '@/components/leads/LeadResultContent'
import { toLead } from '@/lib/generalCompany'
import { motion } from 'motion/react'
import { Modal } from '@/components/ui/Modal'
import { showToast, dismissToast } from '@/components/ui/toast'
import { ArrowLeft, Building2, Globe, Mail, Phone, ClipboardList, MapPin, Factory, DollarSign, Plus } from 'lucide-react'

function LinkedInIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.55V9h3.57v11.45z" />
    </svg>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/5 bg-slate-900/40 p-3">
      <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">{label}</p>
      <p className="text-sm font-bold text-white truncate" title={value}>
        {value}
      </p>
    </div>
  )
}

export default function GeneralCompanyDetailPage() {
  const { companyKey } = useParams<{ companyKey: string }>()
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()

  const [isAddingContact, setIsAddingContact] = useState(false)
  const [addName, setAddName] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addLinkedin, setAddLinkedin] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['general-company', companyKey],
    queryFn: async () => {
      const res = await fetchApi(`/api/v1/general-companies/${companyKey}`)
      return (await res.json()) as GeneralCompany
    },
    enabled: !!companyKey,
  })

  if (isLoading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <TextContentSkeleton lines={2} className="h-28" />
        <TextContentSkeleton lines={4} className="h-44" />
        <TextContentSkeleton lines={5} className="h-64" />
      </div>
    )
  }

  if (!data) return null

  const gc = data

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault()
    const toastId = showToast({ title: 'Adding contact...', variant: 'progress' })
    try {
      const res = await fetchApi(`/api/v1/contacts/${companyKey}`, {
        method: 'POST',
        body: JSON.stringify({
          company_name: gc.name,
          name: addName.trim(),
          title: addTitle.trim(),
          email: addEmail.trim() || undefined,
          linkedin_url: addLinkedin.trim() || undefined,
        })
      })
      if (!res.ok) throw new Error('Failed to add contact')
      
      dismissToast(toastId)
      showToast({ title: 'Contact added!', variant: 'success' })
      setIsAddingContact(false)
      setAddName('')
      setAddTitle('')
      setAddEmail('')
      setAddLinkedin('')
      // Invalidate general-company to refresh the contacts list if the backend returns it
      queryClient.invalidateQueries({ queryKey: ['general-company', companyKey] })
    } catch (err: any) {
      dismissToast(toastId)
      showToast({ title: 'Error adding contact', variant: 'error' })
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-5 lg:space-y-6">
      <Link
        to="/accounts"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Companies
      </Link>

      {/* Hero */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 lg:w-14 lg:h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0">
              <Building2 size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-1">
                Company Profile
              </p>
              <h1 className="text-xl lg:text-2xl font-bold text-white leading-tight break-words">
                {gc.name}
              </h1>
              <p className="text-xs lg:text-sm text-slate-400 mt-1">
                Added by {gc.created_by_name || 'a user'}
                {gc.created_at && ` on ${new Date(gc.created_at).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 mt-4">
          <Badge variant="neutral">
            {gc.company_status || 'unknown'}
          </Badge>
          {gc.industry && (
            <Badge variant="info">
              <Factory size={10} /> {gc.industry}
            </Badge>
          )}
          {gc.location && (
            <Badge variant="neutral">
              <MapPin size={10} /> {gc.location}
            </Badge>
          )}
          {gc.employees && (
            <Badge variant="neutral">
              {gc.employees} employees
            </Badge>
          )}
          {gc.revenue && (
            <Badge variant="neutral">
              <DollarSign size={10} /> {gc.revenue}
            </Badge>
          )}
        </div>

        {gc.description && (
          <p className="text-sm text-slate-300 mt-4 leading-relaxed">{gc.description}</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/5">
          {gc.website && <StatBox label="Website" value={gc.website} />}
          {gc.email && <StatBox label="Email" value={gc.email} />}
          {gc.phones_labeled && gc.phones_labeled.length > 0 ? (
            <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5 space-y-1">
              <p className="text-[10px] uppercase tracking-wide text-slate-500 font-semibold mb-1">Phones</p>
              {gc.phones_labeled.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs text-white">{p.phone}</span>
                  <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 text-[9px] font-medium uppercase tracking-wider">{p.label}</span>
                </div>
              ))}
            </div>
          ) : gc.phone && (
            <StatBox label="Phone" value={gc.phone} />
          )}
          <StatBox label="Company status" value={gc.company_status || 'unknown'} />
          {gc.employees && <StatBox label="Employees" value={gc.employees} />}
          {gc.revenue && <StatBox label="Revenue" value={gc.revenue} />}
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {gc.website && (
            <a
              href={gc.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-indigo-500/20 text-slate-300 hover:text-indigo-300 transition-colors text-sm"
            >
              <Globe size={14} /> Website
            </a>
          )}
          {gc.linkedin_url && (
            <a
              href={gc.linkedin_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 transition-colors text-sm"
            >
              <LinkedInIcon size={14} /> LinkedIn
            </a>
          )}
          {gc.email && (
            <a
              href={`mailto:${gc.email}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 transition-colors text-sm"
            >
              <Mail size={14} /> Email
            </a>
          )}
          {gc.phone && (
            <a
              href={`tel:${gc.phone}`}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300 transition-colors text-sm"
            >
              <Phone size={14} /> Call
            </a>
          )}
        </div>
      </Card>

      {/* Lead detail */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="px-5 pt-5 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold flex items-center gap-1.5">
              <ClipboardList size={12} />
              Company research
            </p>
            <button 
              onClick={() => setIsAddingContact(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-xs font-medium transition-colors"
            >
              <Plus size={14} /> Add Contact
            </button>
          </div>
          <LeadResultContent lead={toLead(gc)} />
        </CardContent>
      </Card>

      {/* Notes */}
      {gc.notes && (
        <Card className="p-4 sm:p-5">
          <CardContent className="p-0">
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold mb-2">
              Notes
            </p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{gc.notes}</p>
          </CardContent>
        </Card>
      )}

      <Modal open={isAddingContact} title="Add Contact" onClose={() => setIsAddingContact(false)}>
        <form onSubmit={handleAddContact} className="space-y-4 p-4 lg:p-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Name</label>
            <input 
              type="text" 
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Title</label>
            <input 
              type="text" 
              value={addTitle}
              onChange={(e) => setAddTitle(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
            <input 
              type="email" 
              value={addEmail}
              onChange={(e) => setAddEmail(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">LinkedIn URL</label>
            <input 
              type="url" 
              value={addLinkedin}
              onChange={(e) => setAddLinkedin(e.target.value)}
              className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <div className="flex items-center justify-end gap-3 mt-6">
            <button 
              type="button" 
              onClick={() => setIsAddingContact(false)}
              className="px-4 py-2 rounded-lg text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors"
            >
              Add Contact
            </button>
          </div>
        </form>
      </Modal>
    </motion.div>
  )
}
