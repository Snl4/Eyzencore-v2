'use client';

import { useState } from 'react';
import { Icons } from '@/components/ui/Icons';
import { BigChart } from '@/components/ui/Chart';

type Tab = 'servers' | 'forum' | 'analytics';

const DEMO_SERVERS = [
  { ic:'MC', name:'MineUkraine',   addr:'play.mineukraine.ua', on:true,  p:'1 247/2 000', ver:'1.21.1', mode:'Survival'  },
  { ic:'SA', name:'SkyAtlas',      addr:'sa.eyzencore.com',    on:true,  p:'892/1 500',   ver:'1.21.1', mode:'Survival'  },
  { ic:'CR', name:'Craftia RPG',   addr:'craftia.net',         on:true,  p:'614/1 000',   ver:'1.20.4', mode:'RPG'       },
  { ic:'PV', name:'PvP Arena UA',  addr:'pvp.uakraft.com',     on:true,  p:'421/800',     ver:'1.21.1', mode:'PvP'       },
  { ic:'CB', name:'CubeBuilder',   addr:'cube.builder.ua',     on:true,  p:'318/600',     ver:'1.20.6', mode:'Creative'  },
  { ic:'BE', name:'BedrockHub',    addr:'bedrock.hub.ua',      on:false, p:'0/500',       ver:'1.21',   mode:'Mini-games'},
];

const FORUM_CATS = [
  { n:'Гайди та туторіали',  t:124, p:'2 хв тому'  },
  { n:'Питання гравців',      t:892, p:'5 хв тому'  },
  { n:'Анонси серверів',      t:208, p:'12 хв тому' },
  { n:'Технічна підтримка',   t:67,  p:'34 хв тому' },
];

const FORUM_THREADS = [
  { av:'#7b8cff', t:'Як налаштувати Paper 1.21',          a:'kovalenko_dev', r:'24 відповіді'  },
  { av:'#a78bfa', t:'Список безкоштовних хостингів',       a:'serverhunter',  r:'18 відповідей' },
  { av:'#5eead4', t:'Survival vs RPG: що обрати?',         a:'minecraft_ua',  r:'12 відповідей' },
  { av:'#f59e0b', t:'Шукаю команду на хардкор',           a:'cyberblade',    r:'9 відповідей'  },
];

const ANALYTICS_STATS = [
  { l:'Унікальних гравців', v:'24 891' },
  { l:'Загальний uptime',    v:'99.7%'  },
  { l:'Середня сесія',       v:'47хв'   },
  { l:'Зростання тижня',    v:'+18.2%' },
];

function DemoSidebar() {
  const items = [
    { ico:Icons.dashboard, name:'Дашборд',    active:false },
    { ico:Icons.servers,   name:'Сервери',    active:false },
    { ico:Icons.users,     name:'Гравці',     active:false },
    { ico:Icons.chart,     name:'Аналітика', active:false },
  ];
  return (
    <aside className="app-side">
      <div className="side-section">Огляд</div>
      {items.map((it, i) => (
        <div key={i} className={`side-item${it.active ? ' active' : ''}`}>
          <span className="ico">{it.ico}</span>
          <span>{it.name}</span>
        </div>
      ))}
    </aside>
  );
}

