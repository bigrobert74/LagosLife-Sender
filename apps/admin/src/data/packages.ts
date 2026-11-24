export interface CurrencyPackage {
  id: string;
  name: string;
  tagline: string;
  gameCurrencyAmount: string;
  formattedGameAmount: string;
  nairaPrice: number;
  popular?: boolean;
  featured?: boolean;
  badge?: string;
  bonusPercent?: number;
}

export const PACKAGES: CurrencyPackage[] = [
  {
    id: 'starter-5b',
    name: 'Starter Hustle',
    tagline: 'Ideal for purchasing your first vehicle and starter property.',
    gameCurrencyAmount: '5000000000',
    formattedGameAmount: '5 Billion',
    nairaPrice: 100,
  },
  {
    id: 'hustler-25b',
    name: 'Island Hustler',
    tagline: 'Equip yourself for major business moves and luxury items.',
    gameCurrencyAmount: '25000000000',
    formattedGameAmount: '25 Billion',
    nairaPrice: 500,
  },
  {
    id: 'lekki-50b',
    name: 'Lekki Big Boy',
    tagline: 'Our most popular tier. Dominate the server with serious buying power.',
    gameCurrencyAmount: '50000000000',
    formattedGameAmount: '50 Billion',
    nairaPrice: 1000,
    popular: true,
    badge: 'MOST POPULAR',
  },
  {
    id: 'banana-island-100b',
    name: 'Banana Island Mogul',
    tagline: 'Elite status. Fund organizations, high-end estates, and fleet operations.',
    gameCurrencyAmount: '100000000000',
    formattedGameAmount: '100 Billion',
    nairaPrice: 2000,
    featured: true,
    badge: 'BEST VALUE',
    bonusPercent: 10,
  },
  {
    id: 'godfather-250b',
    name: 'Godfather Whale',
    tagline: 'Maximum financial dominance. Top tier liquidity for high rollers.',
    gameCurrencyAmount: '250000000000',
    formattedGameAmount: '250 Billion',
    nairaPrice: 5000,
    badge: 'WHALE TIER',
    bonusPercent: 20,
  },
];
