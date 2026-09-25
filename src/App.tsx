import { Navigate, Route, Routes } from 'react-router-dom'
import { EmptyDetail } from './components/EmptyDetail'
import { ProtectedRoute } from './components/ProtectedRoute'
import { SplitLayout } from './components/SplitLayout'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CompanyPage } from './pages/CompanyPage'
import { DriverPage } from './pages/DriverPage'
import { ForgotPassword } from './pages/ForgotPassword'
import { InfringementPage } from './pages/InfringementPage'
import { LastVisitPage } from './pages/LastVisitPage'
import { OAuthCallbackPage } from './pages/OAuthCallbackPage'
import { ProfilePage } from './pages/ProfilePage'
import { ResetPassword } from './pages/ResetPassword'
import { SignIn } from './pages/SignIn'
import { SignUp } from './pages/SignUp'
import { VehiculePage } from './pages/VehiculePage'

function AuthRedirect({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  if (session) return <Navigate to="/" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/sign-in"
        element={
          <AuthRedirect>
            <SignIn />
          </AuthRedirect>
        }
      />
      <Route
        path="/sign-up"
        element={
          <AuthRedirect>
            <SignUp />
          </AuthRedirect>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <AuthRedirect>
            <ForgotPassword />
          </AuthRedirect>
        }
      />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route
        element={
          <ProtectedRoute>
            <SplitLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmptyDetail />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/oauth/:provider/callback" element={<OAuthCallbackPage />} />
        <Route path="/clients/:clientId" element={<CompanyPage />} />
        <Route path="/clients/:clientId/vehicles/:vehicleId" element={<VehiculePage />} />
        <Route path="/clients/:clientId/drivers/:driverId" element={<DriverPage />} />
        <Route path="/clients/:clientId/visits/:visitId" element={<LastVisitPage />} />
        <Route
          path="/clients/:clientId/infringements/:infringementId"
          element={<InfringementPage />}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  )
}

export default App
