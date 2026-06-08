import type { Metadata } from 'next';
import { Nav } from '@/components/layout/Nav';
import { Footer } from '@/components/layout/Footer';
import { Hero } from '@/components/landing/Hero';
import { Features } from '@/components/landing/Features';
import { Demo } from '@/components/landing/Demo';
import { FAQ } from '@/components/landing/FAQ';
import { Blog } from '@/components/landing/Blog';
import { CTA } from '@/components/landing/CTA';

export const metadata: Metadata = {
  title: 'Eyzencore — Моніторинг Minecraft-серверів',
  description: 'Платформа моніторингу Minecraft-серверів для української спільноти. Відстежуй сервери, читай форум, знаходь гравців.',
};

export default function LandingPage() {
  return (
    <>
      <div className="bg-aurora"/>
      <div className="bg-grid"/>
      <Nav/>
      <main style={{ position:'relative', zIndex:1 }}>
        <Hero/>
        <Features/>
        <Demo/>
        <FAQ/>
        <Blog/>
        <CTA/>
      </main>
      <Footer/>
    </>
  );
}
