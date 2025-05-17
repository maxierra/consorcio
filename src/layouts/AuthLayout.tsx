import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Building2, CheckCircle, Shield, DollarSign, FileText, PieChart } from 'lucide-react';

const features = [
  {
    icon: Shield,
    title: 'Gestión Segura',
    description: 'Mantenga la información de sus consorcios protegida con nuestro sistema de seguridad avanzado'
  },
  {
    icon: DollarSign,
    title: 'Control Financiero',
    description: 'Administre expensas, pagos y gastos de manera eficiente y transparente'
  },
  {
    icon: FileText,
    title: 'Documentación Digital',
    description: 'Acceda a toda la documentación importante desde cualquier lugar y en cualquier momento'
  },
  {
    icon: PieChart,
    title: 'Reportes Detallados',
    description: 'Obtenga insights valiosos con nuestros reportes y análisis financieros'
  }
];

export default function AuthLayout() {
  const { user } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left side - Login Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="flex flex-col items-center">
            <Building2 className="h-12 w-12 text-primary-600" />
            <h1 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Sistema de Administración de Consorcios
            </h1>
            <p className="mt-2 text-center text-sm text-gray-600">
              La solución integral para la gestión eficiente de sus consorcios
            </p>
          </div>
          <div className="mt-8">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Right side - Features and Image */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0">
          <img
            className="h-full w-full object-cover"
            src="https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg"
            alt="Modern building facade"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30">
            <div className="absolute inset-0 flex flex-col justify-end p-12">
              <div className="max-w-2xl">
                <h2 className="text-white text-3xl font-bold mb-6">
                  Administración Profesional
                </h2>
                <div className="grid grid-cols-2 gap-6">
                  {features.map((feature, index) => (
                    <div key={index} className="flex items-start space-x-4">
                      <div className="flex-shrink-0">
                        <feature.icon className="h-6 w-6 text-primary-400" />
                      </div>
                      <div>
                        <h3 className="text-white font-semibold mb-1">
                          {feature.title}
                        </h3>
                        <p className="text-gray-300 text-sm">
                          {feature.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 border-t border-white/20 pt-8">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-primary-400" />
                    <span className="text-white">Prueba gratuita por 30 días</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}