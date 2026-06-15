import type { ProfileHeaderData } from './ProfileHeader';
import type { ProfileStat } from './ProfileStats';
import type { UserServerCard } from './UserServersTab';
import type { UserForumThread } from './UserForumTab';
import type { UserBadge } from './UserBadgesTab';

export const PROFILE_HEADER: ProfileHeaderData = {
  fullName: 'Андрій Коваленко',
  handle: 'kovalenko_dev',
  bio: 'Адміністратор MineUkraine та CubeBuilder. Розробляю плагіни на Paper, пишу гайди про Minecraft-сервери. 5 років у спільноті.',
  website: 'mineukraine.ua',
  telegram: null,
  discord: null,
  location: 'Київ, Україна',
  followers: 1247,
  joinedAtIso: '2022-03-14T00:00:00.000Z',
  avatarUrl: null,
  bannerUrl: null,
  role: 'OWNER',
  tags: [],
};

export const PROFILE_STATS: ProfileStat[] = [
  { label: 'Серверів',         value: '4',     trend: '+1 цього місяця' },
  { label: 'Тем на форумі',    value: '87',    trend: '+12 цього тижня' },
  { label: 'Карма',            value: '4.8★',  trend: 'на основі 312 голосів' },
  { label: 'Загальний онлайн', value: '2 480', trend: 'на серверах' },
];

export const PROFILE_SERVERS: UserServerCard[] = [
  { seed: 1, ic: 'MC', name: 'MineUkraine',   addr: 'play.mineukraine.ua', online: true, players: 1247, max: 2000, ver: '1.21.1', mode: 'Survival', uptime: '99.9%' },
  { seed: 2, ic: 'CB', name: 'CubeBuilder',   addr: 'cube.builder.ua',     online: true, players: 318,  max: 600,  ver: '1.20.6', mode: 'Creative', uptime: '97.8%' },
  { seed: 3, ic: 'KS', name: 'KingdomSMP',    addr: 'kingdom.smp.ua',      online: true, players: 189,  max: 300,  ver: '1.20.4', mode: 'SMP',      uptime: '98.9%' },
  { seed: 4, ic: 'AN', name: 'Anarchia 24/7', addr: 'anarchia.ua',         online: true, players: 142,  max: 500,  ver: '1.21.1', mode: 'Anarchy',  uptime: '96.2%' },
];

export const PROFILE_FORUM: UserForumThread[] = [
  { title: 'Гайд: запуск сервера на Paper 1.21 з нуля',       category: 'Гайди',      replies: 24, views: 1200, date: '24 КВТ', pinned: true },
  { title: 'Список безкоштовних хостингів для Minecraft 2026', category: 'Гайди',      replies: 18, views: 892,  date: '21 КВТ' },
  { title: 'Як налаштувати анти-чіт на Paper-сервері',         category: 'Технічне',   replies: 12, views: 614,  date: '18 КВТ' },
  { title: 'Що нового в Minecraft 1.21.2 — огляд для адмінів', category: 'Новини',     replies: 8,  views: 421,  date: '15 КВТ' },
  { title: 'Розповідь: як ми побудували MineUkraine',          category: 'Анонси',     replies: 34, views: 2100, date: '10 КВТ' },
];

export const PROFILE_BADGES: UserBadge[] = [
  { name: 'Перший сервер',   description: 'Додав свій перший сервер у моніторинг', emblem: '🏰', earned: true  },
  { name: 'Топ автор',       description: '50+ відповідей у форумі',                emblem: '✦',  earned: true  },
  { name: 'Верифікований',   description: 'Підтверджена особистість',               emblem: '✓',  earned: true  },
  { name: '1000 онлайн',     description: 'Сервер досяг 1000 гравців',              emblem: '★',  earned: true  },
  { name: 'Старожил',        description: '3 роки на платформі',                    emblem: '◆',  earned: true  },
  { name: 'Pro підписник',   description: 'Активна Pro-підписка',                   emblem: '◇',  earned: true  },
  { name: '10k онлайн',      description: 'Сервер досяг 10 000 гравців',            emblem: '☆',  earned: false },
  { name: 'Маратонець',      description: '365 днів безперервної активності',       emblem: '○',  earned: false },
];
