import { TripId, ActivityId, ExpenseId } from './trip';
import type { MoneyAmount } from './itinerary';

export type ExpenseCategory =
  | 'accommodation'
  | 'food'
  | 'transport'
  | 'activities'
  | 'shopping'
  | 'other';

export interface Expense {
  id: ExpenseId;
  tripId: TripId;
  activityId?: ActivityId;    // Optional link to activity

  description: string;
  category: ExpenseCategory;
  amount: MoneyAmount;

  // Conversion
  convertedAmount?: MoneyAmount;  // In trip's default currency
  exchangeRate?: number;

  // Metadata
  date: string;               // ISO date
  time?: string;
  location?: string;

  // Receipt
  receiptAttachmentId?: string;

  // Tracking
  isPaid: boolean;
  paymentMethod?: 'cash' | 'card' | 'other';

  createdAt: string;
  updatedAt: string;
}

export interface TripBudget {
  tripId: TripId;
  totalBudget?: MoneyAmount;
  expenses: Expense[];

  // Computed (stored for offline)
  totalSpent: MoneyAmount;
  remainingBudget?: MoneyAmount;

  // Per-category breakdown
  categoryTotals: Record<ExpenseCategory, number>;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: string;
}

export interface BudgetSummary {
  totalSpent: MoneyAmount;
  byCategory: Record<ExpenseCategory, MoneyAmount>;
  byCurrency: Record<string, number>;
  dailyAverage: number;
  projectedTotal: number;
}
