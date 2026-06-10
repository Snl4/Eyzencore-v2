import { NextResponse } from 'next/server';
import { listPlatformOnlineHistory, listServers } from '@/lib/auth-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [servers, history] = await Promise.all([
    listServers(),
    listPlatformOnlineHistory(24),
  ]);
  const totalPlayers = servers.reduce((sum, server) => sum + server.players, 0);
  const totalMax = servers.reduce((sum, server) => sum + server.max, 0);

  return NextResponse.json({
    totals: {
      servers: servers.length,
      players: totalPlayers,
      max: totalMax,
      online: servers.filter((server) => server.on).length,
    },
    history: history.map((point) => ({
      t: point.time,
      v: point.players,
    })),
    topServers: [...servers]
      .sort((a, b) => Number(b.on) - Number(a.on) || b.players - a.players || a.rank - b.rank)
      .slice(0, 5)
      .map((server) => ({
      id: server.seed,
      name: server.name,
      players: server.players,
      uptime: server.uptime,
      })),
    updatedAt: new Date().toISOString(),
  });
}
