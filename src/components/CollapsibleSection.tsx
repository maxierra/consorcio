import React, { ReactNode, useState } from 'react';
import { Button } from './ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from './ui/Card';

interface CollapsibleSectionProps {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  initialExpanded?: boolean;
  totalAmount?: number;
  isIncome?: boolean;
  sectionType?: 'income' | 'expenses' | 'salaries';
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  children,
  onClose,
  initialExpanded = true,
  totalAmount,
  isIncome,
  sectionType = 'income'
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  // Determinar el color de fondo según el tipo de sección y si está expandida
  const getSectionColor = () => {
    if (isExpanded) return ''; // Sin color especial cuando está expandido
    
    switch (sectionType) {
      case 'income':
        return 'bg-green-50';
      case 'expenses':
        return 'bg-red-50';
      case 'salaries':
        return 'bg-blue-50';
      default:
        return '';
    }
  };
  
  return (
    <div className="mt-6">
      <Card className={getSectionColor()}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center focus:outline-none"
              >
                <span className="mr-2">{isExpanded ? '▼' : '►'}</span>
                {title}
              </button>
            </CardTitle>
            <div className="flex items-center space-x-4">
              {totalAmount !== undefined && (
                <div className={`font-medium ${isIncome ? 'text-green-600' : 'text-red-600'}`}>
                  Total: {new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' }).format(totalAmount)}
                </div>
              )}
              {onClose && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onClose}
                >
                  Ocultar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div style={{ display: isExpanded ? 'block' : 'none' }}>
            {children}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollapsibleSection;
