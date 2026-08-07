import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'motion/react'
import { MessageSquare, LayoutDashboard, Building2, Target, X, LogOut } from 'lucide-react'
import Logo from './Logo'
import { useAuth } from '@/providers/AuthProvider'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/chat', icon: MessageSquare, label: 'AI Chat' },
  { to: '/companies', icon: Building2, label: 'Companies' },
  { to: '/leads', icon: Target, label: 'Leads' },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

const slideTransition = { type: 'tween', duration: 0.2, ease: 'easeOut' } as const

export default function Sidebar({ open, onClose }: SidebarProps) {
  const { user, logout } = useAuth()
  const initials =
    (user?.name || '')
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || (user?.email ? user.email[0].toUpperCase() : 'P')

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ x: open ? 0 : -288 }}
        transition={slideTransition}
        className="fixed lg:sticky lg:top-0 z-50 w-72 h-screen glass flex flex-col border-r border-white/5"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/5">
          <Logo />
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 text-slate-400 transition-colors"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                )
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          ))}

          <div className="pt-3 mt-3 border-t border-white/5">
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                  isActive
                    ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/20'
                    : 'text-slate-300 hover:bg-white/5 border-transparent'
                )
              }
            >
              <div className="h-9 w-9 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center text-sm font-semibold shrink-0">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{user?.name || 'Profile'}</p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </NavLink>
          </div>
        </nav>

        <div className="p-4 border-t border-white/5 space-y-2">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-colors"
          >
            <LogOut size={18} />
            Logout
          </button>
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-slate-500">Sentinel v1.0</p>
            <p className="text-xs text-slate-600">Live regulatory signals</p>
          </div>
        </div>
      </motion.aside>
    </>
  )
}
