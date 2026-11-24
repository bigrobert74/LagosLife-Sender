import { Injectable } from '@nestjs/common';

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
}

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
  },
];

@Injectable()
export class PackagesService {
  async getAllPackages() {
    // Returns default packages or queries Prisma when database is active
    return FALLBACK_PACKAGES;
  }

  async calculateQuote(packageId?: string, customAmount?: number | string) {
    if (packageId && packageId !== 'custom') {
      const pkg = FALLBACK_PACKAGES.find((p) => p.id === packageId || p.slug === packageId);
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
        // If the number is a small float/int (e.g. 1.5, 2, 5, 10), treat as Trillions
        if (num < 1000) {
          amountBig = BigInt(Math.round(num * 1_000_000_000_000));
        } else {
          amountBig = BigInt(Math.round(num));
        }

        const ONE_TRILLION = 1000000000000n;
        const ONE_BILLION = 1000000000n;

        let nairaPrice = 0;
        let formattedGameAmount = '';

        if (amountBig >= ONE_TRILLION) {
          // Exactly ₦8,000 per 1 Trillion (proportional to 1.0T package @ ₦8,000)
          const billions = Number(amountBig / ONE_BILLION);
          nairaPrice = Math.round(billions * 8);

          const trillions = Number(amountBig) / 1e12;
          formattedGameAmount = Number.isInteger(trillions)
            ? `${trillions} Trillion`
            : `${parseFloat(trillions.toFixed(2))} Trillion`;
        } else {
          const billions = Math.max(1, Math.round(Number(amountBig / ONE_BILLION)));
          nairaPrice = Math.round(billions * 10);
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
