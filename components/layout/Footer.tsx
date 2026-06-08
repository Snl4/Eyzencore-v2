import Link from 'next/link';
import { BrandMark } from '@/components/ui/BrandMark';

const LINKS = {
  platform:  [{ href:'/servers', label:'Каталог серверів' }, { href:'#', label:'Топ онлайну' }, { href:'#', label:'Аналітика' }, { href:'#', label:'Публічне API' }],
  community: [{ href:'/forum',   label:'Форум' }, { href:'#', label:'Новини' }, { href:'#', label:'Гайди' }, { href:'#', label:'Discord' }],
  company:   [{ href:'#', label:'Про нас' }, { href:'#', label:'Контакти' }, { href:'#', label:'Правила' }, { href:'#', label:'Конфіденційність' }],
};

const SOCIALS = ['Discord', 'Telegram', 'GitHub', 'X'] as const;

export function Footer() {
  return (
    <footer className="foot" style={{ paddingTop:64, paddingBottom:40, borderTop:'1px solid var(--line)', marginTop:40 }}>
      <div className="container">
        <div className="foot-grid">
          <div className="foot-brand">
            <Link className="brand" href="/">
              <BrandMark />
              <span>Eyzencore</span>
            </Link>
            <p>Платформа моніторингу Minecraft-серверів для української спільноти. Відстежуйте сервери та розвивайте спільноту.</p>
            <div style={{ display:'flex', gap:8 }}>
              {SOCIALS.map(s => (
                <a key={s} href="#" style={{ width:32, height:32, display:'grid', placeItems:'center', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:8, color:'var(--fg-2)', fontSize:11, fontFamily:'var(--font-mono)' }}>
                  {s[0]}
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4>Платформа</h4>
            <ul>{LINKS.platform.map(l=><li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
          <div>
            <h4>Спільнота</h4>
            <ul>{LINKS.community.map(l=><li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
          <div>
            <h4>Компанія</h4>
            <ul>{LINKS.company.map(l=><li key={l.label}><Link href={l.href}>{l.label}</Link></li>)}</ul>
          </div>
        </div>

        <div className="foot-bottom">
          <span>© 2026 Eyzencore. Зроблено в Україні 🇺🇦</span>
          <div className="right">
            <span>Статус: <span style={{ color:'var(--green)' }}>● працює стабільно</span></span>
            <span>v2.0.4</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
