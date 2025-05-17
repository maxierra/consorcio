import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Building, DollarSign, Receipt, FileText, PieChart, Settings, Menu, X, ChevronDown, ChevronRight, LogOut, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const navigation = [
  { name: 'Panel', href: '/', icon: LayoutDashboard },
  { 
    name: 'Consorcios', 
    href: '/consorcios', 
    icon: Building,
    children: [
      { name: 'Carga de Consorcios', href: '/consorcios' },
      { name: 'Balances Consorcios', href: '/consorcios-balances' }
    ]
  },
  { 
    name: 'Gastos', 
    href: '/expenses', 
    icon: DollarSign,
    children: [
      { name: 'Lista de Gastos', href: '/expenses' },
      { name: 'Empleados', href: '/employees' },
      { name: 'Proveedores', href: '/providers' },
      { name: 'Pago de Facturas', href: '/provider-invoices' },
      { name: 'Control de Remuneraciones', href: '/employee-compensations' }
    ]
  },
  { name: 'Expensas', href: '/fees', icon: Receipt },
  { name: 'Pagos', href: '/payments', icon: FileText },
  { name: 'Reportes', href: '/reports', icon: PieChart },
  { name: 'Configuración de la Administración', href: '/settings', icon: Settings },
];

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]); // No pre-expanded items
  const location = useLocation();
  const navigate = useNavigate();
  const { supabase } = useAuth();

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const isChildActive = (item: any) => {
    if (item.children) {
      return item.children.some((child: any) => location.pathname === child.href);
    }
    return false;
  };

  const toggleExpand = (name: string) => {
    setExpandedItems(prev => 
      prev.includes(name) 
        ? prev.filter(item => item !== name)
        : [...prev, name]
    );
  };

  const isExpanded = (name: string) => expandedItems.includes(name);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const currentPath = location.pathname;
    const itemsToExpand: string[] = [];
    
    navigation.forEach(item => {
      if (item.children) {
        const hasActiveChild = item.children.some(child => 
          currentPath === child.href || currentPath.startsWith(child.href + '/')
        );
        
        if (hasActiveChild) {
          itemsToExpand.push(item.name);
        }
      }
    });
    
    setExpandedItems(itemsToExpand);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const NavItem = ({ item, mobile = false }: { item: any; mobile?: boolean }) => {
    const active = isActive(item.href) || isChildActive(item);
    const expanded = isExpanded(item.name);

    return (
      <div key={item.name}>
        <Link
          to={item.children ? '#' : item.href}
          onClick={item.children ? () => toggleExpand(item.name) : undefined}
          className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            active
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-50'
          }`}
        >
          <item.icon className="w-5 h-5 mr-3" />
          <span className="flex-1">{item.name}</span>
          {item.children && (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
          )}
        </Link>

        {/* Submenu */}
        {item.children && expanded && (
          <div className="ml-8 mt-1 space-y-1">
            {item.children.map((child: any) => (
              <Link
                key={child.name}
                to={child.href}
                className={`block px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(child.href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
                onClick={mobile ? () => setSidebarOpen(false) : undefined}
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <div className="fixed top-0 left-0 z-50 p-4 lg:hidden">
        <button
          type="button"
          className="p-2 text-gray-700 bg-white rounded-md shadow-lg"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-700">
            <h1 className="text-xl font-bold text-white">Consorcio App</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <NavItem key={item.name} item={item} mobile={true} />
            ))}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <main className="p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}