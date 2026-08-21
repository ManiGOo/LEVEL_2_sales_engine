import { useState, type FormEvent } from 'react'
import { useApi } from '@/hooks/useApi'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/toast'
import { Building2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'mt-1 w-full px-3 py-2 bg-slate-800/70 border border-white/10 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition-colors'
const labelClass = 'text-xs text-slate-400 font-semibold uppercase tracking-wide'
const sectionTitleClass =
  'flex items-center gap-2 text-sm font-semibold text-white border-b border-white/5 pb-2'

const STATUS_OPTIONS = [
  { value: 'unknown', label: 'Unknown' },
  { value: 'active', label: 'Active' },
  { value: 'dormant', label: 'Dormant' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3 p-5">
      <p className={sectionTitleClass}>
        <Building2 size={14} className="text-indigo-400" />
        {title}
      </p>
      <div className="grid sm:grid-cols-2 gap-3">{children}</div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-0', className)}>
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function CreateAccountModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const { fetchApi } = useApi()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [name, setName] = useState('')
  const [website, setWebsite] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [companyStatus, setCompanyStatus] = useState('unknown')
  const [industry, setIndustry] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [employees, setEmployees] = useState('')
  const [revenue, setRevenue] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')

  function resetForm() {
    setName('')
    setWebsite('')
    setLinkedinUrl('')
    setCompanyStatus('unknown')
    setIndustry('')
    setDescription('')
    setLocation('')
    setEmployees('')
    setRevenue('')
    setEmail('')
    setPhone('')
    setError('')
  }

  function handleClose() {
    if (saving) return
    resetForm()
    onClose()
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!name.trim()) {
      setError('Company name is required.')
      return
    }
    setSaving(true)
    try {
      // 1. Create the general company first
      const res = await fetchApi('/api/v1/general-companies', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          website: website.trim(),
          linkedin_url: linkedinUrl.trim(),
          company_status: companyStatus,
          industry: industry.trim(),
          description: description.trim(),
          location: location.trim(),
          employees: employees.trim(),
          revenue: revenue.trim(),
          email: email.trim(),
          phone: phone.trim(),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Failed to create account profile')
      }
      
      const newCompany = await res.json()
      
      // 2. Promote it immediately to Sales Qualified
      const promoteRes = await fetchApi('/api/v1/accounts/import', {
        method: 'POST',
        body: JSON.stringify({
          companies: [{
            company_key: newCompany.company_key,
            name: newCompany.name,
            location: newCompany.location
          }]
        })
      })
      if (!promoteRes.ok) throw new Error('Failed to add to Sales Qualified')

      showToast({
        variant: 'success',
        title: 'Account created',
        description: `${name.trim()} is now visible to all users`,
      })
      resetForm()
      onCreated()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong'
      setError(msg)
      showToast({ variant: 'error', title: 'Failed', description: msg })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="Create Account" className="lg:max-w-2xl">
      <form onSubmit={handleSubmit} className="divide-y divide-white/5">
        <Section title="Account details">
          <Field label="Account name" required className="sm:col-span-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Pharmaceuticals"
              className={inputClass}
              required
            />
          </Field>
          <Field label="Website">
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acme.com"
              className={inputClass}
            />
          </Field>
          <Field label="LinkedIn">
            <input
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              placeholder="https://linkedin.com/company/acme"
              className={inputClass}
            />
          </Field>
          <Field label="Status">
            <select
              value={companyStatus}
              onChange={(e) => setCompanyStatus(e.target.value)}
              className={cn(inputClass, 'appearance-none')}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Industry">
            <input
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Pharmaceuticals"
              className={inputClass}
            />
          </Field>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Mumbai, India"
              className={inputClass}
            />
          </Field>
          <Field label="Employees">
            <input
              value={employees}
              onChange={(e) => setEmployees(e.target.value)}
              placeholder="e.g. 500-1000"
              className={inputClass}
            />
          </Field>
          <Field label="Revenue">
            <input
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              placeholder="e.g. $50M"
              className={inputClass}
            />
          </Field>
          <Field label="Contact email">
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="info@acme.com"
              type="email"
              className={inputClass}
            />
          </Field>
          <Field label="Contact phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
              className={inputClass}
            />
          </Field>
          <Field label="Description" className="sm:col-span-2">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this company do?"
              rows={3}
              className={cn(inputClass, 'resize-y')}
            />
          </Field>
        </Section>

        <div className="p-5 flex items-center gap-3">
          {error && <p className="text-sm text-red-400 flex-1 break-words">{error}</p>}
          <div className="flex-1" />
          <button
            type="button"
            onClick={handleClose}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-sm text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold text-white transition-colors"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Saving…' : 'Create company'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
