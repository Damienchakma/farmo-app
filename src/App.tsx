import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import { AppShell } from '@/components/app/AppShell'
import { ErrorBoundary } from '@/components/app/ErrorBoundary'
import { RequireAuth } from '@/components/app/RequireAuth'
import { AccountRoute } from '@/routes/Account'
import { DeveloperApiRoute } from '@/routes/DeveloperApi'
import { FarmViewRoute } from '@/routes/FarmView'
import { ProjectDetailRoute } from '@/routes/ProjectDetail'
import { ProjectsRoute } from '@/routes/Projects'
import { NotFoundRoute } from '@/routes/NotFound'
import { ForgotPasswordRoute } from '@/routes/auth/ForgotPassword'
import { LoginRoute } from '@/routes/auth/Login'
import { OAuthConsentRoute } from '@/routes/auth/OAuthConsent'
import { SignupRoute } from '@/routes/auth/Signup'
import { VerifyRoute } from '@/routes/auth/Verify'
import { LandingRoute } from '@/routes/Landing'
import { useSession } from '@/store/session'

export function App() {
  const init = useSession((s) => s.init)
  const location = useLocation()

  useEffect(() => {
    void init()
  }, [init])

  // A fresh navigation should start at the top of the page, the way a real
  // document load would.
  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [location.pathname])

  return (
    <Routes>
      {/* Public Landing Page */}
      <Route path="/" element={<LandingRoute />} />

      {/* Auth Routes */}
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/signup" element={<SignupRoute />} />
      <Route path="/verify" element={<VerifyRoute />} />
      <Route path="/forgot" element={<ForgotPasswordRoute />} />
      <Route path="/oauth/:provider" element={<OAuthConsentRoute />} />

      {/* Signed-in area */}
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route
          path="/projects"
          element={
            <ErrorBoundary scope="projects screen">
              <ProjectsRoute />
            </ErrorBoundary>
          }
        />
        <Route
          path="/projects/:projectId"
          element={
            <ErrorBoundary scope="project screen">
              <ProjectDetailRoute />
            </ErrorBoundary>
          }
        />
        <Route
          path="/farms/:farmId/:tab?"
          element={
            <ErrorBoundary scope="farm view">
              <FarmViewRoute />
            </ErrorBoundary>
          }
        />
        <Route
          path="/developers"
          element={
            <ErrorBoundary scope="developer console">
              <DeveloperApiRoute />
            </ErrorBoundary>
          }
        />
        <Route
          path="/account"
          element={
            <ErrorBoundary scope="account screen">
              <AccountRoute />
            </ErrorBoundary>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundRoute />} />
    </Routes>
  )
}