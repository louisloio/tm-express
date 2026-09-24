import { Navigate, Route, Routes } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AuthProvider, useAuth } from './context/AuthContext'
import { CompanyPage } from './pages/CompanyPage'
import { DriverPage } from './pages/DriverPage'
import { ForgotPassword } from './pages/ForgotPassword'
import { Home } from './pages/Home'
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
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/oauth/:provider/callback"
        element={
          <ProtectedRoute>
            <OAuthCallbackPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId"
        element={
          <ProtectedRoute>
            <CompanyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId/vehicles/:vehicleId"
        element={
          <ProtectedRoute>
            <VehiculePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId/drivers/:driverId"
        element={
          <ProtectedRoute>
            <DriverPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId/visits/:visitId"
        element={
          <ProtectedRoute>
            <LastVisitPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clients/:clientId/infringements/:infringementId"
        element={
          <ProtectedRoute>
            <InfringementPage />
          </ProtectedRoute>
        }
      />
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
