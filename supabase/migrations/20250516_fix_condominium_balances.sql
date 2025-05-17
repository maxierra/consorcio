-- Script para corregir los valores de los balances existentes
-- Este script divide por 100 los valores actuales para corregir la interpretación incorrecta

-- Actualizar los balances existentes
UPDATE condominium_balances
SET 
  initial_balance = initial_balance / 100,
  income = income / 100,
  expenses = expenses / 100
WHERE 
  -- Solo actualizar balances con valores exagerados (mayores a 10000)
  initial_balance > 10000 OR income > 10000 OR expenses > 10000;

-- El trigger calculate_condominium_balances_final_balance se encargará de actualizar el final_balance automáticamente
