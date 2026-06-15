import { NextResponse } from 'next/server';
import {
  isDiscordInviteAddress,
  normalizeServerAddress,
  probeDiscordInvite,
  type ServerPlatform,
} from '@/lib/discord';
import {
  findServerByAddress,
  getServerById,
  updateServerDiscordGuildId,
  updateServerLiveStatus,
} from '@/lib/auth-db';

function isValidMinecraftAddress(value: string) {
  return /^[a-zA-Z0-9.-]+(?::\d{2,5})?$/.test(value);
}

function normalizeMinecraftProbe(payload: Record<string, unknown>) {
  const playersPayload = (payload.players || {}) as { online?: number; max?: number };
  const motdPayload = (payload.motd || {}) as { clean?: string[] };
  const versionPayload = payload.version as string | {
    name?: string;
    name_clean?: string;
    name_raw?: string;
    protocol?: number;
  } | undefined;
  const motd = Array.isArray(motdPayload.clean) ? motdPayload.clean.join(' ').trim().slice(0, 180) : '';
  const version =
    typeof versionPayload === 'string'
      ? versionPayload.trim()
      : typeof versionPayload === 'object' && versionPayload
        ? String(
            versionPayload.name_clean ||
            versionPayload.name ||
            versionPayload.name_raw ||
            versionPayload.protocol ||
            ''
          ).trim()
        : '';
  return {
    online: Boolean(payload.online),
    players: Number(playersPayload.online || 0),
    max: Number(playersPayload.max || 0),
    version,
    motd,
    ip: String(payload.ip || '').trim(),
    hostname: String(payload.hostname || '').trim(),
  };
}

type MinecraftCore = 'java' | 'bedrock' | 'java_bedrock';

async function fetchProbe(url: string) {
  return fetch(url, {
    cache: 'no-store',
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
}

async function probeMinecraftAddress(normalized: string, core: MinecraftCore) {
  const editions = core === 'java_bedrock' ? ['java', 'bedrock'] : [core];
  const sources = editions.flatMap((edition) => {
    const statusPath = edition === 'bedrock' ? 'bedrock' : 'java';
    const mcsrvPath = edition === 'bedrock' ? 'bedrock/3' : '3';
    return [
      fetchProbe(`https://api.mcstatus.io/v2/status/${statusPath}/${encodeURIComponent(normalized)}`),
      fetchProbe(`https://api.mcsrvstat.us/${mcsrvPath}/${encodeURIComponent(normalized)}`),
    ];
  });
  const responses = await Promise.all(sources);
  const probes: Array<ReturnType<typeof normalizeMinecraftProbe>> = [];
  for (const response of responses) {
    if (!response?.ok) continue;
    const payload = await response.json() as Record<string, unknown>;
    probes.push(normalizeMinecraftProbe(payload));
  }
  const selectedProbe = probes.find((item) => item.online) || probes[0] || {
    online: false,
    players: 0,
    max: 0,
    version: '',
    motd: '',
    ip: '',
    hostname: '',
  };
  const country = selectedProbe.ip
    ? await fetch(`http://ip-api.com/json/${encodeURIComponent(selectedProbe.ip)}?fields=status,country,countryCode`)
        .then(async (response) => {
          if (!response.ok) return '';
          const payload = await response.json() as { status?: string; country?: string; countryCode?: string };
          if (payload.status !== 'success') return '';
          const countryName = String(payload.country || '').trim();
          const countryCode = String(payload.countryCode || '').trim();
          return countryName ? (countryCode ? `${countryName} (${countryCode})` : countryName) : '';
        })
        .catch(() => '')
    : '';
  const serverNameFromHostname = selectedProbe.hostname.split('.')[0] || '';
  return {
    online: selectedProbe.online,
    players: selectedProbe.players,
    max: selectedProbe.max,
    version: selectedProbe.version || '1.21.11',
    name: serverNameFromHostname,
    motd: selectedProbe.motd,
    country,
    ip: selectedProbe.ip,
    platform: 'minecraft' as const,
  };
}

function resolvePlatform(input: {
  platform?: string;
  addr: string;
  core?: string;
}): ServerPlatform {
  if (input.platform === 'discord' || input.core === 'discord') {
    return 'discord';
  }
  if (isDiscordInviteAddress(input.addr)) {
    return 'discord';
  }
  return 'minecraft';
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    addr?: string;
    core?: string;
    platform?: string;
    allowExisting?: boolean;
    serverId?: number;
  };
  const rawAddr = String(body.addr || '').trim();
  const platform = resolvePlatform({ platform: body.platform, addr: rawAddr, core: body.core });
  const core: MinecraftCore =
    body.core === 'bedrock' || body.core === 'java_bedrock' ? body.core : 'java';
  if (!rawAddr) {
    return NextResponse.json({ error: 'Адреса сервера є обовʼязковою' }, { status: 400 });
  }
  let normalized = '';
  try {
    normalized = normalizeServerAddress(rawAddr, platform);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Некоректна адреса';
    return NextResponse.json({ error: message }, { status: 400 });
  }
  if (platform === 'minecraft' && !isValidMinecraftAddress(normalized)) {
    return NextResponse.json({ error: 'Некоректний формат адреси Minecraft-сервера' }, { status: 400 });
  }
  if (!body.allowExisting && await findServerByAddress(normalized, platform)) {
    return NextResponse.json({ error: 'Сервер із цією адресою вже існує' }, { status: 400 });
  }
  try {
    if (platform === 'discord') {
      const existingServer = Number.isFinite(Number(body.serverId))
        ? await getServerById(Number(body.serverId))
        : null;
      const guildId = existingServer?.discordGuildId || null;
      const discordProbe = await probeDiscordInvite(normalized, guildId);
      if (discordProbe.guildId && existingServer && !existingServer.discordGuildId) {
        await updateServerDiscordGuildId(existingServer.seed, discordProbe.guildId);
      }
      return NextResponse.json({
        success: true,
        platform: 'discord',
        probe: {
          online: discordProbe.online,
          players: discordProbe.players,
          max: discordProbe.max,
          version: discordProbe.version,
          name: discordProbe.name,
          motd: discordProbe.motd,
          country: discordProbe.country,
          ip: discordProbe.ip,
          inviteUrl: discordProbe.inviteUrl,
          iconUrl: discordProbe.iconUrl,
          guildId: discordProbe.guildId,
        },
      });
    }
    const minecraftProbe = await probeMinecraftAddress(normalized, core);
    if (Number.isFinite(Number(body.serverId))) {
      await updateServerLiveStatus({
        serverId: Number(body.serverId),
        online: minecraftProbe.online,
        players: minecraftProbe.players,
        max: minecraftProbe.max,
      });
    }
    return NextResponse.json({
      success: true,
      platform: 'minecraft',
      probe: minecraftProbe,
    });
  } catch {
    if (platform === 'discord') {
      return NextResponse.json({
        success: true,
        platform: 'discord',
        probe: {
          online: false,
          players: 0,
          max: 0,
          version: 'Discord',
          name: '',
          motd: '',
          country: '',
          ip: '',
          inviteUrl: '',
          iconUrl: null,
          guildId: null,
        },
      });
    }
    return NextResponse.json({
      success: true,
      platform: 'minecraft',
      probe: { online: false, players: 0, max: 0, version: '1.21.11', name: '', motd: '', country: '', ip: '' },
    });
  }
}
