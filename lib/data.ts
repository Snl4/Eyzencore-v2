import type { BlogPost, ForumCategory, ForumThread } from './types';

type SidebarItem = {
  ico: string
  name: string
  key: string
  href: string | null
  badge?: string
}

type SidebarSection = {
  label: string
  items: SidebarItem[]
}

export const GAME_MODES = ['Всі', 'Survival', 'SkyBlock', 'RPG', 'PvP', 'Creative', 'SMP', 'Hardcore', 'Mini-games'];

export const SERVER_PLATFORMS = ['Всі', 'Minecraft', 'Discord'] as const;

export const DISCORD_CATEGORIES = [
  'Всі',
  'Gaming',
  'Community',
  'Music',
  'Education',
  'Roleplay',
  'Art',
  'Anime',
  'Other',
] as const;
export const VERSIONS = [
  'Всі',
  '1.21.11', '1.21.10', '1.21.9', '1.21.8', '1.21.7', '1.21.6', '1.21.5', '1.21.4', '1.21.3', '1.21.2', '1.21.1', '1.21',
  '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
  '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
  '1.18.2', '1.18.1', '1.18',
  '1.17.1', '1.17',
  '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
  '1.15.2', '1.15.1', '1.15',
  '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
  '1.13.2', '1.13.1', '1.13',
  '1.12.2'
];

export const FORUM_CATEGORIES: ForumCategory[] = [
  { id: 1, name: 'Гайди та туторіали', description: 'Посібники та інструкції від досвідчених гравців', icon: '📚', color: '#7b8cff', threads: 124, lastActivity: '2 хв тому' },
  { id: 2, name: 'Питання гравців', description: 'Допомога та відповіді на питання спільноти', icon: '💬', color: '#a78bfa', threads: 892, lastActivity: '5 хв тому' },
  { id: 3, name: 'Анонси серверів', description: 'Новини та оголошення від власників серверів', icon: '📣', color: '#5eead4', threads: 208, lastActivity: '12 хв тому' },
  { id: 4, name: 'Технічна підтримка', description: 'Вирішення технічних проблем та помилок', icon: '🔧', color: '#fbbf24', threads: 67, lastActivity: '34 хв тому' },
];

export const FORUM_THREADS: ForumThread[] = [
  { id: 1, title: 'Як налаштувати Paper 1.21 для максимального TPS', author: 'kovalenko_dev', authorColor: '#7b8cff', category: 'Гайди та туторіали', replies: 24, views: 1847, lastActivity: '2 хв тому', pinned: true },
  { id: 2, title: 'Список безкоштовних хостингів для Minecraft-серверів', author: 'serverhunter', authorColor: '#a78bfa', category: 'Гайди та туторіали', replies: 18, views: 2341, lastActivity: '15 хв тому', hot: true },
  { id: 3, title: 'Survival vs RPG: що обрати для нового проєкту?', author: 'minecraft_ua', authorColor: '#5eead4', category: 'Питання гравців', replies: 12, views: 934, lastActivity: '32 хв тому' },
  { id: 4, title: 'Шукаю команду для хардкор-виживання на KingdomSMP', author: 'cyberblade', authorColor: '#f59e0b', category: 'Анонси серверів', replies: 9, views: 487, lastActivity: '1 год тому' },
  { id: 5, title: '[ВИРІШЕНО] Чому сервер не відображається в Eyzencore?', author: 'newbie_craft', authorColor: '#34d399', category: 'Технічна підтримка', replies: 5, views: 312, lastActivity: '2 год тому', solved: true },
  { id: 6, title: 'Гайд: запуск сервера на Fabric 1.21 + Lithium + Starlight', author: 'fabrice_ua', authorColor: '#7b8cff', category: 'Гайди та туторіали', replies: 31, views: 3102, lastActivity: '3 год тому', hot: true },
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 1,
    cat: 'Гайд',
    date: '25 КВТ',
    read: '8 хв',
    title: 'Як обрати сервер для першого Survival-проєкту',
    desc: 'Розбираємо ключові критерії: версія, тип геймплею, розмір спільноти та продуктивність.',
    author: 'Андрій Коваленко',
    bg: 'linear-gradient(135deg, #1a1f2e 0%, #2a1f4a 100%)',
  },
  {
    id: 2,
    cat: 'Новини',
    date: '22 КВТ',
    read: '3 хв',
    title: 'Eyzencore 2.0: новий live-моніторинг та публічний API',
    desc: 'Новий рушій перевірки онлайна працює швидше та готовий до інтеграцій.',
    author: 'Команда Eyzencore',
    bg: 'linear-gradient(135deg, #0f1729 0%, #1a3a5a 100%)',
  },
  {
    id: 3,
    cat: 'Технічне',
    date: '18 КВТ',
    read: '12 хв',
    title: 'Paper vs Spigot vs Purpur у 2026: бенчмарки',
    desc: 'Порівнюємо три популярні форки серверного ядра на різних навантаженнях.',
    author: 'Микита Петренко',
    bg: 'linear-gradient(135deg, #0d1f1d 0%, #1a4a3a 100%)',
  },
];

export function getSidebarSections(isOwner = false): SidebarSection[] {
  return [
    { label: 'Огляд', items: [
      ...(isOwner ? [
        { ico: 'dashboard', name: 'Дашборд', key: 'dashboard', href: '/dashboard' },
      ] : []),
      { ico: 'minecraft', name: 'Minecraft', key: 'servers-minecraft', href: '/servers/minecraft' },
      { ico: 'discord', name: 'Discord', key: 'servers-discord', href: '/servers/discord' },
      { ico: 'news', name: 'Новини', key: 'news', href: '/news' },
      ...(isOwner ? [
        { ico: 'key', name: 'Для розробників', key: 'developers', href: '/dashboard/developers' },
      ] : []),
    ] },
    { label: 'Спільнота', items: [
      { ico: 'forum', name: 'Форум', key: 'forum', href: '/forum', badge: '1.2k' },
    ] },
    { label: 'Акаунт', items: [
      { ico: 'users', name: 'Профіль', key: 'profile', href: '/profile' },
      { ico: 'shield', name: 'Налаштування', key: 'settings', href: '/settings' },
    ] },
  ];
}

export function getDashboardSidebarSections(role: string): SidebarSection[] {
  const normalizedRole = String(role || 'USER').toUpperCase();
  const isOwnerRole = normalizedRole === 'OWNER' || normalizedRole === 'ADMIN';
  return [
    {
      label: 'Огляд',
      items: [
        { ico: 'dashboard', name: 'Дашборд', key: 'dashboard', href: '/dashboard' },
        { ico: 'minecraft', name: 'Minecraft', key: 'servers-minecraft', href: '/servers/minecraft' },
        { ico: 'discord', name: 'Discord', key: 'servers-discord', href: '/servers/discord' },
        { ico: 'news', name: 'Новини', key: 'news', href: '/news' },
        { ico: 'key', name: 'Для розробників', key: 'developers', href: '/dashboard/developers' },
        ...(isOwnerRole ? [
          { ico: 'chart', name: 'Мої сервери', key: 'my-servers', href: '/dashboard?tab=servers' },
          { ico: 'cluster', name: 'Кластери', key: 'clusters', href: '/dashboard/clusters' },
        ] : []),
      ],
    },
    {
      label: 'Акаунт',
      items: [
        { ico: 'users', name: 'Профіль', key: 'profile', href: '/profile' },
        { ico: 'bell', name: 'Сповіщення', key: 'notifications', href: '/settings#notifications' },
      ],
    },
  ];
}
