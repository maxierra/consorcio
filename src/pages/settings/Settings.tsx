import { useState } from 'react';
import { Button, Card, Title, Text, Grid, Col } from '@tremor/react';
import AdministrationForm from '../../components/AdministrationForm';
import AdministrationTable from '../../components/AdministrationTable';
import EmailConfigForm from '../../components/EmailConfigForm';
import EmailConfigTable from '../../components/EmailConfigTable';
import { toast } from 'react-hot-toast';
import { Settings as SettingsIcon, Building, Database, Mail } from 'lucide-react';

interface Administration {
  id: string;
  name: string;
  cuit: string;
  registration_number: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  email: string;
  phone: string;
  created_at?: string;
  updated_at?: string;
}

interface EmailConfig {
  id: string;
  service: string;
  host?: string;
  port?: number;
  secure: boolean;
  user_email: string;
  password: string;
  from_name: string;
  default_subject: string;
  default_template: string;
  created_at?: string;
  updated_at?: string;
}

export default function Settings() {
  // Estado para la sección de administración
  const [showForm, setShowForm] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [administrationToEdit, setAdministrationToEdit] = useState<Administration | null>(null);
  
  // Estado para la sección de configuración de correo
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailRefreshTrigger, setEmailRefreshTrigger] = useState(0);
  const [emailConfigToEdit, setEmailConfigToEdit] = useState<EmailConfig | null>(null);

  const handleFormSuccess = () => {
    toast.success('Operación completada con éxito');
    setShowForm(false);
    setAdministrationToEdit(null);
    // Actualizar la tabla después de guardar/editar
    setRefreshTrigger(prev => prev + 1);
  };

  const handleEdit = (administration: Administration) => {
    setAdministrationToEdit(administration);
    setShowForm(true);
  };
  
  const handleEmailFormSuccess = () => {
    toast.success('Configuración de correo guardada con éxito');
    setShowEmailForm(false);
    setEmailConfigToEdit(null);
    // Actualizar la tabla después de guardar/editar
    setEmailRefreshTrigger(prev => prev + 1);
  };

  const handleEmailEdit = (config: EmailConfig) => {
    setEmailConfigToEdit(config);
    setShowEmailForm(true);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6 flex items-center">
        <SettingsIcon className="h-8 w-8 text-primary-600 mr-3" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-600">Administra la configuración del sistema</p>
        </div>
      </div>

      <Grid numItemsMd={1} numItemsLg={1} className="gap-6 mt-6">
        <Col>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Building className="h-6 w-6 text-primary-600 mr-2" />
                <Title>Datos de la Administración</Title>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={Database}
                onClick={() => {
                  setAdministrationToEdit(null);
                  setShowForm(true);
                }}
              >
                Cargar Datos
              </Button>
            </div>
            
            <Text className="mb-4 text-gray-600">
              Gestiona la información de la administración del consorcio, incluyendo datos fiscales y de contacto.
            </Text>
            
            <AdministrationTable 
              onEdit={handleEdit} 
              triggerRefresh={refreshTrigger} 
            />
          </Card>
        </Col>
        
        <Col>
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <Mail className="h-6 w-6 text-primary-600 mr-2" />
                <Title>Configuración de Correo Electrónico</Title>
                <div className="relative ml-3 group">
                  <div className="cursor-help rounded-full bg-red-500 p-1 w-7 h-7 flex items-center justify-center text-white text-sm font-bold shadow-md hover:bg-red-600 transition-colors animate-pulse">
                    ?
                  </div>
                  <div className="absolute left-0 bottom-full mb-2 w-96 bg-gray-800 text-white rounded-lg p-5 shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <p className="mb-3 text-lg font-bold text-yellow-300">Servicios disponibles:</p>
                    <ul className="list-disc pl-6 space-y-3 text-base">
                      <li><span className="font-bold text-blue-300">Gmail:</span> Requiere correo Gmail y una contraseña de aplicación (no tu contraseña normal)</li>
                      <li><span className="font-bold text-blue-300">Outlook:</span> Usa tu correo de Outlook/Hotmail y su contraseña o clave de aplicación</li>
                      <li><span className="font-bold text-blue-300">Yahoo:</span> Necesita correo Yahoo y contraseña de aplicación específica</li>
                      <li><span className="font-bold text-blue-300">SMTP:</span> Para otros proveedores, especificando host, puerto y seguridad</li>
                    </ul>
                    <div className="absolute left-2 bottom-[-6px] w-3 h-3 bg-gray-800 transform rotate-45"></div>
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="primary"
                icon={Database}
                onClick={() => {
                  setEmailConfigToEdit(null);
                  setShowEmailForm(true);
                }}
              >
                Configurar Email
              </Button>
            </div>
            
            <Text className="mb-4 text-gray-600">
              Configura los parámetros para el envío de correos electrónicos desde el sistema, incluyendo plantillas predeterminadas.
            </Text>
            
            <EmailConfigTable 
              onEdit={handleEmailEdit} 
              triggerRefresh={emailRefreshTrigger} 
            />
          </Card>
        </Col>
      </Grid>

      <AdministrationForm
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setAdministrationToEdit(null);
        }}
        onSuccess={handleFormSuccess}
        administrationToEdit={administrationToEdit}
      />
      
      <EmailConfigForm
        isOpen={showEmailForm}
        onClose={() => {
          setShowEmailForm(false);
          setEmailConfigToEdit(null);
        }}
        onSuccess={handleEmailFormSuccess}
        configToEdit={emailConfigToEdit}
      />
    </div>
  );
}
