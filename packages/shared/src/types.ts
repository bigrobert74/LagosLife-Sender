import { OrderStatus, AdminRole, RejectionReason } from './constants';

export interface CurrencyPackageDto {
  id: string;
  name: string;
  slug: string;
  gameCurrencyAmount: string; // Formatted large integer string e.g. "50000000000"
  formattedGameAmount: string; // e.g. "50 Billion"
  nairaPrice: number;
  badge?: string | null;
  isPopular: boolean;
  isActive: boolean;
  sortOrder: number;
}

export interface CreateOrderDto {
  packageId?: string;
  customAmount?: number;
  gameUsername: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface BankInstructionsDto {
  bankName: string;
  accountName: string;
  accountNumber: string;
  paymentReference: string;
  amountToPay: number;
  expiresAt: string;
}

export interface OrderSummaryDto {
  orderNumber: string;
  status: OrderStatus;
  gameUsername: string;
  totalGameCurrency: string;
  totalNairaAmount: number;
  createdAt: string;
  expiresAt: string;
  bankInstructions: BankInstructionsDto;
}

export interface SubmitPaymentDto {
  senderAccountName: string;
  senderBankName: string;
  transactionReference: string;
  receiptStorageKey?: string;
  notes?: string;
}

export interface AdminVerifyPaymentDto {
  confirmedAmount: number;
  bankStatementReference: string;
  adminNotes?: string;
}

export interface AdminRejectPaymentDto {
  rejectionReason: RejectionReason;
  adminNotes: string;
}

export interface AdminCompleteDeliveryDto {
  inGameTransactionRef?: string;
  deliveryNotes?: string;
}

export interface InventoryStatsDto {
  recordedAvailableBalance: string;
  reservedBalance: string;
  lifetimeDeliveredBalance: string;
  freeUncommittedBalance: string;
}
