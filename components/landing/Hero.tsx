'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Icons } from '@/components/ui/Icons';
import { DashboardChart } from '@/components/ui/Chart';

const fade = { hidden:{opacity:0, y:16}, show:{opacity:1, y:0} };

const SIDEBAR_SECTIONS = [
  { label:'Огляд', items:[
    { ico:Icons.dashboard, name:'Дашборд',   active:true,  badge:'' },
    { ico:Icons.servers,   name:'Сервери',   active:false, badge:'248' },
    { ico:Icons.users,     name:'Гравці',    active:false, badge:'12.4k' },
    { ico:Icons.chart,     name:'Аналітика',active:false, badge:'' },
  ]},
  { label:'Спільнота', items:[
    { ico:Icons.forum,  name:'Форум',       active:false, badge:'' },
    { ico:Icons.news,   name:'Новини',      active:false, badge:'' },
    { ico:Icons.pulse,  name:'Активність', active:false, badge:'' },
  ]},
  { label:'Робота', items:[
    { ico:Icons.shield, name:'Модерація',   active:false, badge:'3' },
    { ico:Icons.bell,   name:'Сповіщення', active:false, badge:'' },
  ]},
];

const SERVERS = [
  { ic:'MC', name:'MineUkraine',    addr:'play.mineukraine.ua', on:true,  p:'1 247/2 000' },
  { ic:'SA', name:'SkyAtlas',       addr:'sa.eyzencore.com',    on:true,  p:'892/1 500'   },
  { ic:'CR', name:'Craftia RPG',    addr:'craftia.net',         on:true,  p:'614/1 000'   },
  { ic:'PV', name:'PvP Arena UA',   addr:'pvp.uakraft.com',     on:true,  p:'421/800'     },
  { ic:'BE', name:'BedrockHub',     addr:'bedrock.hub.ua',      on:false, p:'0/500'       },
];

const STATS = [
  { l:'Серверів онлайн', v:'238',    t:'+12 сьогодні', up:true  },
  { l:'Гравців зараз',   v:'14 287', t:'+8.4%',        up:true  },
  { l:'Нові реєстрації', v:'342',    t:'+24%',          up:true  },
  { l:'Час відгуку',     v:'42ms',   t:'-3ms',          up:false, good:true },
];

export function Hero() {
  return (
    <section className="hero" style={{ padding:'88px 0 60px', textAlign:'center', position:'relative' }}>
      <div className="container">
        <motion.div variants={fade} initial="hidden" animate="show" transition={{ delay:0.05 }}>
          <div className="eyebrow">
            <span className="pill">v2.0</span>
            <span>Запущено новий рейтинг та моніторинг наживо</span>
            <span style={{ color:'var(--fg-3)' }}>→</span>
          </div>
        </motion.div>

        <motion.h1
          variants={fade} initial="hidden" animate="show" transition={{ delay:0.1 }}
          style={{ fontFamily:'var(--font-display)', fontSize:'clamp(40px,6.5vw,76px)', fontWeight:600, lineHeight:1.04, letterSpacing:'-0.04em', margin:'0 0 20px', color:'var(--fg)' }}
        >
          Моніторинг<br/>
          Minecraft-серверів<br/>
          <span className="hero-grad">для української спільноти</span>
        </motion.h1>

        <motion.p
          variants={fade} initial="hidden" animate="show" transition={{ delay:0.15 }}
          style={{ maxWidth:620, margin:'0 auto 32px', fontSize:17, color:'var(--fg-2)', lineHeight:1.55 }}
        >
          Eyzencore відстежує онлайн серверів 24/7, веде рейтинги та об&apos;єднує гравців і авторів проєктів у єдиному просторі - з форумом, новинами і прозорою модерацією.
        </motion.p>

        <motion.div
          variants={fade} initial="hidden" animate="show" transition={{ delay:0.2 }}
          className="hero-cta" style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap', marginBottom:56 }}
        >
          <Link href="/auth/register" className="btn btn-primary btn-lg">
            Почати безкоштовно <span style={{ opacity:.6 }}>→</span>
          </Link>
          <Link href="/#demo" className="btn btn-secondary btn-lg">Переглянути платформу</Link>
        </motion.div>
      </div>

      {/* App preview */}
      <div className="container" style={{ maxWidth:1240, padding:'0 16px' }}>
        <motion.div
          variants={fade} initial="hidden" animate="show" transition={{ delay:0.28 }}
          className="preview-frame"
        >
          <div className="preview-chrome">
            <div className="preview-dots"><span/><span/><span/></div>
            <div className="preview-url">app.eyzencore.com / dashboard</div>
            <div style={{ width:48 }}/>
          </div>
          <div className="app">
            {/* Sidebar */}
            <aside className="app-side">
              {SIDEBAR_SECTIONS.map((s, i) => (
                <div key={i}>
                  <div className="side-section">{s.label}</div>
                  {s.items.map((it, j) => (
                    <div key={j} className={`side-item${it.active ? ' active' : ''}`}>
                      <span className="ico">{it.ico}</span>
                      <span>{it.name}</span>
                      {it.badge && <span className="badge">{it.badge}</span>}
                    </div>
                  ))}
                </div>
              ))}
            </aside>
            {/* Main */}
            <div className="app-main">
              <div className="app-topbar">
                <div>
                  <div className="app-crumb">простір / моніторинг</div>
                  <div className="app-title">Дашборд</div>
                </div>
                <div className="app-actions">
                  <button className="btn btn-secondary" style={{ height:30, fontSize:12.5 }}>{Icons.filter} Фільтри</button>
                  <button className="btn btn-primary"   style={{ height:30, fontSize:12.5 }}>{Icons.plus} Додати</button>
                </div>
              </div>
              <div className="stat-row">
                {STATS.map((s, i) => (
                  <div className="stat" key={i}>
                    <div className="stat-label">{s.l}</div>
                    <div className="stat-value">{s.v}</div>
                    <div className={`stat-trend${s.up ? '' : ' down'}`} style={s.good ? { color:'var(--green)' } : undefined}>
                      {s.up ? '▲' : '▼'} {s.t}
                    </div>
                  </div>
                ))}
              </div>
              <div className="app-grid">
                {/* Server list */}
                <div className="panel">
                  <div className="panel-head">Топ серверів<span className="right">оновлено 2 хв тому</span></div>
                  {SERVERS.map((r, i) => (
                    <div className="srv-row" key={i}>
                      <div className="srv-icon">{r.ic}</div>
                      <div className="srv-name"><b>{r.name}</b><span>{r.addr}</span></div>
                      <span className={`srv-status${r.on ? '' : ' off'}`}>
                        <span className="dot"/>{r.on ? 'онлайн' : 'офлайн'}
                      </span>
                      <div className="srv-players">{r.p}</div>
                    </div>
                  ))}
                </div>
                {/* Chart */}
                <div className="panel">
                  <div className="panel-head">Активність за 24 год<span className="right">пік 1 412</span></div>
                  <div className="chart-wrap"><DashboardChart/></div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
