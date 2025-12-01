
export enum TransactionType {
  IN = 'IN',
  OUT = 'OUT'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Business {
  id: string;
  userId: string;
  name: string;
  currency: string;
  joinCode: string;
  createdAt: number;
}

export interface Book {
  id: string;
  businessId: string;
  name: string;
  createdAt: number;
}

export interface Transaction {
  id: string;
  bookId: string;
  amount: number;
  type: TransactionType;
  date: string; // ISO Date string YYYY-MM-DD
  time: string; // HH:mm
  note: string;
  partyName?: string; // Customer or Client Name
  category?: string; // Tag
  attachmentUrl?: string; // Base64 or URL
  createdAt: number;
}

// Helper types for UI
export interface BookWithTotals extends Book {
  totalIn: number;
  totalOut: number;
  balance: number;
}

export interface BusinessWithTotals extends Business {
  totalIn: number;
  totalOut: number;
  balance: number;
  bookCount: number;
  books?: BookWithTotals[]; // Quick links
  isShared?: boolean; // True if the current user is not the owner
  ownerEmail?: string;
}

export interface TransactionWithBalance extends Transaction {
  runningBalance: number;
}

export type ViewState = 
  | { name: 'AUTH' }
  | { name: 'DASHBOARD' }
  | { name: 'BUSINESS_DETAIL'; businessId: string }
  | { name: 'BOOK_DETAIL'; businessId: string; bookId: string };
