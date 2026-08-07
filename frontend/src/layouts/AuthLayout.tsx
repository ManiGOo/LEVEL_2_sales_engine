import { Outlet } from 'react-router-dom'
import { motion } from 'motion/react'

export default function AuthLayout() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold gradient-text">AIVOA Sentinel</h1>
          <p className="text-slate-400 mt-2">Sales Intelligence Platform</p>
        </div>
        <div className="glass rounded-2xl p-8">
          <Outlet />
        </div>
      </motion.div>
    </div>
  )
}
