'use client';

import { useEffect, useMemo, useState } from 'react';
import { DISCORD_CATEGORIES, GAME_MODES, SERVER_PLATFORMS, VERSIONS } from '@/lib/data';
import { isDiscordServer } from '@/lib/server-platform';
import type { Server } from '@/lib/types';

type LockedPlatform = 'Minecraft' | 'Discord'
type ServerSort = 'online' | 'rating' | 'newest' | 'oldest'

export function useServerFilter(initialServers: Server[] = [], lockedPlatform?: LockedPlatform) {
  const [platform, setPlatform] = useState(lockedPlatform || 'Всі');
  const [mode, setMode] = useState('Всі');
  const [ver, setVer] = useState('Всі');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<ServerSort>('rating');
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [loading, setLoading] = useState(initialServers.length === 0);

  useEffect(() => {
    if (initialServers.length > 0) return
    async function loadServers() {
      setLoading(true);
      const response = await fetch('/api/servers', { cache: 'no-store' });
      const data = await response.json();
      setServers(data.data || []);
      setLoading(false);
    }

    void loadServers();
  }, [initialServers.length]);

  useEffect(() => {
    if (servers.length === 0) return
    let isMounted = true
    const refreshLiveServers = async () => {
      await Promise.all(servers.map(async (server) => {
        try {
          const response = await fetch('/api/servers/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              addr: server.addr,
              core: server.core || 'java',
              platform: server.platform || 'minecraft',
              serverId: server.seed,
              allowExisting: true,
            }),
          })
          if (!response.ok || !isMounted) return
          const payload = await response.json() as { probe?: { online?: boolean; players?: number; max?: number } }
          const probe = payload.probe
          if (!probe || !isMounted) return
          setServers((current) => current.map((item) => {
            if (item.seed !== server.seed) return item
            return {
              ...item,
              on: Boolean(probe.online),
              players: Number(probe.players || 0),
              max: Number(probe.max || 0),
            }
          }))
        } catch {
          // ignore single server probe errors, keep previous values
        }
      }))
    }
    void refreshLiveServers()
    const intervalId = window.setInterval(() => {
      void refreshLiveServers()
    }, 45000)
    return () => {
      isMounted = false
      window.clearInterval(intervalId)
    }
  }, [servers.length]);

  const filtered = useMemo<Server[]>(() => {
    const visibleServers = servers.filter((server) => {
      const filterPlatform = lockedPlatform || platform
      if (filterPlatform === 'Minecraft' && isDiscordServer(server)) return false
      if (filterPlatform === 'Discord' && !isDiscordServer(server)) return false
      if (mode !== 'Всі' && server.mode !== mode) return false;
      if (ver !== 'Всі' && !server.ver.includes(ver.replace('.x', ''))) return false;
      if (query) {
        const normalized = query.toLowerCase();
        if (!server.name.toLowerCase().includes(normalized) && !server.addr.toLowerCase().includes(normalized)) {
          return false;
        }
      }
      return true;
    });

    return [...visibleServers].sort((left, right) => {
      if (sort === 'online') {
        return (
          Number(right.on) - Number(left.on) ||
          right.players - left.players ||
          Number(right.ratingScore || 0) - Number(left.ratingScore || 0) ||
          left.rank - right.rank
        )
      }
      if (sort === 'newest') {
        return (
          new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime() ||
          left.rank - right.rank
        )
      }
      if (sort === 'oldest') {
        return (
          new Date(left.createdAt || 0).getTime() - new Date(right.createdAt || 0).getTime() ||
          left.rank - right.rank
        )
      }
      return (
        Number(right.ratingScore || 0) - Number(left.ratingScore || 0) ||
        Number(right.averageRating || 0) - Number(left.averageRating || 0) ||
        Number(right.votesCount || 0) - Number(left.votesCount || 0) ||
        Number(right.likesCount || 0) - Number(left.likesCount || 0) ||
        Number(right.reviewsCount || 0) - Number(left.reviewsCount || 0) ||
        left.rank - right.rank
      )
    })
  }, [servers, platform, mode, ver, query, sort, lockedPlatform]);

  const recentVersions = ['Всі', ...VERSIONS.filter((value) => value !== 'Всі').slice(0, 8)]
  const effectivePlatform = lockedPlatform || platform
  const modeOptions = effectivePlatform === 'Discord'
    ? [...DISCORD_CATEGORIES]
    : GAME_MODES

  return {
    filtered,
    loading,
    platform,
    setPlatform,
    mode,
    setMode,
    ver,
    setVer,
    query,
    setQuery,
    sort,
    setSort,
    modes: modeOptions,
    versions: recentVersions,
    platforms: [...SERVER_PLATFORMS],
  };
}
