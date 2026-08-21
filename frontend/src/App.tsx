import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/providers/AuthProvider'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/providers/ThemeProvider'
import { useIsFetching } from '@tanstack/react-query'
import AuthLayout from '@/layouts/AuthLayout'
import DashboardLayout from '@/layouts/DashboardLayout'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import DashboardPage from '@/pages/DashboardPage'
import ChatPage from '@/pages/ChatPage'
import AccountsPage from '@/pages/AccountsPage'
import CompanyDetailPage from '@/pages/CompanyDetailPage'
import GeneralCompanyDetailPage from '@/pages/GeneralCompanyDetailPage'
import LeadsPage from '@/pages/LeadsPage'
import CampaignsPage from '@/pages/CampaignsPage'
import CampaignDetailPage from '@/pages/CampaignDetailPage'
import AccountDetailPage from '@/pages/AccountDetailPage'
import QuotationsPage from '@/pages/QuotationsPage'
import QuotationDetailPage from '@/pages/QuotationDetailPage'
import ProfilePage from '@/pages/ProfilePage'
import ContactsPage from '@/pages/ContactsPage'
import { Toaster } from '@/components/ui/Toast'
import AppLoader from '@/components/AppLoader'
import type { ReactNode } from 'react'

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function GuestRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (user) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ThemeProvider>
          <QueryProvider>
            <AppRoutes />
          </QueryProvider>
        </ThemeProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  const { isLoading: authLoading } = useAuth()
  // Only count queries still on their first load (no data yet). Background
  // refetches and polling keep dataUpdatedAt > 0, so they don't flash the loader.
  const fetchingCount = useIsFetching({ predicate: (q) => q.state.dataUpdatedAt === 0 })
  return <>
    <AppLoader active={authLoading || fetchingCount > 0} variant={authLoading ? 'app' : 'resource'} />
    <Toaster position="top-right" />
    <Routes>
      <Route element={<GuestRoute><AuthLayout /></GuestRoute>}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/accounts" element={<Navigate to="/accounts/sales-qualified" replace />} />
        <Route path="/accounts/:tab" element={<AccountsPage />} />
        <Route path="/accounts/cdsco-s-fda/:slug" element={<CompanyDetailPage />} />
        <Route path="/accounts/general/:companyKey" element={<GeneralCompanyDetailPage />} />
        <Route path="/accounts/sales-qualified/:companyKey" element={<AccountDetailPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/campaigns" element={<CampaignsPage />} />
        <Route path="/campaigns/:campaignId" element={<CampaignDetailPage />} />
      <Route path="/quotations" element={<QuotationsPage />} />
      <Route path="/quotations/:id" element={<QuotationDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/contacts" element={<ContactsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </>
}
