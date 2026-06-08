'use client';

import { useState } from 'react';

const ITEMS = [
  { q:'Скільки коштує додати сервер на Eyzencore?',
    a:'Базове розміщення сервера у моніторингу — безкоштовно. Преміум-функції (закріплення в топі, розширена аналітика, кастомний банер) доступні в платних тарифах від 99 грн/міс.' },
  { q:'Як працює перевірка онлайну?',
    a:'Ми пінгуємо ваш сервер кожні 60 секунд через офіційний Minecraft Server List Ping протокол. Зберігаємо історію за останні 12 місяців з точністю до хвилини.' },
  { q:'Чи підтримуються Bedrock та модовані сервери?',
    a:'Так. Eyzencore підтримує Java Edition (Vanilla, Paper, Spigot, Forge, Fabric) та Bedrock Edition. Для модованих серверів додатково відображаємо список модів і версію Forge/Fabric.' },
  { q:'Як модерується форум та контент?',
    a:'Кожна нова тема та сервер проходять автоматичну перевірку, після чого підтверджуються модераторами протягом 24 годин. Спільнота може скаржитись на контент кнопкою «Поскаржитись».' },
  { q:'Чи можна перенести свою спільноту з іншої платформи?',
    a:'Так. Ми допомагаємо мігрувати теми форуму, новини та статистику з minecraft-server.eu, namemc та схожих сервісів. Зверніться у підтримку для безкоштовного імпорту.' },
  { q:'Хто стоїть за Eyzencore?',
    a:"Команда українських розробників та активних гравців Minecraft. Платформа з'явилась у 2022 році як реакція на відсутність якісних україномовних рішень для спільноти." },
];

export function FAQ() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" style={{ padding:'100px 0' }}>
      <div className="container">
        <div className="section-head" style={{ textAlign:'center', marginBottom:56, maxWidth:720, marginLeft:'auto', marginRight:'auto' }}>
          <div className="section-tag">FAQ</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px,4vw,48px)', fontWeight:600, letterSpacing:'-0.035em', lineHeight:1.1, margin:'0 0 16px' }}>
            Часті питання
          </h2>
          <p style={{ color:'var(--fg-2)', fontSize:17, maxWidth:580, margin:'0 auto' }}>
            Не знайшли відповіді? Напишіть нам у Discord або на support@eyzencore.com — відповідаємо протягом доби.
          </p>
        </div>

        <div className="faq-list">
          {ITEMS.map((it, i) => (
            <div key={i} className={`faq${open === i ? ' open' : ''}`} onClick={() => setOpen(open === i ? -1 : i)}>
              <div className="faq-q">
                {it.q}
                <span className="plus"/>
              </div>
              <div className="faq-a">
                <div style={{ paddingTop: open === i ? 4 : 0 }}>{it.a}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
