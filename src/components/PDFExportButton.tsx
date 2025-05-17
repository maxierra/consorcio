import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/Button';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { formatCurrency } from '../lib/utils';

interface PDFExportButtonProps {
  condominiumName: string;
  periodText: string;
  initialBalance: number;
  totalIncome: number;
  totalExpenses: number;
  finalBalance: number;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function PDFExportButton({
  condominiumName,
  periodText,
  initialBalance,
  totalIncome,
  totalExpenses,
  finalBalance
}: PDFExportButtonProps) {
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const generatePDF = async () => {
    try {
      setGeneratingPDF(true);
      
      // Crear el PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Configurar el título
      pdf.setFontSize(18);
      pdf.text(`Reporte de Balance - ${condominiumName}`, 20, 20);
      pdf.setFontSize(14);
      pdf.text(`Período: ${periodText}`, 20, 30);
      pdf.setFontSize(12);
      pdf.text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, 20, 40);
      
      // Capturar la tabla de balances
      const balanceTable = document.querySelector('.balance-table');
      if (balanceTable) {
        const balanceCanvas = await html2canvas(balanceTable as HTMLElement);
        const balanceImgData = balanceCanvas.toDataURL('image/png');
        pdf.addImage(balanceImgData, 'PNG', 15, 50, 180, 40);
      }
      
      // Agregar información de ingresos y egresos
      pdf.text('Resumen Financiero:', 20, 100);
      pdf.text(`Saldo Inicial: ${formatCurrency(initialBalance)}`, 30, 110);
      pdf.text(`Ingresos: ${formatCurrency(totalIncome)}`, 30, 120);
      pdf.text(`Egresos: ${formatCurrency(totalExpenses)}`, 30, 130);
      pdf.text(`Saldo Final: ${formatCurrency(finalBalance)}`, 30, 140);
      
      // Capturar los gráficos
      const chartsSection = document.querySelector('.balance-charts');
      if (chartsSection) {
        const chartsCanvas = await html2canvas(chartsSection as HTMLElement);
        const chartsImgData = chartsCanvas.toDataURL('image/png');
        pdf.addImage(chartsImgData, 'PNG', 15, 150, 180, 100);
      }
      
      // Guardar el PDF
      pdf.save(`Balance_${condominiumName.replace(/\\s+/g, '_')}_${periodText.replace(/\\s+/g, '_')}.pdf`);
      
      setGeneratingPDF(false);
    } catch (err) {
      console.error('Error al generar el PDF:', err);
      setGeneratingPDF(false);
      alert('Error al generar el PDF. Por favor, inténtelo de nuevo.');
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={generatePDF}
      disabled={generatingPDF}
      className="flex items-center"
    >
      <Download className="h-4 w-4 mr-2" />
      {generatingPDF ? 'Generando...' : 'Descargar PDF'}
    </Button>
  );
}
