import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RoomsPage from './pages/RoomsPage';
import ChatPage from './pages/ChatPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = localStorage.getItem('accessToken');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/rooms"
        element={
          <PrivateRoute>
            <RoomsPage />
          </PrivateRoute>
        }
      />
      <Route
        path="/rooms/:roomId"
        element={
          <PrivateRoute>
            <ChatPage />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/rooms" replace />} />
    </Routes>
  );
}
