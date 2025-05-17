export interface Unit {
  id: string;
  number: string;
  type: string;
  owner_name: string;
  owner_email: string;
  owner_phone: string;
  area: number;
  coefficient: number;
  condominium_id: string;
  created_at: string;
  expense_categories: string[];
}

export interface UnitSummary {
  id: string;
  number: string;
  type: string;
  owner_name: string;
  coefficient: number;
  condominium_name: string;
  balance: number;
}