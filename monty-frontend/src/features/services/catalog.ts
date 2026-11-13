import {
  IconBook2,
  IconChartPie,
  IconChefHat,
  IconHeartbeat,
  IconPlane,
  IconShoppingCart,
  IconToolsKitchen2,
  IconWallet,
  type Icon,
} from '@tabler/icons-react';

export interface ServiceDef {
  key: string;
  title: string;
  icon: Icon;
  /** Tile tint; fixed hues so the grid reads the same on every Telegram theme. */
  tint: string;
  to?: string;
  comingSoon?: boolean;
  soonBlurb?: string;
  soonTeaser?: string[];
}

/** Every Monty service, in the order the home grid shows them. */
export const SERVICES: ServiceDef[] = [
  { key: 'budgets', title: 'Бюджеты', icon: IconWallet, tint: '#5b5bd6', to: '/budgets' },
  { key: 'analytics', title: 'Аналитика', icon: IconChartPie, tint: '#2a78d6', to: '/analytics' },
  { key: 'kitchen', title: 'Кухня', icon: IconToolsKitchen2, tint: '#eb6834', to: '/food' },
  { key: 'shopping', title: 'Покупки', icon: IconShoppingCart, tint: '#1baf7a', to: '/food/shopping' },
  { key: 'recipes', title: 'Рецепты', icon: IconChefHat, tint: '#e0a100', to: '/food/recipes' },
  {
    key: 'journal',
    title: 'Дневник',
    icon: IconBook2,
    tint: '#a855f7',
    comingSoon: true,
    soonBlurb: 'Пара строк в день о том, как прошёл день, — Monty напомнит и сохранит.',
    soonTeaser: ['Записи с настроением', 'Напоминание вечером', 'Связь с тратами дня'],
  },
  {
    key: 'health',
    title: 'Здоровье',
    icon: IconHeartbeat,
    tint: '#e5484d',
    comingSoon: true,
    soonBlurb: 'Сон, вода, активность и привычки — всё в одном месте.',
    soonTeaser: ['Дневник самочувствия', 'Цели и streak', 'Умные напоминания'],
  },
  {
    key: 'travel',
    title: 'Путешествия',
    icon: IconPlane,
    tint: '#0ea5e9',
    comingSoon: true,
    soonBlurb: 'Планируйте поездки, бюджет и чек-листы без хаоса в заметках.',
    soonTeaser: ['Маршруты и даты', 'Бюджет на поездку', 'Сборы в дорогу'],
  },
];
