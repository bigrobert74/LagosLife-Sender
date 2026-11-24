import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PackagesService, FALLBACK_PACKAGES } from '../packages/packages.service';
import { BankSettingsService } from './bank-settings.service';
import { PhoneNotificationsService } from './phone-notifications.service';
import { DatabaseService } from '../database/database.service';

export interface InFlightOrder {
  id: string;
  orderNumber: string;
  gameUsername: string;
  targetPlayerId?: string;
  totalGameCurrency: string;
  formattedGameAmount: string;
  totalNairaAmount: number;
  status: string;
  bankNameSnapshot: string;
  accountNameSnapshot: string;
  accountNumberSnapshot: string;
  customerEmail?: string;
  customerPhone?: string;
  expiresAt: string;
  createdAt: string;
  submittedPayment?: {
    senderAccountName: string;
    senderBankName: string;
    transactionReference: string;
    receiptStorageKey?: string;
    notes?: string;
    submittedAt: string;
  };
  deliveryRecord?: {
    deliveredAt: string;
    inGameTransactionRef: string;
    adminNotes?: string;
  };
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly packagesService: PackagesService,
    private readonly bankSettingsService: BankSettingsService,
    private readonly phoneNotificationsService: PhoneNotificationsService,
    private readonly databaseService: DatabaseService,
  ) {}

  getLiveBankSettings() {
    return this.bankSettingsService.getSettings();
  }

  async createOrder(body: {
    packageId?: string;
    customAmount?: number | string;
    gameUsername: string;
    targetPlayerId?: string;
    customerEmail?: string;
    customerPhone?: string;
  }) {
    if (!body.gameUsername || body.gameUsername.trim().length < 2) {
      throw new BadRequestException('A valid Lagos Life in-game username is required');
    }

    const cleanUsername = body.gameUsername.trim();
    const quote = await this.packagesService.calculateQuote(body.packageId, body.customAmount);

    // -------------------------------------------------------------
    // STRICT ANTI-DUPLICATION ENGINE
    // If this customer already has an active unpaid order (PENDING_PAYMENT)
    // for the exact same character and package placed within the last 45 minutes,
    // reuse that active order instead of creating a duplicate and spamming push notifications.
    // -------------------------------------------------------------
    const now = Date.now();
    for (const existingOrder of this.databaseService.getAllOrders()) {
      if (
        existingOrder.status === 'PENDING_PAYMENT' &&
        existingOrder.gameUsername.toLowerCase() === cleanUsername.toLowerCase() &&
        existingOrder.totalGameCurrency === quote.gameCurrencyAmount
      ) {
        const createdMs = new Date(existingOrder.createdAt).getTime();
        if (now - createdMs < 45 * 60 * 1000) {
          // Synchronize snapshot to latest live bank account
          const liveBank = this.bankSettingsService.getSettings();
          existingOrder.bankNameSnapshot = liveBank.bankName;
          existingOrder.accountNameSnapshot = liveBank.accountName;
          existingOrder.accountNumberSnapshot = liveBank.accountNumber;
          existingOrder.expiresAt = new Date(now + 60 * 60 * 1000).toISOString();
          this.databaseService.saveOrder(existingOrder);

          return {
            orderNumber: existingOrder.orderNumber,
            status: existingOrder.status,
            gameUsername: existingOrder.gameUsername,
            gameCurrencyAmount: existingOrder.totalGameCurrency,
            formattedGameAmount: existingOrder.formattedGameAmount,
            amountToPayNaira: existingOrder.totalNairaAmount,
            totalNairaAmount: existingOrder.totalNairaAmount,
            expiresAt: existingOrder.expiresAt,
            bankInstructions: {
              bankName: existingOrder.bankNameSnapshot,
              accountName: existingOrder.accountNameSnapshot,
              accountNumber: existingOrder.accountNumberSnapshot,
              paymentReference: existingOrder.orderNumber,
            },
          };
        }
      }
    }

    const orderNumber = `LL-${Math.floor(100000 + Math.random() * 900000)}`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const createdAt = new Date().toISOString();

    const liveBank = this.bankSettingsService.getSettings();

    const newOrder: InFlightOrder = {
      id: `ord-${Date.now()}`,
      orderNumber,
      gameUsername: cleanUsername,
      targetPlayerId: body.targetPlayerId || 'usr-001',
      totalGameCurrency: quote.gameCurrencyAmount,
      formattedGameAmount: quote.formattedGameAmount,
      totalNairaAmount: quote.nairaPrice,
      status: 'PENDING_PAYMENT',
      bankNameSnapshot: liveBank.bankName,
      accountNameSnapshot: liveBank.accountName,
      accountNumberSnapshot: liveBank.accountNumber,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      expiresAt,
      createdAt,
    };

    this.databaseService.saveOrder(newOrder);

    // Send instant push notification to Admin's iPhone and Android
    this.phoneNotificationsService
      .sendPush(
        `💰 New Order #${orderNumber}`,
        `@${newOrder.gameUsername} bought ${newOrder.formattedGameAmount} for ₦${newOrder.totalNairaAmount.toLocaleString()}`,
        { priority: 'high', tags: 'moneybag,shopping_cart' },
      )
      .catch(() => {});

    return {
      orderNumber: newOrder.orderNumber,
      status: newOrder.status,
      gameUsername: newOrder.gameUsername,
      gameCurrencyAmount: newOrder.totalGameCurrency,
      formattedGameAmount: newOrder.formattedGameAmount,
      amountToPayNaira: newOrder.totalNairaAmount,
      totalNairaAmount: newOrder.totalNairaAmount,
      expiresAt: newOrder.expiresAt,
      bankInstructions: {
        bankName: newOrder.bankNameSnapshot,
        accountName: newOrder.accountNameSnapshot,
        accountNumber: newOrder.accountNumberSnapshot,
        paymentReference: newOrder.orderNumber,
      },
    };
  }

  async getOrderByNumber(orderNumber: string) {
    const order = this.databaseService.getOrder(orderNumber);
    if (!order) {
      throw new NotFoundException(`Order ${orderNumber} not found`);
    }

    let modified = false;

    // Auto-migrate any legacy WAITING_FOR_DELIVERY status to COMPLETED
    if (order.status === 'WAITING_FOR_DELIVERY' || order.status === 'DELIVERY_PROCESSING') {
      order.status = 'COMPLETED';
      if (!order.deliveryRecord) {
        order.deliveryRecord = {
          deliveredAt: order.createdAt,
          inGameTransactionRef: `LL-TX-${order.orderNumber.replace('LL-', '')}`,
          adminNotes: 'Auto-approved and completed upon payment verification',
        };
      }
      modified = true;
    }

    // Dynamic sync: if order is still pending payment, update bank snapshots to live settings
    if (order.status === 'PENDING_PAYMENT') {
      const liveBank = this.bankSettingsService.getSettings();
      order.bankNameSnapshot = liveBank.bankName;
      order.accountNameSnapshot = liveBank.accountName;
      order.accountNumberSnapshot = liveBank.accountNumber;
      modified = true;
    }

    if (modified) {
      this.databaseService.saveOrder(order);
    }

    return order;
  }

  async findByOrderNumber(orderNumber: string) {
    return this.getOrderByNumber(orderNumber);
  }

  async completeDelivery(
    orderNumber: string,
    details: { inGameTxRef: string; adminNotes?: string },
  ) {
    const order = await this.getOrderByNumber(orderNumber);
    order.status = 'COMPLETED';
    order.deliveryRecord = {
      deliveredAt: new Date().toISOString(),
      inGameTransactionRef: details.inGameTxRef,
      adminNotes: details.adminNotes,
    };
    this.databaseService.saveOrder(order);

    // Send push notification for delivery completion
    this.phoneNotificationsService
      .sendPush(
        `✅ Delivered #${orderNumber}`,
        `Successfully delivered ${order.formattedGameAmount} to @${order.gameUsername}! In-game ref: ${details.inGameTxRef}`,
        { priority: 'default', tags: 'white_check_mark,package' },
      )
      .catch(() => {});
    return order;
  }

  async updateOrderStatus(orderNumber: string, status: string, notes?: string) {
    const order = await this.getOrderByNumber(orderNumber);
    if (order) {
      order.status = status;
      if (notes) {
        if (!order.deliveryRecord) {
          order.deliveryRecord = {
            deliveredAt: new Date().toISOString(),
            inGameTransactionRef: `LL-TX-${Date.now()}`,
            adminNotes: notes,
          };
        } else {
          order.deliveryRecord.adminNotes = notes;
        }
      }
      this.databaseService.saveOrder(order);
    }
    return order;
  }

  async submitPayment(
    orderNumber: string,
    body: {
      senderAccountName: string;
      senderBankName: string;
      transactionReference: string;
      receiptStorageKey?: string;
      notes?: string;
    },
  ) {
    const order = await this.getOrderByNumber(orderNumber);
    if (order.status !== 'PENDING_PAYMENT' && order.status !== 'PAYMENT_REJECTED') {
      throw new BadRequestException(`Order ${orderNumber} cannot receive payment in state ${order.status}`);
    }

    order.submittedPayment = {
      senderAccountName: body.senderAccountName,
      senderBankName: body.senderBankName,
      transactionReference: body.transactionReference,
      receiptStorageKey: body.receiptStorageKey,
      notes: body.notes,
      submittedAt: new Date().toISOString(),
    };
    order.status = 'PAYMENT_UNDER_REVIEW';
    this.databaseService.saveOrder(order);

    // Send urgent push notification to Admin's iPhone & Android
    this.phoneNotificationsService
      .sendPush(
        `🚨 Payment Proof Submitted #${orderNumber}`,
        `@${order.gameUsername} sent ₦${order.totalNairaAmount.toLocaleString()} via ${body.senderBankName} (${body.senderAccountName}) - Ref: ${body.transactionReference}`,
        { priority: 'urgent', tags: 'warning,credit_card' },
      )
      .catch(() => {});

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      message: 'Payment details submitted successfully. An administrator is verifying your transfer.',
    };
  }

  async getAllOrders() {
    return this.databaseService.getAllOrders().map((o) => {
      if (o.status === 'WAITING_FOR_DELIVERY' || o.status === 'DELIVERY_PROCESSING') {
        o.status = 'COMPLETED';
        if (!o.deliveryRecord) {
          o.deliveryRecord = {
            deliveredAt: o.createdAt,
            inGameTransactionRef: `LL-TX-${o.orderNumber.replace('LL-', '')}`,
            adminNotes: 'Auto-approved and completed upon payment verification',
          };
        }
      }
      return o;
    });
  }
}
