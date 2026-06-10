import type { Metadata } from 'next';
import { ForumPageClient } from './ForumPageClient';
import { getCurrentUser } from '@/lib/auth-server';

export const metadata: Metadata = {
  title: 'Форум — Eyzencore',
  description: 'Спільнота українських Minecraft-гравців. Гайди, питання, оголошення та технічна підтримка.',
};

export default async function ForumPage() {
  const initialUser = await getCurrentUser();
  return (
    <>
      <div className="bg-aurora"/>
      <ForumPageClient initialUser={initialUser} />
    </>
  );
}
