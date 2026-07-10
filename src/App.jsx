import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ClientMenu from './pages/ClientMenu';
import ChefPanel from './pages/ChefPanel';
import WaiterPanel from './pages/WaiterPanel';

const AdminLayout = lazy(() => import('./pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const EstablishmentsPage = lazy(() => import('./pages/admin/EstablishmentsPage'));
const EstablishmentDetail = lazy(() => import('./pages/admin/EstablishmentDetail'));
const TablesPage = lazy(() => import('./pages/admin/TablesPage'));
const MenuPage = lazy(() => import('./pages/admin/MenuPage'));
const StaffPage = lazy(() => import('./pages/admin/StaffPage'));
const StaffDetailPage = lazy(() => import('./pages/admin/StaffDetailPage'));
const OrdersPage = lazy(() => import('./pages/admin/OrdersPage'));
const StatsPage = lazy(() => import('./pages/admin/StatsPage'));
const FinancePage = lazy(() => import('./pages/admin/FinancePage'));

function PageFallback() {
  return (
    <div className="empty-state" style={{ minHeight: '40vh' }}>
      <p>...</p>
    </div>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/menu/:token" element={<ClientMenu />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="establishments" element={<EstablishmentsPage />} />
          <Route path="establishments/:id" element={<EstablishmentDetail />}>
            <Route index element={<TablesPage />} />
            <Route path="tables" element={<TablesPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="staff" element={<StaffPage />} />
            <Route path="staff/:staffId" element={<StaffDetailPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="finance" element={<FinancePage />} />
          </Route>
        </Route>

        <Route
          path="/chef"
          element={
            <ProtectedRoute roles={['chef']}>
              <ChefPanel />
            </ProtectedRoute>
          }
        />
        <Route
          path="/waiter"
          element={
            <ProtectedRoute roles={['waiter']}>
              <WaiterPanel />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
