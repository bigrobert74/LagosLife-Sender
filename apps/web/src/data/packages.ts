export interface CurrencyPackage {
  id: string;
  name: string;
  slug: string;
  gameCurrencyAmount: string;
  formattedGameAmount: string;
  nairaPrice: number;
  badge?: string;
  isPopular?: boolean;
  ratePerBillion: number;
}

export const PACKAGES: CurrencyPackage[] = [
  {
    id: 'pkg-1b',
    name: 'Starter Hustle',
    slug: '1b-starter',
    gameCurrencyAmount: '1000000000',
    formattedGameAmount: '1 Billion',
    nairaPrice: 100,
    ratePerBillion: 100,
  },
  {
    id: 'pkg-20b',
    name: 'Mainland Boss',
    slug: '20b-popular',
    gameCurrencyAmount: '20000000000',
    formattedGameAmount: '20 Billion',
    nairaPrice: 500,
    badge: 'POPULAR 🔥',
    isPopular: true,
    ratePerBillion: 25,
  },
  {
    id: 'pkg-50b',
    name: 'Lekki Big Boy',
    slug: '50b-great-value',
    gameCurrencyAmount: '50000000000',
    formattedGameAmount: '50 Billion',
    nairaPrice: 1000,
    badge: 'BEST VALUE ⭐',
    isPopular: true,
    ratePerBillion: 20,
  },
  {
    id: 'pkg-120b',
    name: 'Eko Baller',
    slug: '120b-mega',
    gameCurrencyAmount: '120000000000',
    formattedGameAmount: '120 Billion',
    nairaPrice: 2000,
    badge: 'HOT DEAL',
    ratePerBillion: 16.6,
  },
  {
    id: 'pkg-200b',
    name: 'Banana Island Mogul',
    slug: '200b-high-roller',
    gameCurrencyAmount: '200000000000',
    formattedGameAmount: '200 Billion',
    nairaPrice: 3000,
    badge: 'SAVE 25%',
    ratePerBillion: 15,
  },
  {
    id: 'pkg-500b',
    name: 'Godfather Status',
    slug: '500b-vip-boss',
    gameCurrencyAmount: '500000000000',
    formattedGameAmount: '500 Billion',
    nairaPrice: 5000,
    badge: 'VIP STATUS',
    ratePerBillion: 10,
  },
  {
    id: 'pkg-1t',
    name: '1.0 Trillion Emperor',
    slug: '1t-island-king',
    gameCurrencyAmount: '1000000000000',
    formattedGameAmount: '1.0 Trillion',
    nairaPrice: 8000,
    badge: 'MAX TIER 👑',
    ratePerBillion: 8,
  },
];
