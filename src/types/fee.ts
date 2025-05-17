export interface Fee {
  id: string;
  month: number;
  year: number;
  total_amount: number;
  generated_date: string;
  condominium_id: string;
  pdf_url?: string;
  created_at: string;
}

export interface UnitFee {
  id: string;
  fee_id: string;
  unit_id: string;
  amount: number;
  is_paid: boolean;
  payment_date?: string;
  created_at: string;
}

export interface FeeSummary {
  id: string;
  period: string;
  condominium_name: string;
  total_amount: number;
  paid_percentage: number;
}