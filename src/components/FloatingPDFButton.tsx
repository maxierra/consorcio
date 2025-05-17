import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { formatCurrency } from '../lib/utils';
import jsPDF from 'jspdf';

interface FloatingPDFButtonProps {
  condominiumId: string;
}

const FloatingPDFButton: React.FC<FloatingPDFButtonProps> = ({ condominiumId }) => {
  const [generating, setGenerating] = useState(false);
  const [condominiumName, setCondominiumName] = useState('');
  const [period, setPeriod] = useState('Actual');
  const [initialBalance, setInitialBalance] = useState(0);
  const [income, setIncome] = useState(0);
  const [expenses, setExpenses] = useState(0);
  const [finalBalance, setFinalBalance] = useState(0);
  
  // Obtener datos del consorcio y balance
  useEffect(() => {
    if (!condominiumId) return;
    
    const fetchData = async () => {
      try {
        // Obtener nombre del consorcio
        const { data: condominiumData, error: condominiumError } = await supabase
          .from('condominiums')
          .select('name')
          .eq('id', condominiumId)
          .single();
          
        if (condominiumError) throw condominiumError;
        if (condominiumData) setCondominiumName(condominiumData.name);
        
        // Obtener balance actual
        const { data: balanceData, error: balanceError } = await supabase
          .from('condominium_balances')
          .select('*')
          .eq('condominium_id', condominiumId)
          .order('period_year', { ascending: false })
          .order('period_month', { ascending: false })
          .limit(1);
          
        if (balanceError) throw balanceError;
        
        if (balanceData && balanceData.length > 0) {
          const balance = balanceData[0];
          const months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
          ];
          
          setPeriod(`${months[balance.period_month - 1]} ${balance.period_year}`);
          setInitialBalance(balance.initial_balance);
          setIncome(balance.income);
          setExpenses(balance.expenses);
          setFinalBalance(balance.final_balance);
        }
      } catch (error) {
        console.error('Error al obtener datos:', error);
      }
    };
    
    fetchData();
  }, [condominiumId]);

  const handleGeneratePDF = async () => {
    if (!condominiumName) return;
    
    try {
      setGenerating(true);
      
      // Crear el PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Configurar el título
      pdf.setFontSize(18);
      pdf.text(`Reporte de Balance - ${condominiumName}`, 20, 20);
      pdf.setFontSize(14);
      pdf.text(`Período: ${period}`, 20, 30);
      pdf.setFontSize(12);
      pdf.text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, 20, 40);
      
      // Crear una tabla simple con los datos financieros
      pdf.setFillColor(240, 240, 240);
      pdf.rect(20, 50, 170, 10, 'F');
      pdf.setFontSize(10);
      pdf.text('CONCEPTO', 25, 56);
      pdf.text('MONTO', 150, 56);
      
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, 60, 190, 60);
      
      pdf.text('Saldo Inicial', 25, 70);
      pdf.text(formatCurrency(initialBalance), 150, 70);
      
      pdf.text('Ingresos', 25, 80);
      pdf.text(formatCurrency(income), 150, 80);
      
      pdf.text('Egresos', 25, 90);
      pdf.text(formatCurrency(expenses), 150, 90);
      
      pdf.line(20, 95, 190, 95);
      
      pdf.setFont('helvetica', 'bold');
      pdf.text('Saldo Final', 25, 105);
      pdf.text(formatCurrency(finalBalance), 150, 105);
      pdf.setFont('helvetica', 'normal');
      
      // Agregar gráfico simple
      pdf.setFillColor(75, 192, 192);
      pdf.rect(40, 120, 40, -(income/1000));
      pdf.text('Ingresos', 40, 130);
      
      pdf.setFillColor(255, 99, 132);
      pdf.rect(100, 120, 40, -(expenses/1000));
      pdf.text('Egresos', 100, 130);
      
      pdf.text('* Valores en gráfico escalados (1:1000)', 40, 140);
      
      // Agregar pie de página
      pdf.setFontSize(8);
      pdf.text(`Generado el ${new Date().toLocaleString('es-AR')} - Sistema de Gestión de Consorcios`, 20, 280);
      
      // Guardar el PDF
      pdf.save(`Balance_${condominiumName.replace(/\s+/g, '_')}_${period.replace(/\s+/g, '_')}.pdf`);
      
    } catch (error) {
      console.error('Error al generar el PDF:', error);
      alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    } finally {
      setGenerating(false);
    }
  };

  if (!condominiumId) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        backgroundColor: '#4f46e5',
        color: 'white',
        borderRadius: '50%',
        width: '60px',
        height: '60px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}
      onClick={handleGeneratePDF}
      title="Descargar reporte en PDF"
    >
      {generating ? (
        <div className="animate-spin h-5 w-5 border-2 border-white rounded-full border-t-transparent" />
      ) : (
        <Download size={24} />
      )}
    </div>
  );
};

export default FloatingPDFButton;
