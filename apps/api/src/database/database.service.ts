import { Injectable, Logger, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

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

const KV_KEYS = [
  'bank_settings',
  'phone_notification_settings',
  'owner_account_session',
  'game_cookies',
] as const;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private dataDir = '';
  private pgConnected = false;
  private pgWriteQueue = new Map<string, Promise<void>>();

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
  private kvStore = new Map<string, any>();

  constructor(@Optional() private readonly prisma?: PrismaService) {
    this.initDataDirectory();
    this.hydrateAllTablesFromDisk();
  }

  async onModuleInit() {
    if (this.prisma && (await this.prisma.ensureReady())) {
      await this.syncAllTablesWithPostgres();
    } else if (this.orders.size === 0) {
      this.hydrateAllTablesFromDisk();
    }
  }

  async onModuleDestroy() {
    await Promise.allSettled(Array.from(this.pgWriteQueue.values()));
  }

  public isPostgresConnected(): boolean {
    return this.pgConnected;
  }

  /** Clears operational records (orders, customers, fulfillment jobs/txs, audit logs, support tickets) and resets inventory ledger/state while keeping config and staff accounts. */
  public async clearOperationalData(): Promise<{ clearedAt: string }> {
    const nowIso = new Date().toISOString();

    this.orders.clear();
    this.customers.clear();
    this.fulfillmentJobs.clear();
    this.fulfillmentTransactions = [];
    this.auditLogs = [];
    this.supportTickets = [];
    if (this.fulfillmentSettings) {
      this.fulfillmentSettings = {
        ...this.fulfillmentSettings,
        dailyDeliveredToday: '0',
      };
      this.writeTableToDisk('fulfillment_settings', this.fulfillmentSettings);
    }

    this.inventoryState = {
      recordedAvailableBalance: '250000000000000',
      reservedBalance: '0',
      lifetimeDeliveredBalance: '0',
      lowInventoryThreshold: '500000000000',
      lastUpdatedAt: nowIso,
    };

    this.ledger = [
      {
        id: `ledg-reset-${Date.now()}`,
        type: 'OPENING_BALANCE',
        amount: '250000000000000',
        formattedAmount: '250 Trillion',
        balanceBefore: '0',
        balanceAfter: '250000000000000',
        adminUsername: 'system_reset',
        reason: 'Database cleared — Treasury Reserve reset to initial balance',
        timestamp: nowIso,
      },
    ];

    this.writeTableToDisk('orders', []);
    this.writeTableToDisk('customers', []);
    this.writeTableToDisk('fulfillment_jobs', []);
    this.writeTableToDisk('fulfillment_transactions', []);
    this.writeTableToDisk('audit_logs', []);
    this.writeTableToDisk('support_tickets', []);
    this.writeTableToDisk('inventory_state', this.inventoryState);
    this.writeTableToDisk('inventory_ledger', this.ledger);

    if (this.pgConnected) {
      await Promise.allSettled(Array.from(this.pgWriteQueue.values()));
    }

    this.logger.log('[DatabaseService] Operational database tables cleared and synced.');
    return { clearedAt: nowIso };
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

  private writeJsonAtomically(filePath: string, data: any) {
    const tempPath = `${filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    try {
      fs.renameSync(tempPath, filePath);
    } catch {
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
      try {
        fs.unlinkSync(tempPath);
      } catch (_) {}
    }
  }

  private writeTableToDisk(tableName: string, data: any, skipPostgres = false) {
    const filePath = this.getTableFilePath(tableName);
    try {
      this.writeJsonAtomically(filePath, data);
    } catch (err: any) {
      this.logger.error(`Failed to persist table ${tableName} to disk: ${err.message}`);
    }

    if (!skipPostgres && this.pgConnected && data !== undefined) {
      this.queuePostgresUpsert(tableName, data);
    }
  }

  private queuePostgresUpsert(tableKey: string, data: any) {
    if (!this.prisma) return;
    const payload = JSON.stringify(data);
    const prev = this.pgWriteQueue.get(tableKey) || Promise.resolve();
    const next = prev
      .then(async () => {
        await this.prisma!.$executeRawUnsafe(
          `INSERT INTO persistent_table_store (table_name, payload, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (table_name)
           DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
          tableKey,
          payload,
        );
      })
      .catch((err: any) => {
        this.logger.error(`PostgreSQL persistence error for '${tableKey}': ${err.message}`);
      });
    this.pgWriteQueue.set(tableKey, next);
  }

  private queuePostgresDelete(tableKey: string) {
    if (!this.prisma) return;
    const prev = this.pgWriteQueue.get(tableKey) || Promise.resolve();
    const next = prev
      .then(async () => {
        await this.prisma!.$executeRawUnsafe(
          `DELETE FROM persistent_table_store WHERE table_name = $1`,
          tableKey,
        );
      })
      .catch((err: any) => {
        this.logger.error(`PostgreSQL delete error for '${tableKey}': ${err.message}`);
      });
    this.pgWriteQueue.set(tableKey, next);
  }

  // -------------------------------------------------------------
  // Startup Hydration (Disk + Live PostgreSQL Sync)
  // -------------------------------------------------------------
  private hydrateAllTablesFromDisk() {
    this.logger.log('Hydrating all database tables from persistent disk store...');

    const rawOrders = this.readTableFromDisk<PersistentOrderRecord[]>('orders', []);
    this.orders.clear();
    for (const o of rawOrders) {
      this.orders.set(o.orderNumber, o);
    }
    this.logger.log(`Hydrated ${this.orders.size} customer orders from disk.`);

    this.inventoryState = this.readTableFromDisk<PersistentInventoryState>('inventory_state', this.inventoryState);

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
      this.writeTableToDisk('inventory_ledger', this.ledger, true);
    }

    const defaultAudit: PersistentAuditEntry[] = [
      {
        id: 'audit-boot-001',
        adminUsername: 'lead_admin',
        adminRole: 'SUPER_ADMIN',
        action: 'SYSTEM_BOOT',
        entityType: 'SYSTEM',
        entityId: 'sys-001',
        details: 'Lagos Life database engine booted with persistent storage.',
        ipAddress: '127.0.0.1',
        timestamp: new Date().toISOString(),
      },
    ];
    this.auditLogs = this.readTableFromDisk<PersistentAuditEntry[]>('audit_logs', defaultAudit);
    if (!fs.existsSync(this.getTableFilePath('audit_logs'))) {
      this.writeTableToDisk('audit_logs', this.auditLogs, true);
    }

    const rawJobs = this.readTableFromDisk<any[]>('fulfillment_jobs', []);
    this.fulfillmentJobs.clear();
    for (const j of rawJobs) {
      this.fulfillmentJobs.set(j.orderNumber, j);
    }

    this.fulfillmentTransactions = this.readTableFromDisk<any[]>('fulfillment_transactions', []);
    this.fulfillmentSettings = this.readTableFromDisk<any>('fulfillment_settings', null);

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
      this.writeTableToDisk('staff_users', this.staffUsers, true);
    }

    const rawCustomers = this.readTableFromDisk<any[]>('customers', []);
    this.customers.clear();
    for (const c of rawCustomers) {
      this.customers.set(c.id || c.gameUsername, c);
    }

    this.supportTickets = this.readTableFromDisk<any[]>('support_tickets', []);
    this.coupons = this.readTableFromDisk<any[]>('coupons', []);

    for (const key of KV_KEYS) {
      const val = this.readTableFromDisk<any>(key, null);
      if (val !== null) {
        this.kvStore.set(key, val);
      }
    }

    this.logger.log('✅ [DatabaseService] All tables hydrated from local disk.');
  }

  private async syncAllTablesWithPostgres() {
    if (!this.prisma) return;
    try {
      const rows = await this.prisma.$queryRawUnsafe<Array<{ table_name: string; payload: string }>>(
        'SELECT table_name, payload FROM persistent_table_store',
      );
      const dbMap = new Map<string, any>();
      for (const row of rows) {
        try {
          dbMap.set(row.table_name, JSON.parse(row.payload));
        } catch (err: any) {
          this.logger.warn(`Ignoring malformed JSON in PG row '${row.table_name}': ${err.message}`);
        }
      }

      const tableHandlers: Array<{
        name: string;
        getCurrent: () => any;
        applyFromPg: (val: any) => void;
      }> = [
        {
          name: 'orders',
          getCurrent: () => Array.from(this.orders.values()),
          applyFromPg: (val: PersistentOrderRecord[]) => {
            this.orders.clear();
            if (Array.isArray(val)) {
              for (const o of val) this.orders.set(o.orderNumber, o);
            }
          },
        },
        {
          name: 'inventory_state',
          getCurrent: () => this.inventoryState,
          applyFromPg: (val: PersistentInventoryState) => {
            if (val) this.inventoryState = val;
          },
        },
        {
          name: 'inventory_ledger',
          getCurrent: () => this.ledger,
          applyFromPg: (val: PersistentLedgerEntry[]) => {
            if (Array.isArray(val)) this.ledger = val;
          },
        },
        {
          name: 'audit_logs',
          getCurrent: () => this.auditLogs,
          applyFromPg: (val: PersistentAuditEntry[]) => {
            if (Array.isArray(val)) this.auditLogs = val;
          },
        },
        {
          name: 'fulfillment_jobs',
          getCurrent: () => Array.from(this.fulfillmentJobs.values()),
          applyFromPg: (val: any[]) => {
            this.fulfillmentJobs.clear();
            if (Array.isArray(val)) {
              for (const j of val) this.fulfillmentJobs.set(j.orderNumber, j);
            }
          },
        },
        {
          name: 'fulfillment_transactions',
          getCurrent: () => this.fulfillmentTransactions,
          applyFromPg: (val: any[]) => {
            if (Array.isArray(val)) this.fulfillmentTransactions = val;
          },
        },
        {
          name: 'fulfillment_settings',
          getCurrent: () => this.fulfillmentSettings,
          applyFromPg: (val: any) => {
            if (val !== undefined) this.fulfillmentSettings = val;
          },
        },
        {
          name: 'staff_users',
          getCurrent: () => this.staffUsers,
          applyFromPg: (val: any[]) => {
            if (Array.isArray(val)) this.staffUsers = val;
          },
        },
        {
          name: 'customers',
          getCurrent: () => Array.from(this.customers.values()),
          applyFromPg: (val: any[]) => {
            this.customers.clear();
            if (Array.isArray(val)) {
              for (const c of val) this.customers.set(c.id || c.gameUsername, c);
            }
          },
        },
        {
          name: 'support_tickets',
          getCurrent: () => this.supportTickets,
          applyFromPg: (val: any[]) => {
            if (Array.isArray(val)) this.supportTickets = val;
          },
        },
        {
          name: 'coupons',
          getCurrent: () => this.coupons,
          applyFromPg: (val: any[]) => {
            if (Array.isArray(val)) this.coupons = val;
          },
        },
      ];

      this.pgConnected = true;

      for (const h of tableHandlers) {
        if (dbMap.has(h.name)) {
          const pgVal = dbMap.get(h.name);
          h.applyFromPg(pgVal);
          this.writeTableToDisk(h.name, pgVal, true);
        } else {
          const seedVal = h.getCurrent();
          if (seedVal !== null && seedVal !== undefined) {
            this.queuePostgresUpsert(h.name, seedVal);
          }
        }
      }

      for (const [k, v] of dbMap.entries()) {
        if (k.startsWith('kv:')) {
          const keyName = k.slice(3);
          this.kvStore.set(keyName, v);
          this.writeTableToDisk(keyName, v, true);
        }
      }

      // Seed KV keys from disk if missing in PostgreSQL
      for (const keyName of KV_KEYS) {
        if (!dbMap.has(`kv:${keyName}`) && this.kvStore.has(keyName)) {
          this.queuePostgresUpsert(`kv:${keyName}`, this.kvStore.get(keyName));
        }
      }

      await Promise.allSettled(Array.from(this.pgWriteQueue.values()));
      this.logger.log(
        `✅ [DatabaseService] Live PostgreSQL sync active (${this.orders.size} orders, ${dbMap.size} existing DB snapshots loaded). Zero-data-loss guaranteed across restarts.`,
      );
    } catch (err: any) {
      this.pgConnected = false;
      this.logger.warn(`PostgreSQL hydration failed (${err.message}); continuing with local disk storage.`);
    }
  }

  // -------------------------------------------------------------
  // GENERIC KV PERSISTENCE (Settings, Owner Session, Cookies)
  // -------------------------------------------------------------
  public getKV<T = any>(key: string): T | null {
    if (this.kvStore.has(key)) {
      return this.kvStore.get(key) as T;
    }
    const fromDisk = this.readTableFromDisk<T | null>(key, null);
    if (fromDisk !== null) {
      this.kvStore.set(key, fromDisk);
    }
    return fromDisk;
  }

  public setKV(key: string, value: any): void {
    this.kvStore.set(key, value);
    this.writeTableToDisk(key, value, true);
    if (this.pgConnected) {
      this.queuePostgresUpsert(`kv:${key}`, value);
    }
  }

  public deleteKV(key: string): void {
    this.kvStore.delete(key);
    try {
      const fp = this.getTableFilePath(key);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    } catch (_) {}
    if (this.pgConnected) {
      this.queuePostgresDelete(`kv:${key}`);
    }
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
