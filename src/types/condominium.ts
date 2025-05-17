export interface Condominium {
  id: string;
  name: string;
  address: string;
  tax_id: string;
  bank_info: string;
  bank_name: string;
  bank_account: string;
  bank_cbu: string;
  created_at: string;
  active: boolean;
  user_id: string;
}

export interface CondominiumSummary {
  id: string;
  name: string;
  address: string;
  units_count: number;
  pending_amount: number;
}