import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import { useSocketStore } from './stores/socketStore';

// Layout components
import DashboardLayout from './layouts/DashboardLayout';
import AuthLayout from './layouts/AuthLayout';

// Page components
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ServicesPage from './pages/services/ServicesPage';
import ServiceDetailPage from './pages/services/ServiceDetailPage';
import ServiceRequestsPage from './pages/requests/ServiceRequestsPage';
import RequestDetailPage from './pages/requests/RequestDetailPage';
import CreateRequestPage from './pages/requests/CreateRequestPage';
import FilesPage from './pages/files/FilesPage';
import ProfilePage from './pages/profile/ProfilePage';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ServiceManagement from './pages/admin/ServiceManagement';
import SystemSettings from './pages/admin/SystemSettings';
import AuditLogs from './pages/admin/AuditLogs';

// Loading and error components
import LoadingSpinner from './components/ui/LoadingSpinner';
import ErrorBoundary from './components/ui/ErrorBoundary';

function App() {
  const { user, isLoading, initializeAuth } = useAuthStore();
  const { initializeSocket, disconnect } = useSocketStore();

  useEffect(() => {
    // Initialize authentication on app start
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    // Initialize socket connection when user is authenticated
    if (user) {
      initializeSocket();
    } else {
      disconnect();
    }

    // Cleanup socket on unmount
    return () => {
      disconnect();
    };
  }, [user, initializeSocket, disconnect]);

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mb-4 mx-auto">
            CF
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Comply Flow Portal</h2>
          <LoadingSpinner size="lg" />
          <p className="text-gray-500 text-sm mt-2">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            {/* Public routes */}
            {!user ? (
              <>
                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="/login" element={<AuthLayout><LoginPage /></AuthLayout>} />
                <Route path="/register" element={<AuthLayout><RegisterPage /></AuthLayout>} />
                <Route path="/forgot-password" element={<AuthLayout><ForgotPasswordPage /></AuthLayout>} />
                <Route path="*" element={<Navigate to="/login" replace />} />
              </>
            ) : (
              <>
                {/* Protected routes */}
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/login" element={<Navigate to="/dashboard" replace />} />
                
                {/* Main application routes */}
                <Route
                  path="/dashboard"
                  element={
                    <DashboardLayout>
                      <DashboardPage />
                    </DashboardLayout>
                  }
                />
                
                {/* Services */}
                <Route
                  path="/services"
                  element={
                    <DashboardLayout>
                      <ServicesPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/services/:serviceId"
                  element={
                    <DashboardLayout>
                      <ServiceDetailPage />
                    </DashboardLayout>
                  }
                />
                
                {/* Service Requests */}
                <Route
                  path="/requests"
                  element={
                    <DashboardLayout>
                      <ServiceRequestsPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/requests/create"
                  element={
                    <DashboardLayout>
                      <CreateRequestPage />
                    </DashboardLayout>
                  }
                />
                <Route
                  path="/requests/:requestId"
                  element={
                    <DashboardLayout>
                      <RequestDetailPage />
                    </DashboardLayout>
                  }
                />
                
                {/* Files */}
                <Route
                  path="/files"
                  element={
                    <DashboardLayout>
                      <FilesPage />
                    </DashboardLayout>
                  }
                />
                
                {/* Profile */}
                <Route
                  path="/profile"
                  element={
                    <DashboardLayout>
                      <ProfilePage />
                    </DashboardLayout>
                  }
                />
                
                {/* Admin routes - only for admin users */}
                {['super_admin', 'admin', 'operations_manager'].includes(user?.role) && (
                  <>
                    <Route
                      path="/admin"
                      element={
                        <DashboardLayout>
                          <AdminDashboard />
                        </DashboardLayout>
                      }
                    />
                    <Route
                      path="/admin/users"
                      element={
                        <DashboardLayout>
                          <UserManagement />
                        </DashboardLayout>
                      }
                    />
                    <Route
                      path="/admin/services"
                      element={
                        <DashboardLayout>
                          <ServiceManagement />
                        </DashboardLayout>
                      }
                    />
                    <Route
                      path="/admin/settings"
                      element={
                        <DashboardLayout>
                          <SystemSettings />
                        </DashboardLayout>
                      }
                    />
                    <Route
                      path="/admin/audit"
                      element={
                        <DashboardLayout>
                          <AuditLogs />
                        </DashboardLayout>
                      }
                    />
                  </>
                )}
                
                {/* Catch all - redirect to dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </>
            )}
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
}

export default App;