import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { MainChatPage } from './pages/MainChatPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { PaymentSandboxPage } from './pages/PaymentSandboxPage';
import { ProtectedRoute } from './components/admin/ProtectedRoute';
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminProductsPage } from './pages/admin/AdminProductsPage';
import { AdminTransactionsPage } from './pages/admin/AdminTransactionsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* User & Public Routes */}
            <Route path="/" element={<MainChatPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/sandbox-payment/:orderId" element={<PaymentSandboxPage />} />

            {/* Admin Panel Protected Routes */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminDashboardPage />} />
              <Route
                path="users"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="products"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminProductsPage />
                  </ProtectedRoute>
                }
              />
              <Route path="transactions" element={<AdminTransactionsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};



export default App;
