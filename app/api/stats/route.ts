import { NextResponse } from 'next/server';
import { listServers } from '@/lib/auth-db';

function randomHistory(base: number, points: number) {
  return Array.from({ length: points }, (_, index) => ({
    t: index,
    v: Math.round(base * (0.6 + Math.random() * 0.4)),
  }));
}

export async function GET() {
  const servers = listServers();
  const totalPlayers = servers.reduce((sum, server) => sum + server.players, 0);
  const totalMax = servers.reduce((sum, server) => sum + server.max, 0);

  return NextResponse.json({
    totals: {
      servers: servers.length,
      players: totalPlayers,
      max: totalMax,
      online: servers.filter((server) => server.on).length,
    },
    history: randomHistory(Math.max(totalPlayers, 1), 30),
    topServers: servers.slice(0, 5).map((server) => ({
      id: server.seed,
      name: server.name,
      players: server.players,
      uptime: server.uptime,
    })),
  });
}
