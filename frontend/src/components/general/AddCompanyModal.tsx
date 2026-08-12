import { useState, type FormEvent } from 'react'
import { useApi } from '@/hooks/useApi'
import { Modal } from '@/components/ui/Modal'
import { showToast } from '@/components/ui/toast'
import {
  Plus,
  Trash2,
  Building2,
  UserCircle,
  Briefcase,
  Activity,
  AlertTriangle,
  Newspaper,
  Loader2,
} from 'lucide-react'
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

function sectionIcon(section: string) {
  switch (section) {
    case 'company':
      return <Building2 size={14} className="text-indigo-400" />
    case 'contacts':
      return <UserCircle size={14} className="text-sky-400" />
    case 'hiring':
      return <Briefcase size={14} className="text-emerald-400" />
    case 'signals':
      return <Activity size={14} className="text-amber-400" />
    case 'triggers':
      return <AlertTriangle size={14} className="text-red-400" />
    case 'news':
      return <Newspaper size={14} className="text-purple-400" />
    default:
      return null
  }
}

function Section({
  title,
  section,
  children,
}: {
  title: string
  section: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3 p-5">
      <p className={sectionTitleClass}>
        {sectionIcon(section)}
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

function AddButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 mt-1 px-3 py-2 rounded-lg border border-dashed border-white/15 text-xs text-slate-400 hover:text-indigo-300 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-colors"
    >
      <Plus size={14} />
      {label}
    </button>
  )
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Remove"
      className="shrink-0 self-end mb-1 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
    >
      <Trash2 size={14} />
    </button>
  )
}

interface DecisionMakerForm {
  name: string
  role: string
  role_type: string
  email: string
  linkedin_url: string
  confidence: string
}

interface HiringForm {
  title: string
  location: string
  posted: string
  url: string
}

interface LinkForm {
  title: string
  url: string
  source: string
  date: string
}

const emptyDecisionMaker = (): DecisionMakerForm => ({
  name: '',
  role: '',
  role_type: 'unknown',
  email: '',
  linkedin_url: '',
  confidence: 'unknown',
})

const emptyHiring = (): HiringForm => ({ title: '', location: '', posted: '', url: '' })

const emptyLink = (): LinkForm => ({ title: '', url: '', source: '', date: '' })

