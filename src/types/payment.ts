export type PaymentMethod = 
  | 'bank_transfer'
  | 'cash'
  | 'check'
  | 'credit_card'
  | 'debit_card'
  | 'other';

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  reference?: string;
  unit_id: string;
  unit_fee_id?: string;
  created_at: string;
}

export interface PaymentSummary {
  id: string;
  amount: number;
  date: string;
  method: PaymentMethod;
  unit_number: string;
  owner_name: string;
  condominium_name: string;
}