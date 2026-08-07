import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/layout/Sidebar'
import { Menu } from 'lucide-react'
import { useMediaQuery } from '@/hooks/useMediaQuery'

export default function DashboardLayout() {
  const isDesktop = useMediaQuery('(min-width: 1024px)')
  const [sidebarOpen, setSidebarOpen] = useState(isDesktop)
  const { pathname } = useLocation()

  useEffect(() => {
    setSidebarOpen(isDesktop)
  }, [isDesktop])

  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [pathname, isDesktop])

  return (
    <div className="min-h-screen flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <button
        onClick={() => setSidebarOpen((o) => !o)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-lg glass text-slate-300 hover:bg-white/5 transition-colors"
        aria-label="Toggle menu"
      >
        <Menu size={20} />
      </button>
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 min-h-0 px-4 sm:px-6 pb-4 sm:pb-6 pt-16 lg:pt-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
