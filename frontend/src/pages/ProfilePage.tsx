import { useAuth } from '@/providers/AuthProvider'
import { LogOut, Mail, Shield, Calendar, Fingerprint } from 'lucide-react'

function initialsOf(name: string, email: string) {
  const fromName = name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return fromName || (email ? email[0].toUpperCase() : 'P')
}

export default function ProfilePage() {
  const { user, logout } = useAuth()
  if (!user) return null

  const joined = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Profile</h1>
        <p className="text-sm text-slate-500">Your account details</p>
      </div>

      <div className="glass rounded-2xl p-6">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-xl font-semibold shrink-0">
            {initialsOf(user.name, user.email)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-white truncate">{user.name}</p>
            <p className="text-sm text-slate-400 truncate">{user.email}</p>
            <span className="inline-flex mt-1.5 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
              <Shield size={11} />
              {user.role}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-center gap-3 text-slate-400">
            <Mail size={15} className="shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Calendar size={15} className="shrink-0" />
            <span>Member since {joined}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <Fingerprint size={15} className="shrink-0" />
            <span className="truncate text-slate-500">{user.id}</span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-white/10">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
