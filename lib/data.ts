import type { BlogPost, ForumCategory, ForumThread } from './types';
import { MINECRAFT_JAVA_VERSIONS } from './minecraft-java-versions';

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
  ...MINECRAFT_JAVA_VERSIONS,
] as const;

export const FORUM_CATEGORIES: ForumCategory[] = [
  { id: 1, name: 'Гайди та туторіали', description: 'Посібники та інструкції від досвідчених гравців', icon: '📚', color: '#7b8cff', threads: 124, lastActivity: '2 хв тому' },
  { id: 2, name: 'Питання гравців', description: 'Допомога та відповіді на питання спільноти', icon: '💬', color: '#a78bfa', threads: 892, lastActivity: '5 хв тому' },
  { id: 3, name: 'Ресурси та Асети', description: 'Корисні матеріали, збірки, плагіни, моди, 3D моделі та асети', icon: '📣', color: '#5eead4', threads: 208, lastActivity: '12 хв тому' },
  { id: 4, name: 'Спілкування та ігри', description: 'Вільне спілкування гравців, враження та обговорення', icon: '🎮', color: '#f43f5e', threads: 145, lastActivity: '8 хв тому' },
  { id: 5, name: 'Технічна підтримка', description: 'Вирішення технічних проблем та помилок', icon: '🔧', color: '#fbbf24', threads: 67, lastActivity: '34 хв тому' },
];

export const FORUM_THREADS: ForumThread[] = [
  { id: 1, title: 'Як налаштувати Paper 1.21 для максимального TPS', author: 'kovalenko_dev', authorColor: '#7b8cff', category: 'Гайди та туторіали', replies: 24, views: 1847, lastActivity: '2 хв тому', pinned: true },
  { id: 2, title: 'Список безкоштовних хостингів для Minecraft-серверів', author: 'serverhunter', authorColor: '#a78bfa', category: 'Гайди та туторіали', replies: 18, views: 2341, lastActivity: '15 хв тому', hot: true },
  { id: 3, title: 'Survival vs RPG: що обрати для нового проєкту?', author: 'minecraft_ua', authorColor: '#5eead4', category: 'Питання гравців', replies: 12, views: 934, lastActivity: '32 хв тому' },
  { id: 4, title: 'Шукаю команду для хардкор-виживання на KingdomSMP', author: 'cyberblade', authorColor: '#f59e0b', category: 'Ресурси та Асети', replies: 9, views: 487, lastActivity: '1 год тому' },
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
    ...(isOwner ? [{
      label: 'Керування',
      items: [
        { ico: 'dashboard', name: 'Дашборд', key: 'dashboard', href: '/dashboard' },
        { ico: 'key', name: 'Для розробників', key: 'developers', href: '/dashboard/developers' },
      ],
    }] : []),
    {
      label: '⛏️ Minecraft',
      items: [
        { ico: 'minecraft', name: 'Сервери', key: 'servers-minecraft', href: '/servers/minecraft' },
        { ico: 'discord', name: 'Discord спільноти', key: 'servers-discord', href: '/servers/discord' },
        { ico: 'folder', name: 'Ресурси & Моди', key: 'resources', href: '/resources' },
      ],
    },
    {
      label: 'Спільнота',
      items: [
        { ico: 'news', name: 'Всі новини', key: 'news', href: '/news' },
        { ico: 'forum', name: 'Форум', key: 'forum', href: '/forum' },
      ],
    },
    {
      label: 'Акаунт',
      items: [
        { ico: 'users', name: 'Профіль', key: 'profile', href: '/profile' },
        { ico: 'shield', name: 'Налаштування', key: 'settings', href: '/settings' },
      ],
    },
  ];
}

export function getDashboardSidebarSections(role: string): SidebarSection[] {
  const normalizedRole = String(role || 'USER').toUpperCase();
  const isOwnerRole = normalizedRole === 'OWNER' || normalizedRole === 'ADMIN';
  return [
    {
      label: 'Керування',
      items: [
        { ico: 'dashboard', name: 'Дашборд', key: 'dashboard', href: '/dashboard' },
        ...(isOwnerRole ? [
          { ico: 'key', name: 'Для розробників', key: 'developers', href: '/dashboard/developers' },
          { ico: 'cluster', name: 'Проєкти серверів', key: 'clusters', href: '/dashboard/clusters' },
        ] : []),
      ],
    },
    {
      label: '⛏️ Minecraft',
      items: [
        { ico: 'minecraft', name: 'Сервери', key: 'servers-minecraft', href: '/servers/minecraft' },
        { ico: 'discord', name: 'Discord', key: 'servers-discord', href: '/servers/discord' },
        { ico: 'folder', name: 'Ресурси & Моди', key: 'resources', href: '/resources' },
      ],
    },
    {
      label: 'Спільнота',
      items: [
        { ico: 'news', name: 'Новини', key: 'news', href: '/news' },
        { ico: 'forum', name: 'Форум', key: 'forum', href: '/forum' },
      ],
    },
    {
      label: 'Акаунт',
      items: [
        { ico: 'users', name: 'Профіль', key: 'profile', href: '/profile' },
        { ico: 'shield', name: 'Налаштування', key: 'settings', href: '/settings' },
      ],
    },
  ];
}
