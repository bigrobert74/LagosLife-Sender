import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

export interface PersistentOrderRecord {
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

export interface PersistentInventoryState {
  recordedAvailableBalance: string;
  reservedBalance: string;
  lifetimeDeliveredBalance: string;
  lowInventoryThreshold: string;
  lastUpdatedAt: string;
}

export interface PersistentLedgerEntry {
  id: string;
  type: string;
  amount: string;
  formattedAmount: string;
  balanceBefore: string;
  balanceAfter: string;
  relatedOrderId?: string;
  adminUsername: string;
  reason: string;
  timestamp: string;
}

export interface PersistentAuditEntry {
  id: string;
  adminUsername: string;
  adminRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  diffBefore?: any;
  diffAfter?: any;
  ipAddress: string;
  timestamp: string;
}

@Injectable()
export class DatabaseService implements OnModuleInit {
  private readonly logger = new Logger(DatabaseService.name);
  private dataDir: string = '';

  // In-Memory Cached Tables
  private orders = new Map<string, PersistentOrderRecord>();
  private ledger: PersistentLedgerEntry[] = [];
  private inventoryState: PersistentInventoryState = {
    recordedAvailableBalance: '250000000000000',
    reservedBalance: '0',
    lifetimeDeliveredBalance: '0',
    lowInventoryThreshold: '500000000000',
    lastUpdatedAt: new Date().toISOString(),
  };
  private auditLogs: PersistentAuditEntry[] = [];
  private fulfillmentJobs = new Map<string, any>();
  private fulfillmentTransactions: any[] = [];
  private fulfillmentSettings: any = null;
  private staffUsers: any[] = [];
  private customers = new Map<string, any>();
  private supportTickets: any[] = [];
  private coupons: any[] = [];

  constructor() {
    this.initDataDirectory();
    this.hydrateAllTablesFromDisk();
  }

  onModuleInit() {
    if (this.orders.size === 0) {
      this.hydrateAllTablesFromDisk();
    }
  }

  // -------------------------------------------------------------
  // Data Directory Resolution & Crash-Safe Atomic Persistence
  // -------------------------------------------------------------
  private initDataDirectory() {
    const candidates = [
      path.resolve(process.cwd(), 'apps', 'api', 'data'),
      path.resolve(process.cwd(), 'data'),
      path.resolve(__dirname, '..', '..', 'data'),
      path.resolve(__dirname, '..', '..', 'apps', 'api', 'data'),
      path.resolve(__dirname, '..', '..', '..', 'data'),
    ];

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        try {
          // Verify write permissions
          const testFile = path.join(c, '.write_test');
          fs.writeFileSync(testFile, 'ok', 'utf-8');
          fs.unlinkSync(testFile);
          this.dataDir = c;
          break;
        } catch (_) {}
      }
    }

    if (!this.dataDir) {
      for (const c of candidates) {
        try {
          fs.mkdirSync(c, { recursive: true });
          const testFile = path.join(c, '.write_test');
          fs.writeFileSync(testFile, 'ok', 'utf-8');
          fs.unlinkSync(testFile);
          this.dataDir = c;
          break;
        } catch (_) {}
      }
    }

    if (!this.dataDir) {
      this.dataDir = path.resolve(process.cwd(), 'data');
    }

