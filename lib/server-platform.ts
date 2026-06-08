import type { Server } from '@/lib/types'

export function isDiscordServer(server: Pick<Server, 'platform' | 'core'>): boolean {
  return server.platform === 'discord' || server.core === 'discord'
}

export function getServerPlatformLabel(server: Pick<Server, 'platform' | 'core'>): string {
  return isDiscordServer(server) ? 'Discord' : 'Minecraft'
}

export function getOnlineCountLabel(server: Pick<Server, 'platform' | 'core'>): string {
  return isDiscordServer(server) ? 'Онлайн' : 'Гравці'
}

export function getMaxCountLabel(server: Pick<Server, 'platform' | 'core'>): string {
  return isDiscordServer(server) ? 'Учасники' : 'Слоти'
}

export function getAddressLabel(server: Pick<Server, 'platform' | 'core'>): string {
  return isDiscordServer(server) ? 'Інвайт' : 'IP-адреса'
}
