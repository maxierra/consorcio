import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert
} from '@mui/material';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (amount: number) => void;
  unitNumber: string;
  ownerName: string;
  suggestedAmount: number;
}

export default function PaymentConfirmationDialog({
  open,
  onClose,
  onConfirm,
  unitNumber,
  ownerName,
  suggestedAmount
}: PaymentConfirmationDialogProps) {
  const [amount, setAmount] = useState<number>(suggestedAmount);
  const [amountStr, setAmountStr] = useState<string>(suggestedAmount?.toString() || '0');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      // Asegurarse de que el monto sugerido sea un número válido
      const validAmount = typeof suggestedAmount === 'number' && !isNaN(suggestedAmount) ? suggestedAmount : 0;
      console.log('Monto sugerido recibido:', validAmount);
      setAmount(validAmount);
      
      // Formatear el número con máximo 2 decimales para el input
      // Si el número es entero, no mostrar decimales
      const formattedValue = validAmount % 1 === 0 
        ? validAmount.toString() 
        : validAmount.toFixed(2);
        
      setAmountStr(formattedValue);
      setError('');
    }
  }, [open, suggestedAmount]);

  const handleConfirm = () => {
    // Convertir el string a número para validación
    const numAmount = parseFloat(amountStr);
    
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    
    // Pasar el valor numérico exacto
    onConfirm(numAmount);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Confirmar Pago</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ mt: 1 }}>
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" gutterBottom>
              Unidad: <strong>{unitNumber}</strong>
            </Typography>
            <Typography variant="subtitle1" gutterBottom>
              Propietario: <strong>{ownerName}</strong>
            </Typography>
          </Box>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Monto sugerido: ${(typeof suggestedAmount === 'number' && !isNaN(suggestedAmount) ? suggestedAmount : 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
            <TextField
              label="Monto a pagar"
              type="text"
              value={amountStr}
              onChange={(e) => {
                // Permitir solo números y punto decimal
                let value = e.target.value.replace(/[^0-9.]/g, '');
                
                // Asegurar que solo haya un punto decimal
                const parts = value.split('.');
                if (parts.length > 2) {
                  value = parts[0] + '.' + parts.slice(1).join('');
                }
                
                // Limitar a 2 decimales si hay punto decimal
                if (value.includes('.')) {
                  const [whole, decimal] = value.split('.');
                  if (decimal.length > 2) {
                    value = whole + '.' + decimal.substring(0, 2);
                  }
                }
                
                setAmountStr(value);
                
                // Actualizar también el valor numérico para el formato
                const numValue = parseFloat(value);
                if (!isNaN(numValue)) {
                  setAmount(numValue);
                }
              }}
              fullWidth
              InputProps={{ 
                startAdornment: <span style={{ marginRight: '8px' }}>$</span>
              }}
              helperText={`Monto formateado: $${(parseFloat(amountStr) || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Registrar Pago
        </Button>
      </DialogActions>
    </Dialog>
  );
}
