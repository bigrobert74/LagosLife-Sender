import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface DefaultPackage {
  id: string;
  name: string;
  slug: string;
  gameCurrencyAmount: string;
  formattedGameAmount: string;
  nairaPrice: number;
  badge: string | null;
  isPopular: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface PackageSettings {
  ratePerBillion: number;    // ₦ per 1 Billion (custom amount mode)
  minBillions: number;
  maxBillions: number;
}

const DEFAULT_SETTINGS: PackageSettings = {
  ratePerBillion: 4,
  minBillions: 1,
  maxBillions: 1500,
};

export const FALLBACK_PACKAGES: DefaultPackage[] = [
  {
    id: 'pkg-1b',
    name: '1 Billion Starter',
    slug: '1b-starter',
    gameCurrencyAmount: '1000000000',
    formattedGameAmount: '1 Billion',
    nairaPrice: 100,
    badge: null,
    isPopular: false,
    sortOrder: 1,
    isActive: true,
  },
  {
    id: 'pkg-20b',
    name: '20 Billion Popular',
    slug: '20b-popular',
    gameCurrencyAmount: '20000000000',
    formattedGameAmount: '20 Billion',
    nairaPrice: 500,
    badge: 'HOT',
    isPopular: true,
    sortOrder: 2,
    isActive: true,
  },
  {
    id: 'pkg-50b',
    name: '50 Billion Great Value',
    slug: '50b-great-value',
    gameCurrencyAmount: '50000000000',
    formattedGameAmount: '50 Billion',
    nairaPrice: 1000,
    badge: 'BEST VALUE',
    isPopular: true,
    sortOrder: 3,
    isActive: true,
  },
  {
    id: 'pkg-120b',
    name: '120 Billion Mega Deal',
    slug: '120b-mega',
    gameCurrencyAmount: '120000000000',
    formattedGameAmount: '120 Billion',
    nairaPrice: 2000,
    badge: 'SAVE 20%',
    isPopular: false,
    sortOrder: 4,
    isActive: true,
  },
  {
    id: 'pkg-200b',
    name: '200 Billion High Roller',
    slug: '200b-high-roller',
    gameCurrencyAmount: '200000000000',
    formattedGameAmount: '200 Billion',
    nairaPrice: 3000,
    badge: null,
    isPopular: false,
    sortOrder: 5,
    isActive: true,
  },
  {
    id: 'pkg-500b',
    name: '500 Billion VIP Boss',
    slug: '500b-vip-boss',
    gameCurrencyAmount: '500000000000',
    formattedGameAmount: '500 Billion',
    nairaPrice: 5000,
    badge: 'VIP',
    isPopular: false,
    sortOrder: 6,
    isActive: true,
  },
  {
    id: 'pkg-1t',
    name: '1.0 Trillion Island King',
    slug: '1t-island-king',
    gameCurrencyAmount: '1000000000000',
    formattedGameAmount: '1.0 Trillion',
    nairaPrice: 8000,
    badge: 'MAX VALUE',
    isPopular: false,
    sortOrder: 7,
    isActive: true,
  },
];

@Injectable()
export class PackagesService implements OnModuleInit {
  private readonly logger = new Logger(PackagesService.name);
  private packages: DefaultPackage[] = [];
  private settings: PackageSettings = { ...DEFAULT_SETTINGS };

  constructor(private readonly databaseService: DatabaseService) {}

  onModuleInit() {
    this.hydrate();
  }

  private hydrate() {
    const storedPackages = this.databaseService.getPackages();
    if (storedPackages && Array.isArray(storedPackages) && storedPackages.length > 0) {
      this.packages = storedPackages;
      this.logger.log(`[PackagesService] Loaded ${this.packages.length} packages from database.`);
    } else {
      // First boot — seed fallback packages but mark ALL as inactive
      // so admin explicitly decides which ones to publish
      this.packages = FALLBACK_PACKAGES.map((p) => ({ ...p, isActive: false }));
      this.databaseService.savePackages(this.packages);
      this.logger.log(`[PackagesService] Seeded ${this.packages.length} default packages (all inactive — admin must publish).`);
    }

    const storedSettings = this.databaseService.getPackageSettings();
    if (storedSettings) {
      this.settings = { ...DEFAULT_SETTINGS, ...storedSettings };
    }
  }

  // ----------------------------------------------------------------
  // PUBLIC (Storefront) — only active packages
  // ----------------------------------------------------------------
  async getAllPackages(): Promise<DefaultPackage[]> {
    return this.packages
      .filter((p) => p.isActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async getSettings(): Promise<PackageSettings> {
    return { ...this.settings };
  }

  // ----------------------------------------------------------------
  // ADMIN — all packages + CRUD
  // ----------------------------------------------------------------
  async getAdminPackages(): Promise<DefaultPackage[]> {
    return [...this.packages].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  async createPackage(body: {
    name: string;
    gameCurrencyAmount: string;
    nairaPrice: number;
    badge?: string | null;
    isPopular?: boolean;
    isActive?: boolean;
  }): Promise<DefaultPackage> {
    const id = `pkg-${Date.now()}`;
    const amountBig = BigInt(body.gameCurrencyAmount);
    const ONE_TRILLION = 1_000_000_000_000n;
    const ONE_BILLION = 1_000_000_000n;

    let formattedGameAmount = '';
    if (amountBig >= ONE_TRILLION) {
      const t = Number(amountBig) / 1e12;
      formattedGameAmount = Number.isInteger(t) ? `${t} Trillion` : `${parseFloat(t.toFixed(2))} Trillion`;
    } else {
      const b = Math.round(Number(amountBig / ONE_BILLION));
      formattedGameAmount = `${b} Billion`;
    }

    const maxSort = this.packages.reduce((m, p) => Math.max(m, p.sortOrder), 0);
    const slug = body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const newPkg: DefaultPackage = {
      id,
      name: body.name,
      slug,
      gameCurrencyAmount: body.gameCurrencyAmount,
      formattedGameAmount,
      nairaPrice: body.nairaPrice,
      badge: body.badge ?? null,
      isPopular: body.isPopular ?? false,
      sortOrder: maxSort + 1,
      isActive: body.isActive ?? false, // NEW packages start inactive unless explicitly activated
    };

    this.packages.push(newPkg);
    this.databaseService.savePackages(this.packages);
    this.logger.log(`[PackagesService] Created package ${id}: ${newPkg.name} (active=${newPkg.isActive})`);
    return newPkg;
  }

  async updatePackage(
    id: string,
    body: Partial<{
      name: string;
      gameCurrencyAmount: string;
      nairaPrice: number;
      badge: string | null;
      isPopular: boolean;
      isActive: boolean;
      sortOrder: number;
    }>,
  ): Promise<DefaultPackage> {
    const idx = this.packages.findIndex((p) => p.id === id);
    if (idx < 0) {
      throw new Error(`Package ${id} not found`);
    }

    const existing = this.packages[idx];
    const updated: DefaultPackage = { ...existing };

    if (body.name !== undefined) updated.name = body.name;
    if (body.nairaPrice !== undefined) updated.nairaPrice = body.nairaPrice;
    if (body.badge !== undefined) updated.badge = body.badge;
    if (body.isPopular !== undefined) updated.isPopular = body.isPopular;
    if (body.isActive !== undefined) updated.isActive = body.isActive;
    if (body.sortOrder !== undefined) updated.sortOrder = body.sortOrder;

    if (body.gameCurrencyAmount !== undefined) {
      updated.gameCurrencyAmount = body.gameCurrencyAmount;
      const amountBig = BigInt(body.gameCurrencyAmount);
      const ONE_TRILLION = 1_000_000_000_000n;
      const ONE_BILLION = 1_000_000_000n;
      if (amountBig >= ONE_TRILLION) {
        const t = Number(amountBig) / 1e12;
        updated.formattedGameAmount = Number.isInteger(t) ? `${t} Trillion` : `${parseFloat(t.toFixed(2))} Trillion`;
      } else {
        const b = Math.round(Number(amountBig / ONE_BILLION));
        updated.formattedGameAmount = `${b} Billion`;
      }
    }

    this.packages[idx] = updated;
    this.databaseService.savePackages(this.packages);
    this.logger.log(`[PackagesService] Updated package ${id}: active=${updated.isActive}`);
    return updated;
  }

  async deletePackage(id: string): Promise<void> {
    const before = this.packages.length;
    this.packages = this.packages.filter((p) => p.id !== id);
    if (this.packages.length === before) {
      throw new Error(`Package ${id} not found`);
    }
    this.databaseService.savePackages(this.packages);
    this.logger.log(`[PackagesService] Deleted package ${id}`);
  }

  async updateSettings(body: Partial<PackageSettings>): Promise<PackageSettings> {
    this.settings = { ...this.settings, ...body };
    this.databaseService.savePackageSettings(this.settings);
    this.logger.log(`[PackagesService] Updated package settings: ratePerBillion=${this.settings.ratePerBillion}`);
    return { ...this.settings };
  }

  // ----------------------------------------------------------------
  // QUOTE (used by order creation)
  // ----------------------------------------------------------------
  async calculateQuote(packageId?: string, customAmount?: number | string) {
    if (packageId && packageId !== 'custom') {
      const pkg = this.packages.find((p) => p.id === packageId || p.slug === packageId);
      if (pkg) {
        return {
          gameCurrencyAmount: pkg.gameCurrencyAmount,
          formattedGameAmount: pkg.formattedGameAmount,
          nairaPrice: pkg.nairaPrice,
          packageId: pkg.id,
        };
      }
    }

    if (customAmount !== undefined && customAmount !== null && customAmount !== '') {
      const rawVal = typeof customAmount === 'string' ? customAmount.replace(/,/g, '').trim() : customAmount;
      const num = Number(rawVal);
      if (!isNaN(num) && num > 0) {
        let amountBig: bigint;
        if (num < 1000) {
          amountBig = BigInt(Math.round(num * 1_000_000_000_000));
        } else {
          amountBig = BigInt(Math.round(num));
        }

        const ONE_TRILLION = 1000000000000n;
        const ONE_BILLION = 1000000000n;
        const ratePerBillion = this.settings.ratePerBillion;

        let nairaPrice = 0;
        let formattedGameAmount = '';

        if (amountBig >= ONE_TRILLION) {
          const billions = Number(amountBig / ONE_BILLION);
          nairaPrice = Math.round(billions * ratePerBillion);
          const trillions = Number(amountBig) / 1e12;
          formattedGameAmount = Number.isInteger(trillions)
            ? `${trillions} Trillion`
            : `${parseFloat(trillions.toFixed(2))} Trillion`;
        } else {
          const billions = Math.max(1, Math.round(Number(amountBig / ONE_BILLION)));
          nairaPrice = Math.round(billions * ratePerBillion);
          formattedGameAmount = `${billions} Billion`;
        }

        return {
          gameCurrencyAmount: amountBig.toString(),
          formattedGameAmount,
          nairaPrice,
          packageId: 'custom',
        };
      }
    }

    return {
      gameCurrencyAmount: '50000000000',
      formattedGameAmount: '50 Billion',
      nairaPrice: 1000,
      packageId: 'pkg-50b',
    };
  }
}
