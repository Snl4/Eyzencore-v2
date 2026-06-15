export type Theme = 'dark' | 'light';

export type ServerPlatform = 'minecraft' | 'discord';

export interface Server {
  seed: number;
  platform?: ServerPlatform;
  ic: string;
  name: string;
  shortDesc?: string;
  fullDesc?: string;
  desc: string;
  addr: string;
  country?: string;
  motd?: string;
  on: boolean;
  players: number;
  max: number;
  ver: string;
  mode: string;
  core?: 'java' | 'bedrock' | 'java_bedrock' | 'discord';
  uptime: string;
  rank: number;
  ratingScore?: number;
  averageRating?: number;
  votesCount?: number;
  likesCount?: number;
  reviewsCount?: number;
  verified: boolean;
  boosted?: boolean;
  cluster?: number;
  clusterId?: number | null;
  clusterName?: string | null;
  clusterSlug?: string | null;
  tags: string[];
  website?: string;
  discord?: string;
  telegram?: string;
  donate?: string;
  tiktok?: string;
  launcherUrl?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  gallery?: string[];
  videos?: string[];
  ownerId?: string;
  ownerName?: string;
  ownerAvatarUrl?: string | null;
  ownerSlug?: string | null;
  createdAt?: string;
  projectId?: number | null;
  discordGuildId?: string | null;
  discordBotVerified?: boolean;
  discordVerifyCode?: string | null;
}

export interface ForumThread {
  id: number;
  title: string;
  author: string;
  authorColor: string;
  category: string;
  replies: number;
  views: number;
  lastActivity: string;
  pinned?: boolean;
  hot?: boolean;
  solved?: boolean;
}

export interface ForumCategory {
  id: number;
  name: string;
  description: string;
  icon: string;
  color: string;
  threads: number;
  lastActivity: string;
}

export interface BlogPost {
  id: number;
  cat: string;
  date: string;
  read: string;
  title: string;
  desc: string;
  author: string;
  bg: string;
}

export interface StatCard {
  label: string;
  value: string;
  trend?: string;
  up?: boolean;
  good?: boolean;
}
