// Esta es la versión corregida de la función fetchExpensePayments
const fetchExpensePayments = async () => {
  if (!selectedCondominium) {
    console.log('No hay consorcio seleccionado');
    return;
  }
  
  console.log('Buscando pagos para el consorcio:', selectedCondominium);
  
  try {
    // Obtener el balance actual
    console.log('Obteniendo balance actual...');
    const { data: currentBalance, error: balanceError } = await supabase
      .from('condominium_balances')
      .select('*')
      .eq('condominium_id', selectedCondominium)
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .limit(1)
      .single();
    
    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error al obtener el balance:', balanceError);
      throw balanceError;
    }
    
    // Si no hay balance, no podemos actualizar nada
    if (!currentBalance) {
      console.log('No se encontró balance para el consorcio:', selectedCondominium);
      return;
    }
    
    console.log('Balance actual:', currentBalance);
    
    // Obtener pagos de expensas para este consorcio
    const { data: payments, error: paymentsError } = await supabase
      .from('expense_payments')
      .select('*, unit:units(number, owner_name)')
      .eq('condominium_id', selectedCondominium)
      .eq('payment_status', 'paid');
    
    if (paymentsError) {
      console.error('Error al obtener pagos de expensas:', paymentsError);
      throw paymentsError;
    }
    
    // Guardar los pagos en el estado para mostrarlos en la interfaz
    setExpensePayments(payments || []);
    setShowPaymentsHistory(true);
    
    if (payments && payments.length > 0) {
      // Calcular el total de ingresos por pagos de expensas
      const totalIncome = payments.reduce((sum, payment) => sum + payment.amount, 0);
      
      // Actualizar el balance con los ingresos recalculados
      const newFinalBalance = currentBalance.initial_balance + totalIncome - currentBalance.expenses;
      
      // Actualizar el balance en la base de datos
      const { error: updateError } = await supabase
        .from('condominium_balances')
        .update({
          income: totalIncome,
          final_balance: newFinalBalance,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentBalance.id);
      
      if (updateError) throw updateError;
      
      // Recargar los balances para reflejar los cambios
      fetchBalances();
    }
  } catch (err) {
    console.error('Error al procesar pagos de expensas:', err);
    setError(err instanceof Error ? err.message : 'Error al procesar pagos de expensas');
  }
};
