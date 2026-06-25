import Link from 'next/link';

export function CTA() {
  return (
    <section style={{ paddingBottom:60 }}>
      <div className="container">
        <div className="cta">
          <div className="cta-grid"/>
          <div className="eyebrow" style={{ marginBottom:24 }}>
            <span className="pill">FREE</span>
            <span>Безкоштовно для авторів серверів</span>
          </div>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:'clamp(34px,4.5vw,54px)', fontWeight:600, letterSpacing:'-0.035em', lineHeight:1.05, margin:'0 0 16px' }}>
            Додайте свій сервер<br/><span className="cta-grad">за дві хвилини</span>
          </h2>
          <p style={{ color:'var(--fg-2)', fontSize:17, maxWidth:520, margin:'0 auto 32px' }}>
            Реєстрація, моніторинг та сторінка сервера - безкоштовно. Без прихованих платежів і реклами.
          </p>
          <div style={{ display:'flex', justifyContent:'center', gap:10, flexWrap:'wrap' }}>
            <Link href="/add-server" className="btn btn-primary btn-lg">
              Додати сервер <span style={{ opacity:.6 }}>→</span>
            </Link>
            <Link href="#" className="btn btn-secondary btn-lg">Зв&apos;язатись із командою</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
