import { useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LogoutButton() {
  const navigate = useNavigate();
  const { supabase } = useAuth();

  const handleLogout = async () => {
    try {
      // Primero intentamos cerrar sesión con Supabase
      await supabase.auth.signOut();
      
      // Luego navegamos a la página de login usando React Router
      navigate('/login', { replace: true });
      
      // Si por alguna razón la navegación no funciona, forzamos una redirección
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }, 500);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // En caso de error, forzamos la navegación a login
      navigate('/login', { replace: true });
    }
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
    >
      <LogOut className="w-5 h-5 mr-3" />
      Cerrar Sesión
    </button>
  );
}
