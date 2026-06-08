import { BLOG_POSTS } from '@/lib/data';

function ThumbDecor({ i }: { i: number }) {
  if (i === 0) return (
    <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      <g opacity="0.6">
        {Array.from({length:6}).map((_,r)=>Array.from({length:12}).map((_,c)=>(
          <rect key={`${r}-${c}`} x={c*28+(r%2?14:0)} y={r*28} width="24" height="24" rx="4"
                fill={(r+c)%3===0?'#7b8cff':'rgba(255,255,255,0.08)'} opacity={(r+c)%4===0?0.8:0.3}/>
        )))}
      </g>
    </svg>
  );
  if (i === 1) return (
    <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      <defs><linearGradient id="th2g" x1="0" x2="1"><stop offset="0" stopColor="#7b8cff"/><stop offset="1" stopColor="#a78bfa"/></linearGradient></defs>
      <path d="M0 110 Q 80 60, 160 80 T 320 50 L 320 160 L 0 160 Z" fill="url(#th2g)" opacity="0.4"/>
      <path d="M0 110 Q 80 60, 160 80 T 320 50" stroke="url(#th2g)" strokeWidth="2" fill="none"/>
      <text x="20" y="40" fill="#fff" fontSize="14" fontFamily="monospace" opacity="0.8">v2.0 →</text>
    </svg>
  );
  return (
    <svg width="100%" height="100%" viewBox="0 0 320 160" preserveAspectRatio="xMidYMid slice">
      <g fontFamily="monospace" fontSize="11" fill="#5eead4" opacity="0.7">
        <text x="20" y="30">$ benchmark --tps</text>
        <text x="20" y="50" opacity="0.5">→ paper: 19.8</text>
        <text x="20" y="70" opacity="0.5">→ spigot: 18.2</text>
        <text x="20" y="90" opacity="0.5">→ purpur: 19.9</text>
        <rect x="20" y="105" width="200" height="6" rx="3" fill="rgba(255,255,255,0.1)"/>
        <rect x="20" y="105" width="180" height="6" rx="3" fill="#5eead4"/>
      </g>
    </svg>
  );
}

export function Blog() {
  return (
    <section id="blog" style={{ padding:'100px 0' }}>
      <div className="container">
        <div className="section-head" style={{ textAlign:'center', marginBottom:56, maxWidth:720, marginLeft:'auto', marginRight:'auto' }}>
          <div className="section-tag">Спільнота та ресурси</div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(32px,4vw,48px)', fontWeight:600, letterSpacing:'-0.035em', lineHeight:1.1, margin:'0 0 16px' }}>
            З блогу Eyzencore
          </h2>
          <p style={{ color:'var(--fg-2)', fontSize:17, maxWidth:580, margin:'0 auto' }}>
            Гайди, оновлення та матеріали від команди й активних авторів.
          </p>
        </div>

        <div className="blog-grid">
          {BLOG_POSTS.map((p, i) => (
            <article className="blog-card" key={p.id}>
              <div className="blog-thumb" style={{ background:p.bg }}>
                <ThumbDecor i={i}/>
              </div>
              <div className="blog-meta">
                <span className="cat">{p.cat}</span>
                <span>{p.date}</span>
                <span>·</span>
                <span>{p.read}</span>
              </div>
              <h3>{p.title}</h3>
              <p>{p.desc}</p>
              <div className="blog-foot">
                <span className="av"/>
                <span>{p.author}</span>
                <span style={{ marginLeft:'auto', color:'var(--accent)' }}>читати →</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
