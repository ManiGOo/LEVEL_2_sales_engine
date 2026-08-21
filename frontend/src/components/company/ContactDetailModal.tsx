import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/button'
import { useApi } from '@/hooks/useApi'
import { showToast } from '@/components/ui/toast'
import type { Contact } from '@/types/api'
import { cn } from '@/lib/utils'
import {
  User,
  Briefcase,
  Building2,
  Tag,
  Mail,
  ExternalLink,
  Pencil,
  Save,
  X,
} from 'lucide-react'

interface ContactDetailModalProps {
  open: boolean
  onClose: () => void
  contact: Contact | null
  companyKey: string
}

function FieldRow({
  icon,
  label,
  children,
  href,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
  href?: string
}) {
  const body = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors break-all"
    >
      {children}
    </a>
  ) : (
    <span className="text-sm text-slate-200 break-all">{children || '—'}</span>
  )

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 text-slate-400 flex items-center justify-center shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-0.5">
          {label}
        </p>
        {body}
      </div>
    </div>
  )
}

export default function ContactDetailModal({
  open,
  onClose,
  contact,
  companyKey,
}: ContactDetailModalProps) {
  const { fetchApi } = useApi()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    title: '',
    email: '',
    linkedin_url: '',
  })

  useEffect(() => {
    if (contact) {
      setForm({
        name: contact.name || '',
        title: contact.title || '',
        email: contact.email || '',
        linkedin_url: contact.linkedin_url || '',
      })
      setEditing(false)
    }
  }, [contact, open])

  if (!contact) return null

  const sourceLabel =
    contact.source === 'corporate_registry'
      ? 'Corporate Registry'
      : contact.source === 'web_search'
        ? 'Web Search'
        : contact.source.replace('_', ' ')

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetchApi(`/api/v1/contacts/${encodeURIComponent(companyKey)}`, {
        method: 'PUT',
        body: JSON.stringify({
          old_name: contact!.name,
          new_name: form.name,
          new_title: form.title,
          email: form.email,
          linkedin_url: form.linkedin_url,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Failed to save contact')
      }
      showToast({ variant: 'success', title: 'Contact updated', description: form.name })
      await queryClient.invalidateQueries({ queryKey: ['contacts', companyKey] })
      setEditing(false)
    } catch (e) {
      showToast({
        variant: 'error',
        title: 'Could not save',
        description: e instanceof Error ? e.message : 'Unknown error',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <User size={18} className="text-indigo-400" />
          Contact Details
        </div>
      }
    >
      <div className="p-4 sm:p-5 space-y-1">
        {editing ? (
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Contact Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-slate-800/80 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Title
              </label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="mt-1 w-full px-3 py-2 bg-slate-800/80 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                Email
              </label>
              <input
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="name@company.com"
                className="mt-1 w-full px-3 py-2 bg-slate-800/80 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
                LinkedIn
              </label>
              <input
                value={form.linkedin_url}
                onChange={(e) => setForm((f) => ({ ...f, linkedin_url: e.target.value }))}
                placeholder="https://linkedin.com/in/..."
                className="mt-1 w-full px-3 py-2 bg-slate-800/80 border border-white/10 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="rounded-lg bg-white/5 px-3 py-2.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">
                Company
              </p>
              <p className="text-sm text-slate-300">{contact.company_name || '—'}</p>
              <span
                className={cn(
                  'mt-2 inline-block text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercase',
                  contact.source === 'corporate_registry'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : contact.source === 'web_search'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-slate-500/10 text-slate-400'
                )}
              >
                {sourceLabel}
              </span>
            </div>
          </div>
        ) : (
          <div>
            <FieldRow icon={<User size={15} />} label="Contact Name">
              {contact.name}
            </FieldRow>
            <FieldRow icon={<Briefcase size={15} />} label="Title">
              {contact.title}
            </FieldRow>
            <FieldRow icon={<Building2 size={15} />} label="Company">
              {contact.company_name}
            </FieldRow>
            <FieldRow icon={<Tag size={15} />} label="Source">
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-medium tracking-wide uppercase',
                  contact.source === 'corporate_registry'
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : contact.source === 'web_search'
                      ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-slate-500/10 text-slate-400'
                )}
              >
                {sourceLabel}
              </span>
            </FieldRow>
            <FieldRow
              icon={<Mail size={15} />}
              label="Email"
              href={contact.email ? `mailto:${contact.email}` : undefined}
            >
              {contact.email}
            </FieldRow>
            <FieldRow
              icon={<ExternalLink size={15} />}
              label="LinkedIn"
              href={contact.linkedin_url || undefined}
            >
              {contact.linkedin_url || 'No LinkedIn profile'}
            </FieldRow>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-4 mt-2 border-t border-white/5">
          {editing ? (
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(false)
                  setForm({
                    name: contact.name || '',
                    title: contact.title || '',
                    email: contact.email || '',
                    linkedin_url: contact.linkedin_url || '',
                  })
                }}
                disabled={saving}
              >
                <X size={14} /> Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave} disabled={saving}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save'}
              </Button>
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
              <Pencil size={14} /> Edit
            </Button>
          )}
        </div>
      </div>
    </Modal>
  )
}
