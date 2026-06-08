import { NextResponse } from 'next/server';
import { updateProfile } from '@/lib/auth-db';
import { getCurrentUser } from '@/lib/auth-server';

export const runtime = 'nodejs';

type Body = {
  full_name?: string;
  profile_slug?: string;
  bio?: string;
  location?: string;
  website?: string;
  telegram?: string;
  discord?: string;
  avatar_url?: string | null;
  banner_url?: string | null;
};

export async function POST(request: Request) {
  const user = getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Потрібна авторизація' }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Некоректний JSON' }, { status: 400 });
  }

  try {
    const updatedUser = updateProfile(user.id, {
      full_name: body.full_name,
      profile_slug: body.profile_slug,
      bio: body.bio,
      location: body.location,
      website: body.website,
      telegram: body.telegram,
      discord: body.discord,
      avatar_url: body.avatar_url,
      banner_url: body.banner_url,
    });
    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося оновити профіль';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
