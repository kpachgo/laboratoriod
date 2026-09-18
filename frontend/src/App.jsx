import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevoCaso from './pages/NuevoCaso';
import CasoDetalle from './pages/CasoDetalle';
import NuevaPrueba from './pages/NuevaPrueba';
import PortalClinica from './pages/PortalClinica';
import NuevoPedidoClinica from './pages/NuevoPedidoClinica';
import VistaGestor from './pages/VistaGestor';
import AsignarRutas from './pages/AsignarRutas';
import Clinicas from './pages/Clinicas';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.rol === 'clinica') return <PortalClinica />;
  return <Dashboard />;
}

function RutasRedirect() {
  const { user } = useAuth();
  return user?.rol === 'admin' ? <AsignarRutas /> : <VistaGestor />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomeRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/nuevo-pedido"
        element={
          <ProtectedRoute roles={['clinica']}>
            <NuevoPedidoClinica />
          </ProtectedRoute>
        }
      />

      <Route
        path="/casos/nuevo"
        element={
          <ProtectedRoute roles={['admin', 'tecnico', 'gestor']}>
            <NuevoCaso />
          </ProtectedRoute>
        }
      />
      <Route
        path="/casos/:id"
        element={
          <ProtectedRoute roles={['admin', 'tecnico', 'gestor']}>
            <CasoDetalle />
          </ProtectedRoute>
        }
      />
      <Route
        path="/casos/:id/nueva-prueba"
        element={
          <ProtectedRoute roles={['admin', 'tecnico', 'gestor']}>
            <NuevaPrueba />
          </ProtectedRoute>
        }
      />

      <Route
        path="/rutas"
        element={
          <ProtectedRoute roles={['admin', 'gestor']}>
            <RutasRedirect />
          </ProtectedRoute>
        }
      />

      <Route
        path="/clinicas"
        element={
          <ProtectedRoute roles={['admin']}>
            <Clinicas />
          </ProtectedRoute>
        }
      />
      <Route
        path="/usuarios"
        element={
          <ProtectedRoute roles={['admin']}>
            <Usuarios />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reportes"
        element={
          <ProtectedRoute roles={['admin', 'tecnico']}>
            <Reportes />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
