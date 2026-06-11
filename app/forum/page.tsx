import type { Metadata } from 'next';
import { ForumPageClient } from './ForumPageClient';
import { getCurrentUser } from '@/lib/auth-server';
import { getForumHome } from '@/lib/forum-db';

export const metadata: Metadata = {
  title: 'Форум — Eyzencore',
  description: 'Спільнота українських Minecraft-гравців. Гайди, питання, оголошення та технічна підтримка.',
};

export default async function ForumPage() {
  const [initialUser, initialData] = await Promise.all([
    getCurrentUser(),
    getForumHome(),
  ]);
  return (
    <>
      <div className="bg-aurora"/>
      <ForumPageClient initialUser={initialUser} initialData={initialData} />
    </>
  );
}
