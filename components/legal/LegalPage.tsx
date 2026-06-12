import Link from 'next/link'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'

export type LegalSection = {
  title: string
  paragraphs?: string[]
  items?: string[]
}

export function LegalPage({
  eyebrow,
  title,
  description,
  updatedAt,
  sections,
}: {
  eyebrow: string
  title: string
  description: string
  updatedAt: string
  sections: LegalSection[]
}) {
  return (
    <>
      <Nav />
      <main className="legal-page">
        <header className="legal-hero">
          <div className="legal-breadcrumbs">
            <Link href="/">Eyzencore</Link>
            <span>/</span>
            <span>{eyebrow}</span>
          </div>
          <span className="legal-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          <div className="legal-updated">Останнє оновлення: {updatedAt}</div>
        </header>

        <div className="legal-layout">
          <aside className="legal-nav">
            <span>Зміст</span>
            {sections.map((section, index) => (
              <a href={`#section-${index + 1}`} key={section.title}>
                {index + 1}. {section.title}
              </a>
            ))}
          </aside>
          <article className="legal-document">
            {sections.map((section, index) => (
              <section id={`section-${index + 1}`} key={section.title}>
                <div className="legal-section-number">{String(index + 1).padStart(2, '0')}</div>
                <div>
                  <h2>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items && (
                    <ul>
                      {section.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  )}
                </div>
              </section>
            ))}
            <div className="legal-contact">
              <strong>Питання щодо документа</strong>
              <p>Напишіть команді Eyzencore: <a href="mailto:support@eyzencore.com">support@eyzencore.com</a></p>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
