import { HashRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/Home'
import { ProfilePage } from './pages/Profile'
import { SignUpPage } from './pages/SignUp'
import { SignInPage } from './pages/SignIn'
import { ForgotPasswordPage } from './pages/ForgotPassword'
import { VerifyEmailPage } from './pages/VerifyEmail'
import { TournamentsPage } from './pages/Tournaments'
import { LeaderboardPage } from './pages/Leaderboard'
import { AdminLocationsPage } from './pages/admin/Locations'
import { AdminTournamentsPage } from './pages/admin/Tournaments'
import { AdminRegistrationsPage } from './pages/admin/Registrations'
import { AdminFixturesPrintPage } from './pages/admin/FixturesPrint'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <HashRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <ProfilePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tournaments"
                element={
                  <ProtectedRoute>
                    <TournamentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/leaderboard"
                element={
                  <ProtectedRoute>
                    <LeaderboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/locations"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminLocationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tournaments"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminTournamentsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tournaments/:tournamentId/registrations"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminRegistrationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tournaments/:tournamentId/print"
                element={
                  <ProtectedRoute requireAdmin>
                    <AdminFixturesPrintPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Layout>
        </HashRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
