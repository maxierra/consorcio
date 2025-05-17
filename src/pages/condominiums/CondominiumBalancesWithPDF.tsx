import React from 'react';
import { useParams } from 'react-router-dom';
import CondominiumBalances from './CondominiumBalances';
import FloatingPDFButton from '../../components/FloatingPDFButton';

const CondominiumBalancesWithPDF: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  return (
    <>
      <CondominiumBalances />
      {id && <FloatingPDFButton condominiumId={id} />}
    </>
  );
};

export default CondominiumBalancesWithPDF;
