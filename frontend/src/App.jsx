import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NuevoCaso from './pages/NuevoCaso';
import CasoDetalle from './pages/CasoDetalle';
import DetalleCasoClinica from './pages/DetalleCasoClinica';
import NuevaPrueba from './pages/NuevaPrueba';
import PortalClinica from './pages/PortalClinica';
import NuevoPedidoClinica from './pages/NuevoPedidoClinica';
import NuevaPruebaClinica from './pages/NuevaPruebaClinica';
import VistaGestor from './pages/VistaGestor';
import AsignarRutas from './pages/AsignarRutas';
import Clinicas from './pages/Clinicas';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';
import Trabajos from './pages/Trabajos';

function HomeRedirect() {
  const { user } = useAuth();
  if (user?.rol === 'clinica') return <PortalClinica />;
  if (user?.rol === 'tecnico') return <Navigate to="/trabajos" replace />;
  return <Dashboard />;
}

function CasoRedirect() {
  const { user } = useAuth();
  return user?.rol === 'clinica' ? <DetalleCasoClinica /> : <CasoDetalle />;
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
        path="/nueva-prueba/:id"
        element={
          <ProtectedRoute roles={['clinica']}>
            <NuevaPruebaClinica />
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
          <ProtectedRoute roles={['admin', 'tecnico', 'gestor', 'clinica']}>
            <CasoRedirect />
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
        path="/trabajos"
        element={
          <ProtectedRoute roles={['admin', 'tecnico']}>
            <Trabajos />
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
