import { useAuth } from '@/providers/AuthProvider'
import { useTheme } from '@/providers/ThemeProvider'
import { LogOut, Mail, Shield, Calendar, Fingerprint, Sun, Moon } from 'lucide-react'

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
  const { theme, setTheme } = useTheme()
  if (!user) return null

  const joined = user.created_at ? new Date(user.created_at).toLocaleDateString() : '—'

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Profile</h1>
        <p className="text-sm text-slate-500">Your account details</p>
      </div>

      <div className="glass rounded-2xl p-6 dark:bg-slate-800/40 bg-white shadow-sm border dark:border-white/10 border-slate-200">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 flex items-center justify-center text-xl font-semibold shrink-0">
            {initialsOf(user.name, user.email)}
          </div>
          <div className="min-w-0">
            <p className="text-lg font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
            <span className="inline-flex mt-1.5 items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-2 py-0.5">
              <Shield size={11} />
              {user.role}
            </span>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Mail size={15} className="shrink-0" />
            <span className="truncate">{user.email}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Calendar size={15} className="shrink-0" />
            <span>Member since {joined}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-600 dark:text-slate-400">
            <Fingerprint size={15} className="shrink-0" />
            <span className="truncate text-slate-500">{user.id}</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-slate-200 dark:border-white/10 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-medium text-slate-900 dark:text-white">Appearance</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Choose your preferred theme</p>
            </div>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900/50 p-1 rounded-lg border border-slate-200 dark:border-white/5">
              <button
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'light' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Sun size={14} /> Light
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${theme === 'dark' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
              >
                <Moon size={14} /> Dark
              </button>
            </div>
          </div>
          
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
