import { Icons } from '@/components/ui/Icons';

function LiveStrip() {
  const heights = [40,55,30,70,85,60,90,75,50,95,80,65,88,100,72];
  return (
    <div className="live-strip">
      {heights.map((h,i)=><span key={i} style={{ height:`${h}%` }}/>)}
    </div>
  );
}

function RankList() {
  return (
    <div className="rank-list">
      {[{n:1,name:'MineUkraine',v:'1 247'},{n:2,name:'SkyAtlas',v:'892'},{n:3,name:'Craftia',v:'614'}].map(it=>(
        <div className="rank-item" key={it.n}>
          <span className="num">#{it.n}</span>
          <span className="name">{it.name}</span>
          <span className="val">{it.v}</span>
        </div>
      ))}
    </div>
  );
}

function ForumMini() {
  return (
    <div className="forum-mini">
      {[{t:'Гайд: запуск сервера на Paper 1.21',r:24},{t:'Шукаю команду на survival',r:8}].map((it,i)=>(
        <div className="forum-thread" key={i}>
          <span className="av"/>
          <span className="title">{it.t}</span>
          <span className="reps">{it.r}</span>
        </div>
      ))}
    </div>
  );
}

function ModRow() {
  return (
    <div style={{ display:'flex', gap:8, fontSize:11.5, fontFamily:'var(--font-mono)', color:'var(--fg-2)' }}>
      <span style={{ padding:'4px 10px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:6 }}>
        <span style={{ color:'var(--green)' }}>●</span> 248 verified
      </span>
      <span style={{ padding:'4px 10px', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:6 }}>
        <span style={{ color:'var(--amber)' }}>●</span> 3 review
      </span>
    </div>
  );
}

function NewsMini() {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {[{d:'27 КВТ',t:'Нові метрики ping та TPS у звітах'},{d:'22 КВТ',t:'Підтримка modded-серверів Forge 1.21'}].map((it,i)=>(
        <div key={i} style={{ display:'flex', gap:8, fontSize:12, color:'var(--fg-1)' }}>
          <span style={{ fontFamily:'var(--font-mono)', color:'var(--fg-3)', fontSize:10.5, minWidth:38 }}>{it.d}</span>
          <span>{it.t}</span>
        </div>
      ))}
    </div>
  );
}

function FilterChips() {
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
      {['Survival','1.21.x','UA','PvE','Whitelist'].map(c=>(
        <span key={c} style={{ padding:'3px 9px', fontSize:11.5, fontFamily:'var(--font-mono)', background:'var(--bg-2)', border:'1px solid var(--line)', borderRadius:999, color:'var(--fg-1)' }}>{c}</span>
      ))}
    </div>
  );
}

const FEATURES = [
  { ico:Icons.pulse,  title:'Live-моніторинг 24/7',   desc:'Автоматична перевірка кожні 60 секунд. Історія по годинах, днях і місяцях.',          extra:<LiveStrip/> },
  { ico:Icons.chart,  title:'Рейтинг та статистика',  desc:'Динамічні рейтинги серверів за онлайном, голосами та активністю спільноти.',          extra:<RankList/> },
  { ico:Icons.forum,  title:'Форум зі спільнотою',    desc:'Категорії, гілки, відповіді, голоси. Гравці й автори серверів спілкуються разом.',    extra:<ForumMini/> },
  { ico:Icons.shield, title:'Модерація та безпека',   desc:'Перевірка серверів, антифлуд у форумі та звіти від спільноти.',                       extra:<ModRow/> },
  { ico:Icons.news,   title:'Новини та оновлення',    desc:'Оголошення платформи, гайди по серверах та хроніка змін - все в одній стрічці.',      extra:<NewsMini/> },
  { ico:Icons.search, title:'Пошук та фільтри',       desc:'Знаходьте сервери за версією, режимом, мовою чи країною. Збережені фільтри.',         extra:<FilterChips/> },
];

export function Features() {
  return (
    <section id="features" style={{ padding:'100px 0' }}>
      <div className="container">
        <div className="section-head" style={{ textAlign:'center', marginBottom:56, maxWidth:720, marginLeft:'auto', marginRight:'auto' }}>
          <div className="section-tag">Можливості платформи</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px,4vw,48px)', fontWeight:600, letterSpacing:'-0.035em', lineHeight:1.1, margin:'0 0 16px' }}>
            Все, що потрібно для<br/>ігрової спільноти
          </h2>
          <p style={{ color:'var(--fg-2)', fontSize:17, maxWidth:580, margin:'0 auto' }}>
            Шість потужних модулів, що працюють як єдина екосистема - моніторинг, рейтинги, форум, новини та модерація.
          </p>
        </div>
        <div className="features">
          {FEATURES.map(({ ico, title, desc, extra }) => (
            <div key={title} className="feature">
              <div className="feature-ico">{ico}</div>
              <h3 style={{ fontSize:17, fontWeight:600, letterSpacing:'-0.02em', margin:'0 0 8px' }}>{title}</h3>
              <p style={{ fontSize:14, color:'var(--fg-2)', margin:0, lineHeight:1.55 }}>{desc}</p>
              <div className="feature-extra">{extra}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
