import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Layout } from './components/Layout'
import { ProtectedRoute } from './components/ProtectedRoute'
import { HomePage } from './pages/Home'
import { ProfilePage } from './pages/Profile'
import { TournamentsPage } from './pages/Tournaments'
import { AdminLocationsPage } from './pages/admin/Locations'
import { AdminTournamentsPage } from './pages/admin/Tournaments'
import { AdminRegistrationsPage } from './pages/admin/Registrations'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL}>
          <Layout>
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <HomePage />
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
                path="/tournaments"
                element={
                  <ProtectedRoute>
                    <TournamentsPage />
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
            </Routes>
          </Layout>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
