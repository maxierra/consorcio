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
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setAmount(suggestedAmount);
      setError('');
    }
  }, [open, suggestedAmount]);

  const handleConfirm = () => {
    if (amount <= 0) {
      setError('El monto debe ser mayor a cero');
      return;
    }
    onConfirm(amount);
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
              Monto sugerido: ${suggestedAmount.toFixed(2)}
            </Typography>
            <TextField
              label="Monto a pagar"
              type="number"
              value={amount}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
              helperText="Puede modificar el monto si el propietario pagó un importe diferente"
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
