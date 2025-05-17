export type ExpenseCategory = 
  | 'maintenance'
  | 'cleaning'
  | 'utilities'
  | 'administration'
  | 'repairs'
  | 'insurance'
  | 'taxes'
  | 'other';

export interface Expense {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  receipt_url?: string;
  is_extraordinary: boolean;
  condominium_id: string;
  created_at: string;
}

export interface ExpenseSummary {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
  condominium_name: string;
}

export interface ExpensesByCategory {
  category: ExpenseCategory;
  amount: number;
}