export default function AddCompanyModal({
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

  const [hiringHeadline, setHiringHeadline] = useState('')
  const [activitySummary, setActivitySummary] = useState('')
  const [notes, setNotes] = useState('')

  const [decisionMakers, setDecisionMakers] = useState<DecisionMakerForm[]>([])

  function updateDecisionMaker(i: number, patch: Partial<DecisionMakerForm>) {
    setDecisionMakers((prev) => prev.map((dm, idx) => (idx === i ? { ...dm, ...patch } : dm)))
  }

  const [hiring, setHiring] = useState<HiringForm[]>([])
  function updateHiring(i: number, patch: Partial<HiringForm>) {
    setHiring((prev) => prev.map((h, idx) => (idx === i ? { ...h, ...patch } : h)))
  }

  const [intentSignals, setIntentSignals] = useState<LinkForm[]>([])
  const [triggerEvents, setTriggerEvents] = useState<LinkForm[]>([])
  const [hiringNews, setHiringNews] = useState<LinkForm[]>([])

  function updateList(
    list: LinkForm[],
    setter: React.Dispatch<React.SetStateAction<LinkForm[]>>,
    i: number,
    patch: Partial<LinkForm>
  ) {
    setter(list.map((item, idx) => (idx === i ? { ...item, ...patch } : item)))
  }

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
    setHiringHeadline('')
    setActivitySummary('')
    setNotes('')
    setDecisionMakers([])
    setHiring([])
    setIntentSignals([])
    setTriggerEvents([])
    setHiringNews([])
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
          hiring_headline: hiringHeadline.trim(),
          activity_summary: activitySummary.trim(),
          notes: notes.trim(),
          decision_makers: decisionMakers
            .filter((dm) => dm.name.trim())
            .map((dm) => ({
              name: dm.name.trim(),
              role: dm.role.trim(),
              role_type: dm.role_type || 'unknown',
              email: dm.email.trim(),
              linkedin_url: dm.linkedin_url.trim(),
              confidence: dm.confidence || 'unknown',
            })),
          hiring: hiring
            .filter((h) => h.title.trim())
            .map((h) => ({
              title: h.title.trim(),
              location: h.location.trim(),
              posted: h.posted.trim(),
              url: h.url.trim(),
            })),
          intent_signals: intentSignals
            .filter((s) => s.title.trim())
            .map((s) => ({ category: 'activity', title: s.title.trim(), url: s.url.trim(), snippet: '' })),
          trigger_events: triggerEvents
            .filter((s) => s.title.trim())
            .map((s) => ({ category: 'qms_trigger', title: s.title.trim(), url: s.url.trim(), snippet: '' })),
          hiring_news: hiringNews
            .filter((n) => n.title.trim())
            .map((n) => ({
              title: n.title.trim(),
              url: n.url.trim(),
              source: n.source.trim(),
              date: n.date.trim(),
            })),
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.detail || 'Failed to create company')
      }
      showToast({
        variant: 'success',
        title: 'Company added',
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
    <Modal
      open={open}
      onClose={handleClose}
      title="Add a general company"
      className="lg:max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="divide-y divide-white/5">
        <Section title="Company details" section="company">
          <Field label="Company name" required className="sm:col-span-2">
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

        <Section title="Lead research" section="contacts">
          <Field label="Hiring headline" className="sm:col-span-2">
            <input
              value={hiringHeadline}
              onChange={(e) => setHiringHeadline(e.target.value)}
              placeholder="e.g. Expanding QA team after new plant approval"
              className={inputClass}
            />
          </Field>
          <Field label="Activity summary" className="sm:col-span-2">
            <textarea
              value={activitySummary}
              onChange={(e) => setActivitySummary(e.target.value)}
              placeholder="Recent activity worth knowing when reaching out…"
              rows={3}
              className={cn(inputClass, 'resize-y')}
            />
          </Field>
        </Section>

        <Section title="Decision makers / contacts" section="contacts">
          {decisionMakers.map((dm, i) => (
            <div key={i} className="sm:col-span-2 rounded-lg bg-slate-900/40 border border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Contact {i + 1}
                </p>
                <RemoveButton onClick={() => setDecisionMakers((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name">
                  <input
                    value={dm.name}
                    onChange={(e) => updateDecisionMaker(i, { name: e.target.value })}
                    placeholder="e.g. Jane Doe"
                    className={inputClass}
                  />
                </Field>
                <Field label="Role">
                  <input
                    value={dm.role}
                    onChange={(e) => updateDecisionMaker(i, { role: e.target.value })}
                    placeholder="e.g. QA Head"
                    className={inputClass}
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={dm.email}
                    onChange={(e) => updateDecisionMaker(i, { email: e.target.value })}
                    placeholder="jane@acme.com"
                    className={inputClass}
                  />
                </Field>
                <Field label="LinkedIn">
                  <input
                    value={dm.linkedin_url}
                    onChange={(e) => updateDecisionMaker(i, { linkedin_url: e.target.value })}
                    placeholder="https://linkedin.com/in/jane"
                    className={inputClass}
                  />
                </Field>
                <Field label="Confidence">
                  <select
                    value={dm.confidence}
                    onChange={(e) => updateDecisionMaker(i, { confidence: e.target.value })}
                    className={cn(inputClass, 'appearance-none')}
                  >
                    {['unknown', 'high', 'medium', 'low'].map((c) => (
                      <option key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Role type">
                  <select
                    value={dm.role_type}
                    onChange={(e) => updateDecisionMaker(i, { role_type: e.target.value })}
                    className={cn(inputClass, 'appearance-none')}
                  >
                    {[
                      'unknown',
                      'qa_head',
                      'qa_manager',
                      'quality_personnel',
                      'managing_director',
                      'founder_ceo',
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          ))}
          <AddButton
            onClick={() => setDecisionMakers((prev) => [...prev, emptyDecisionMaker()])}
            label="Add decision maker"
          />
        </Section>

        <Section title="Job openings (hiring)" section="hiring">
          {hiring.map((h, i) => (
            <div key={i} className="sm:col-span-2 rounded-lg bg-slate-900/40 border border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Job {i + 1}</p>
                <RemoveButton onClick={() => setHiring((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title">
                  <input
                    value={h.title}
                    onChange={(e) => updateHiring(i, { title: e.target.value })}
                    placeholder="e.g. Senior QA Pharmacist"
                    className={inputClass}
                  />
                </Field>
                <Field label="Location">
                  <input
                    value={h.location}
                    onChange={(e) => updateHiring(i, { location: e.target.value })}
                    placeholder="e.g. Pune (hybrid)"
                    className={inputClass}
                  />
                </Field>
                <Field label="Posted">
                  <input
                    value={h.posted}
                    onChange={(e) => updateHiring(i, { posted: e.target.value })}
                    placeholder="e.g. 2 weeks ago"
                    className={inputClass}
                  />
                </Field>
                <Field label="URL">
                  <input
                    value={h.url}
                    onChange={(e) => updateHiring(i, { url: e.target.value })}
                    placeholder="https://acme.com/careers"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))}
          <AddButton onClick={() => setHiring((prev) => [...prev, emptyHiring()])} label="Add job opening" />
        </Section>

        <Section title="Activity signals" section="signals">
          {intentSignals.map((s, i) => (
            <div key={i} className="sm:col-span-2 rounded-lg bg-slate-900/40 border border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Signal {i + 1}</p>
                <RemoveButton onClick={() => setIntentSignals((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title">
                  <input
                    value={s.title}
                    onChange={(e) => updateList(intentSignals, setIntentSignals, i, { title: e.target.value })}
                    placeholder="e.g. Announced new manufacturing facility"
                    className={inputClass}
                  />
                </Field>
                <Field label="URL">
                  <input
                    value={s.url}
                    onChange={(e) => updateList(intentSignals, setIntentSignals, i, { url: e.target.value })}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))}
          <AddButton
            onClick={() => setIntentSignals((prev) => [...prev, emptyLink()])}
            label="Add activity signal"
          />
        </Section>

        <Section title="QMS triggers (why now)" section="triggers">
          {triggerEvents.map((s, i) => (
            <div key={i} className="sm:col-span-2 rounded-lg bg-slate-900/40 border border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Trigger {i + 1}</p>
                <RemoveButton onClick={() => setTriggerEvents((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title">
                  <input
                    value={s.title}
                    onChange={(e) => updateList(triggerEvents, setTriggerEvents, i, { title: e.target.value })}
                    placeholder="e.g. Received import alert 66-23"
                    className={inputClass}
                  />
                </Field>
                <Field label="URL">
                  <input
                    value={s.url}
                    onChange={(e) => updateList(triggerEvents, setTriggerEvents, i, { url: e.target.value })}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))}
          <AddButton
            onClick={() => setTriggerEvents((prev) => [...prev, emptyLink()])}
            label="Add QMS trigger"
          />
        </Section>

        <Section title="Hiring news" section="news">
          {hiringNews.map((n, i) => (
            <div key={i} className="sm:col-span-2 rounded-lg bg-slate-900/40 border border-white/5 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">News {i + 1}</p>
                <RemoveButton onClick={() => setHiringNews((prev) => prev.filter((_, idx) => idx !== i))} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Title">
                  <input
                    value={n.title}
                    onChange={(e) => updateList(hiringNews, setHiringNews, i, { title: e.target.value })}
                    placeholder="e.g. Company doubles hiring in QA"
                    className={inputClass}
                  />
                </Field>
                <Field label="URL">
                  <input
                    value={n.url}
                    onChange={(e) => updateList(hiringNews, setHiringNews, i, { url: e.target.value })}
                    placeholder="https://…"
                    className={inputClass}
                  />
                </Field>
                <Field label="Source">
                  <input
                    value={n.source}
                    onChange={(e) => updateList(hiringNews, setHiringNews, i, { source: e.target.value })}
                    placeholder="e.g. Economic Times"
                    className={inputClass}
                  />
                </Field>
                <Field label="Date">
                  <input
                    value={n.date}
                    onChange={(e) => updateList(hiringNews, setHiringNews, i, { date: e.target.value })}
                    placeholder="e.g. Aug 2026"
                    className={inputClass}
                  />
                </Field>
              </div>
            </div>
          ))}
          <AddButton
            onClick={() => setHiringNews((prev) => [...prev, emptyLink()])}
            label="Add hiring news item"
          />
        </Section>

        <Section title="Notes" section="company">
          <Field label="Private notes" className="sm:col-span-2">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything else worth remembering…"
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