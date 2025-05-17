import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Typography,
  Alert
} from '@mui/material';
import { supabase } from '../lib/supabaseClient';

interface InterestConfig {
  id?: string;
  condominium_id: string;
  first_period_days: number;
  first_period_rate: number;
  second_period_rate: number;
  enabled: boolean;
}

interface InterestConfigDialogProps {
  open: boolean;
  onClose: () => void;
  condominiumId: string;
}

export default function InterestConfigDialog({ open, onClose, condominiumId }: InterestConfigDialogProps) {
  const [config, setConfig] = useState<InterestConfig>({
    condominium_id: condominiumId,
    first_period_days: 15,
    first_period_rate: 0,
    second_period_rate: 0,
    enabled: true
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && condominiumId) {
      loadConfig();
    }
  }, [open, condominiumId]);

  const loadConfig = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('interest_config')
        .select('*')
        .eq('condominium_id', condominiumId)
        .single();

      if (error) throw error;

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setError('');
      const { data, error } = await supabase
        .from('interest_config')
        .upsert({
          ...config,
          condominium_id: condominiumId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setConfig(data);
      }
      onClose();
    } catch (err) {
      setError('Error al guardar la configuración');
      console.error('Error al guardar:', err);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Configuración de Intereses</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid component="div" item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Primer Período
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} component="div">
                <TextField
                  label="Días"
                  type="number"
                  value={config.first_period_days}
                  onChange={(e) => setConfig({ ...config, first_period_days: parseInt(e.target.value) })}
                  fullWidth
                  InputProps={{ inputProps: { min: 1, max: 31 } }}
                />
              </Grid>
              <Grid item xs={12} component="div">
                <TextField
                  label="Tasa (%)"
                  type="number"
                  value={config.first_period_rate}
                  onChange={(e) => setConfig({ ...config, first_period_rate: parseFloat(e.target.value) })}
                  fullWidth
                  InputProps={{ inputProps: { min: 0, step: 0.01 } }}
                />
              </Grid>
            </Grid>
          </Grid>

          <Grid component="div" item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              Segundo Período
            </Typography>
            <TextField
              label="Tasa (%)"
              type="number"
              value={config.second_period_rate}
              onChange={(e) => setConfig({ ...config, second_period_rate: parseFloat(e.target.value) })}
              fullWidth
              InputProps={{ inputProps: { min: 0, step: 0.01 } }}
            />
          </Grid>

          <Grid component="div" item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={config.enabled}
                  onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                />
              }
              label="Habilitar intereses por mora"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Guardar
        </Button>
      </DialogActions>
    </Dialog>
  );
}