export function Demo() {
  const [tab, setTab] = useState<Tab>('servers');

  return (
    <section id="demo" style={{ padding:'0 0 100px' }}>
      <div className="container">
        <div className="section-head" style={{ textAlign:'center', marginBottom:56, maxWidth:720, marginLeft:'auto', marginRight:'auto' }}>
          <div className="section-tag">Платформа всередині</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px,4vw,48px)', fontWeight:600, letterSpacing:'-0.035em', lineHeight:1.1, margin:'0 0 16px' }}>
            Один інтерфейс<br/>для всієї спільноти
          </h2>
          <p style={{ color:'var(--fg-2)', fontSize:17, maxWidth:580, margin:'0 auto' }}>
            Швидкий, чистий і темний за замовчуванням. Створено для авторів серверів та активних гравців.
          </p>
        </div>
        <div className="tabs">
          {(['servers','forum','analytics'] as Tab[]).map(t => (
            <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {{ servers:'Сервери', forum:'Форум', analytics:'Аналітика' }[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="container" style={{ maxWidth:1240, padding:'0 16px' }}>
        <div className="preview-frame">
          <div className="preview-chrome">
            <div className="preview-dots"><span/><span/><span/></div>
            <div className="preview-url">app.eyzencore.com / {tab}</div>
            <div style={{ width:48 }}/>
          </div>
          <div className="app">
            <DemoSidebar/>
            {tab === 'servers'    && <ServersView/>}
            {tab === 'forum'      && <ForumView/>}
            {tab === 'analytics'  && <AnalyticsView/>}
          </div>
        </div>
      </div>
    </section>
  );
}

function ServersView() {
  return (
    <div className="app-main">
      <div className="app-topbar">
        <div>
          <div className="app-crumb">простір / сервери</div>
          <div className="app-title">Каталог серверів</div>
        </div>
        <div className="app-actions">
          <button className="btn btn-secondary" style={{ height:30, fontSize:12.5 }}>{Icons.filter} Версія: всі</button>
          <button className="btn btn-secondary" style={{ height:30, fontSize:12.5 }}>{Icons.filter} Режим</button>
          <button className="btn btn-primary"   style={{ height:30, fontSize:12.5 }}>{Icons.plus} Додати</button>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head">Всі сервери<span className="right">248 серверів · сортувати: онлайн ↓</span></div>
        {DEMO_SERVERS.map((r, i) => (
          <div key={i} style={{ display:'grid', gridTemplateColumns:'auto 1fr auto auto auto', gap:12, alignItems:'center', padding:'10px 14px', borderBottom:i<DEMO_SERVERS.length-1?'1px solid var(--line-2)':undefined, fontSize:13 }}>
            <div className="srv-icon">{r.ic}</div>
            <div className="srv-name"><b>{r.name}</b><span>{r.addr}</span></div>
            <span style={{ padding:'2px 8px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:5, fontSize:11, fontFamily:'var(--font-mono)', color:'var(--fg-2)' }}>{r.ver}</span>
            <span style={{ fontSize:11.5, color:'var(--fg-2)' }}>{r.mode}</span>
            <span className={`srv-status${r.on?'':' off'}`}><span className="dot"/>{r.on ? r.p : 'офлайн'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForumView() {
  return (
    <div className="app-main">
      <div className="app-topbar">
        <div><div className="app-crumb">простір / форум</div><div className="app-title">Форум спільноти</div></div>
        <div className="app-actions">
          <button className="btn btn-primary" style={{ height:30, fontSize:12.5 }}>{Icons.plus} Нова тема</button>
        </div>
      </div>
      <div className="app-grid">
        <div className="panel">
          <div className="panel-head">Категорії<span className="right">4 розділи</span></div>
          {FORUM_CATS.map((c, i) => (
            <div key={i} style={{ padding:14, borderBottom:i<FORUM_CATS.length-1?'1px solid var(--line-2)':undefined, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:32, height:32, borderRadius:7, background:'var(--bg-2)', border:'1px solid var(--line)', display:'grid', placeItems:'center', color:'var(--accent)' }}>{Icons.forum}</div>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13.5, fontWeight:500 }}>{c.n}</div>
                <div style={{ fontSize:11.5, color:'var(--fg-3)', fontFamily:'var(--font-mono)' }}>{c.t} тем · остання: {c.p}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="panel">
          <div className="panel-head">Активні зараз<span className="right">наживо</span></div>
          {FORUM_THREADS.map((th, i) => (
            <div key={i} style={{ padding:'12px 14px', borderBottom:i<3?'1px solid var(--line-2)':undefined, display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:24, height:24, borderRadius:5, background:th.av }}/>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13, fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{th.t}</div>
                <div style={{ fontSize:11, color:'var(--fg-3)', fontFamily:'var(--font-mono)' }}>@{th.a} · {th.r}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function AnalyticsView() {
  return (
    <div className="app-main">
      <div className="app-topbar">
        <div><div className="app-crumb">простір / аналітика</div><div className="app-title">Аналітика серверів</div></div>
      </div>
      <div className="stat-row">
        {ANALYTICS_STATS.map((s,i)=>(
          <div className="stat" key={i}><div className="stat-label">{s.l}</div><div className="stat-value">{s.v}</div></div>
        ))}
      </div>
      <div className="panel">
        <div className="panel-head">Онлайн: тренд за 30 днів<span className="right">пік: 14 287</span></div>
        <div style={{ padding:16 }}><BigChart/></div>
      </div>
    </div>
  );
}
