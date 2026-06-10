import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, createServerApplication, getAuthSessionFromToken, listServers } from '@/lib/auth-db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('mode');
  const version = searchParams.get('version');
  const query = searchParams.get('q');
  const page = Number(searchParams.get('page') ?? 1);
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100);

  let results = await listServers();

  const platform = searchParams.get('platform');
  if (platform === 'minecraft') results = results.filter((server) => server.platform !== 'discord');
  if (platform === 'discord') results = results.filter((server) => server.platform === 'discord');
  if (mode && mode !== 'Всі') results = results.filter((server) => server.mode === mode);
  if (version && version !== 'Всі') {
    const normalizedVersion = version.replace('.x', '');
    results = results.filter((server) => server.ver.includes(normalizedVersion));
  }
  if (query) {
    const normalized = query.toLowerCase();
    results = results.filter((server) =>
      server.name.toLowerCase().includes(normalized) ||
      server.addr.toLowerCase().includes(normalized) ||
      server.desc.toLowerCase().includes(normalized)
    );
  }

  const total = results.length;
  const offset = (page - 1) * limit;
  const data = results.slice(offset, offset + limit);

  return NextResponse.json({ data, total, page, limit, pages: Math.ceil(total / limit) });
}

export async function POST(request: NextRequest) {
  const auth = await getAuthSessionFromToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);
  if (!auth) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      addr?: string;
      platform?: 'minecraft' | 'discord';
      mode?: string;
      ver?: string;
      core?: 'java' | 'bedrock' | 'java_bedrock' | 'discord';
      country?: string;
      motd?: string;
      shortDesc?: string;
      fullDesc?: string;
      desc?: string;
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
      tags?: string[];
      projectId?: number | null;
    };

    const name = String(body.name || '').trim();
    const addr = String(body.addr || '').trim();
    if (!name || !addr) {
      return NextResponse.json({ error: 'Назва та адреса сервера є обовʼязковими' }, { status: 400 });
    }

    const platform = body.platform === 'discord' || body.core === 'discord' ? 'discord' : 'minecraft';
    const { applicationId } = await createServerApplication({
      ownerId: auth.user.id,
      name,
      addr,
      platform,
      mode: String(body.mode || (platform === 'discord' ? 'Community' : 'Survival')),
      ver: String(body.ver || (platform === 'discord' ? 'Discord' : '1.21.11')),
      core: platform === 'discord' ? 'discord' : (body.core === 'bedrock' || body.core === 'java_bedrock' ? body.core : 'java'),
      country: String(body.country || ''),
      motd: String(body.motd || ''),
      shortDesc: String(body.shortDesc || ''),
      fullDesc: String(body.fullDesc || ''),
      desc: String(body.desc || ''),
      website: String(body.website || ''),
      discord: String(body.discord || ''),
      telegram: String(body.telegram || ''),
      donate: String(body.donate || ''),
      tiktok: String(body.tiktok || ''),
      launcherUrl: String(body.launcherUrl || ''),
      avatarUrl: String(body.avatarUrl || ''),
      bannerUrl: String(body.bannerUrl || ''),
      gallery: Array.isArray(body.gallery) ? body.gallery.slice(0, 6) : [],
      videos: Array.isArray(body.videos) ? body.videos.slice(0, 2) : [],
      tags: Array.isArray(body.tags) ? body.tags.slice(0, 6) : [],
      projectId: typeof body.projectId === 'number' ? body.projectId : null,
    });

    return NextResponse.json(
      { pending: true, applicationId, message: 'Заявку відправлено на розгляд адміністратором' },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося створити сервер';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