    this.logger.log(`[DatabaseService] Persistent database storage directory initialized at: ${this.dataDir}`);
  }

  public getDataDirectory(): string {
    return this.dataDir;
  }

  private getTableFilePath(tableName: string): string {
    return path.join(this.dataDir, `${tableName}.json`);
  }

  private readTableFromDisk<T>(tableName: string, fallback: T): T {
    const filePath = this.getTableFilePath(tableName);
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw) as T;
      }
    } catch (err: any) {
      this.logger.warn(`Could not read table ${tableName} from disk: ${err.message}. Initializing fallback.`);
    }
    return fallback;
  }

  private writeTableToDisk(tableName: string, data: any) {
    const filePath = this.getTableFilePath(tableName);
    const tempPath = `${filePath}.tmp`;
    try {
      fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.renameSync(tempPath, filePath);
      } catch {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
        try {
          fs.unlinkSync(tempPath);
        } catch (_) {}
      }
    } catch (err: any) {
      this.logger.error(`Failed to persist table ${tableName} to disk: ${err.message}`);
    }
  }

  // -------------------------------------------------------------
  // Startup Hydration
  // -------------------------------------------------------------
  private hydrateAllTablesFromDisk() {
    this.logger.log('Hydrating all database tables from persistent disk store...');

    // 1. Orders Table
    const rawOrders = this.readTableFromDisk<PersistentOrderRecord[]>('orders', []);
    this.orders.clear();
    for (const o of rawOrders) {
      this.orders.set(o.orderNumber, o);
    }
    this.logger.log(`Hydrated ${this.orders.size} customer orders from disk.`);

    // 2. Inventory State
    this.inventoryState = this.readTableFromDisk<PersistentInventoryState>('inventory_state', this.inventoryState);

    // 3. Inventory Ledger
    const defaultLedger: PersistentLedgerEntry[] = [
      {
        id: 'ledg-init-001',
        type: 'OPENING_BALANCE',
        amount: '250000000000000',
        formattedAmount: '250 Trillion',
        balanceBefore: '0',
        balanceAfter: '250000000000000',
        adminUsername: 'system_init',
        reason: 'Initial Treasury Reserve initialization',
        timestamp: new Date().toISOString(),
      },
    ];
    this.ledger = this.readTableFromDisk<PersistentLedgerEntry[]>('inventory_ledger', defaultLedger);
    if (!fs.existsSync(this.getTableFilePath('inventory_ledger'))) {
      this.writeTableToDisk('inventory_ledger', this.ledger);
    }

    // 4. Audit Logs Table
    const defaultAudit: PersistentAuditEntry[] = [
      {
        id: 'audit-boot-001',
        adminUsername: 'lead_admin',
        adminRole: 'SUPER_ADMIN',
        action: 'SYSTEM_BOOT',
        entityType: 'SYSTEM',
        entityId: 'sys-001',
        details: 'Lagos Life database engine booted with persistent file storage.',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
      },
    ];
    this.auditLogs = this.readTableFromDisk<PersistentAuditEntry[]>('audit_logs', defaultAudit);
    if (!fs.existsSync(this.getTableFilePath('audit_logs'))) {
      this.writeTableToDisk('audit_logs', this.auditLogs);
    }

    // 5. Fulfillment Jobs Table
    const rawJobs = this.readTableFromDisk<any[]>('fulfillment_jobs', []);
    this.fulfillmentJobs.clear();
    for (const j of rawJobs) {
      this.fulfillmentJobs.set(j.orderNumber, j);
    }

    // 6. Fulfillment Transactions Table
    this.fulfillmentTransactions = this.readTableFromDisk<any[]>('fulfillment_transactions', []);

    // 7. Fulfillment Settings Table
    this.fulfillmentSettings = this.readTableFromDisk<any>('fulfillment_settings', null);

    // 8. Staff Users Table
    const defaultStaff = [
      {
        id: 'usr-admin-001',
        username: 'lead_admin',
        email: 'admin@lagoslife.com',
        name: 'Oladele (Lead)',
        role: 'SUPER_ADMIN',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        permissions: ['ALL'],
      },
      {
        id: 'usr-admin-002',
        username: 'payments_lead',
        email: 'finance@lagoslife.com',
        name: 'Finance Desk',
        role: 'PAYMENT_ADMIN',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        permissions: ['APPROVE_PAYMENTS', 'REJECT_PAYMENTS'],
      },
    ];
    this.staffUsers = this.readTableFromDisk<any[]>('staff_users', defaultStaff);
    if (!fs.existsSync(this.getTableFilePath('staff_users'))) {
      this.writeTableToDisk('staff_users', this.staffUsers);
    }

    // 9. Customers Table
    const rawCustomers = this.readTableFromDisk<any[]>('customers', []);
    this.customers.clear();
    for (const c of rawCustomers) {
      this.customers.set(c.id || c.gameUsername, c);
    }

    // 10. Support Tickets
    this.supportTickets = this.readTableFromDisk<any[]>('support_tickets', []);

    // 11. Coupons
    this.coupons = this.readTableFromDisk<any[]>('coupons', []);

    this.logger.log('✅ [DatabaseService] All tables successfully hydrated into memory from persistent disk storage.');
  }

  // -------------------------------------------------------------
  // ORDERS API
  // -------------------------------------------------------------
  public getAllOrders(): PersistentOrderRecord[] {
    return Array.from(this.orders.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  public getOrder(orderNumber: string): PersistentOrderRecord | undefined {
    return this.orders.get(orderNumber.toUpperCase());
  }

  public saveOrder(order: PersistentOrderRecord): PersistentOrderRecord {
    const cleanNum = order.orderNumber.toUpperCase();
    this.orders.set(cleanNum, { ...order, orderNumber: cleanNum });
    this.persistOrders();
    this.syncCustomerRecord(order);
    return this.orders.get(cleanNum)!;
  }

  public deleteOrder(orderNumber: string): boolean {
    const deleted = this.orders.delete(orderNumber.toUpperCase());
    if (deleted) this.persistOrders();
    return deleted;
  }

  private persistOrders() {
    this.writeTableToDisk('orders', Array.from(this.orders.values()));
  }

  // -------------------------------------------------------------
  // INVENTORY & LEDGER API
  // -------------------------------------------------------------
  public getInventoryState(): PersistentInventoryState {
    return { ...this.inventoryState };
  }

  public updateInventoryState(partial: Partial<PersistentInventoryState>): PersistentInventoryState {
    this.inventoryState = {
      ...this.inventoryState,
      ...partial,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.writeTableToDisk('inventory_state', this.inventoryState);
    return { ...this.inventoryState };
  }

  public getLedger(): PersistentLedgerEntry[] {
    return [...this.ledger];
  }

  public addLedgerEntry(entry: PersistentLedgerEntry): PersistentLedgerEntry {
    this.ledger.unshift(entry);
    this.writeTableToDisk('inventory_ledger', this.ledger);
    return entry;
  }

  // -------------------------------------------------------------
  // AUDIT LOGS API
  // -------------------------------------------------------------
  public getAuditLogs(): PersistentAuditEntry[] {
    return [...this.auditLogs];
  }

  public addAuditLog(entry: PersistentAuditEntry): PersistentAuditEntry {
    this.auditLogs.unshift(entry);
    // Keep last 1,000 logs on disk
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }
    this.writeTableToDisk('audit_logs', this.auditLogs);
    return entry;
  }

  // -------------------------------------------------------------
  // FULFILLMENT PIPELINE API
  // -------------------------------------------------------------
  public getFulfillmentJobs(): any[] {
    return Array.from(this.fulfillmentJobs.values());
  }

  public getFulfillmentJob(orderNumber: string): any | undefined {
    return this.fulfillmentJobs.get(orderNumber.toUpperCase());
  }

  public saveFulfillmentJob(job: any): any {
    this.fulfillmentJobs.set(job.orderNumber.toUpperCase(), job);
    this.writeTableToDisk('fulfillment_jobs', Array.from(this.fulfillmentJobs.values()));
    return job;
  }

  public getFulfillmentTransactions(): any[] {
    return [...this.fulfillmentTransactions];
  }

  public addFulfillmentTransaction(tx: any): any {
    this.fulfillmentTransactions.unshift(tx);
    this.writeTableToDisk('fulfillment_transactions', this.fulfillmentTransactions);
    return tx;
  }

  public getFulfillmentSettings(): any | null {
    return this.fulfillmentSettings;
  }

  public saveFulfillmentSettings(settings: any): any {
    this.fulfillmentSettings = { ...settings };
    this.writeTableToDisk('fulfillment_settings', this.fulfillmentSettings);
    return this.fulfillmentSettings;
  }

  // -------------------------------------------------------------
  // CUSTOMERS API
  // -------------------------------------------------------------
  public getCustomers(): any[] {
    return Array.from(this.customers.values());
  }

  private syncCustomerRecord(order: PersistentOrderRecord) {
    const handle = order.gameUsername.toLowerCase();
    const existing = this.customers.get(handle) || {
      id: `cust-${handle}`,
      gameUsername: order.gameUsername,
      name: order.submittedPayment?.senderAccountName || order.gameUsername,
      customerPhone: order.customerPhone || null,
      customerEmail: order.customerEmail || null,
      totalOrders: 0,
      completedOrders: 0,
      totalSpendNaira: 0,
      totalGameCurrencyPurchased: '0',
      firstOrderAt: order.createdAt,
      lastOrderAt: order.createdAt,
    };

    existing.totalOrders = Array.from(this.orders.values()).filter(
      (o) => o.gameUsername.toLowerCase() === handle,
    ).length;

    const completed = Array.from(this.orders.values()).filter(
      (o) => o.gameUsername.toLowerCase() === handle && o.status === 'COMPLETED',
    );
    existing.completedOrders = completed.length;
    existing.totalSpendNaira = completed.reduce((sum, o) => sum + (o.totalNairaAmount || 0), 0);
    existing.lastOrderAt = order.createdAt;

    this.customers.set(handle, existing);
    this.writeTableToDisk('customers', Array.from(this.customers.values()));
  }

  // -------------------------------------------------------------
  // SUPPORT TICKETS & COUPONS API
  // -------------------------------------------------------------
  public getSupportTickets(): any[] {
    return [...this.supportTickets];
  }

  public saveSupportTicket(ticket: any): any {
    const idx = this.supportTickets.findIndex((t) => t.id === ticket.id);
    if (idx >= 0) {
      this.supportTickets[idx] = ticket;
    } else {
      this.supportTickets.unshift(ticket);
    }
    this.writeTableToDisk('support_tickets', this.supportTickets);
    return ticket;
  }

  public getCoupons(): any[] {
    return [...this.coupons];
  }

  public saveCoupon(coupon: any): any {
    const idx = this.coupons.findIndex((c) => c.code === coupon.code);
    if (idx >= 0) {
      this.coupons[idx] = coupon;
    } else {
      this.coupons.unshift(coupon);
    }
    this.writeTableToDisk('coupons', this.coupons);
    return coupon;
  }

  public getStaffUsers(): any[] {
    return [...this.staffUsers];
  }

  public saveStaffUser(user: any): any {
    const idx = this.staffUsers.findIndex((s) => s.username === user.username);
    if (idx >= 0) {
      this.staffUsers[idx] = user;
    } else {
      this.staffUsers.push(user);
    }
    this.writeTableToDisk('staff_users', this.staffUsers);
    return user;
  }
}
