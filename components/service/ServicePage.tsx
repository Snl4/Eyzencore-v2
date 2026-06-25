import Link from 'next/link'
import type { LegalSection } from '@/components/legal/LegalPage'
import { Nav } from '@/components/layout/Nav'
import { Footer } from '@/components/layout/Footer'
import type { ServiceFaqItem, ServiceHowToStep, ServiceRelatedLink } from '@/lib/service-pages'

export function ServicePage({
  eyebrow,
  title,
  description,
  updatedAt,
  intro,
  steps,
  sections,
  faq,
  relatedLinks,
}: {
  eyebrow: string
  title: string
  description: string
  updatedAt: string
  intro?: string
  steps?: ServiceHowToStep[]
  sections?: LegalSection[]
  faq?: ServiceFaqItem[]
  relatedLinks: ServiceRelatedLink[]
}) {
  const navItems = [
    ...(steps?.length ? [{ id: 'steps', label: 'Кроки' }] : []),
    ...(sections?.map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.title,
    })) ?? []),
    ...(faq?.length ? [{ id: 'faq', label: 'Питання' }] : []),
    { id: 'related', label: 'Корисні посилання' },
  ]

  return (
    <>
      <Nav />
      <main className="legal-page service-page">
        <header className="legal-hero">
          <div className="legal-breadcrumbs">
            <Link href="/">Eyzencore</Link>
            <span>/</span>
            <Link href="/service/faq">Довідка</Link>
            <span>/</span>
            <span>{eyebrow}</span>
          </div>
          <span className="legal-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
          <p>{description}</p>
          {intro ? <p className="service-intro">{intro}</p> : null}
          <div className="legal-updated">Останнє оновлення: {updatedAt}</div>
        </header>

        <div className="legal-layout">
          <aside className="legal-nav" aria-label="Зміст сторінки">
            <span>Зміст</span>
            {navItems.map((item) => (
              <a href={`#${item.id}`} key={item.id}>
                {item.label}
              </a>
            ))}
          </aside>

          <article className="legal-document service-document">
            {steps && steps.length > 0 ? (
              <section id="steps" className="service-steps-block">
                <div className="legal-section-number">01</div>
                <div>
                  <h2>Покрокова інструкція</h2>
                  <ol className="service-steps">
                    {steps.map((step, index) => (
                      <li key={step.name}>
                        <strong>
                          {index + 1}. {step.name}
                        </strong>
                        <p>{step.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              </section>
            ) : null}

            {sections?.map((section, index) => (
              <section id={`section-${index + 1}`} key={section.title}>
                <div className="legal-section-number">{String(index + 2).padStart(2, '0')}</div>
                <div>
                  <h2>{section.title}</h2>
                  {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                  {section.items ? (
                    <ul>
                      {section.items.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  ) : null}
                </div>
              </section>
            ))}

            {faq && faq.length > 0 ? (
              <section id="faq" className="service-faq-block">
                <div className="legal-section-number">FAQ</div>
                <div>
                  <h2>Часті питання</h2>
                  <div className="faq-list service-faq-list">
                    {faq.map((item) => (
                      <details key={item.question} className="service-faq-item">
                        <summary className="faq-q">
                          {item.question}
                          <span className="plus" aria-hidden="true" />
                        </summary>
                        <div className="faq-a service-faq-answer">
                          <p>{item.answer}</p>
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section id="related" className="service-related">
              <div className="legal-section-number">→</div>
              <div>
                <h2>Корисні посилання</h2>
                <div className="seo-link-cloud">
                  {relatedLinks.map((link) => (
                    <Link href={link.href} key={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
                <div className="legal-contact">
                  <strong>Потрібна допомога?</strong>
                  <p>
                    Напишіть команді Eyzencore:{' '}
                    <a href="mailto:support@eyzencore.com">support@eyzencore.com</a>
                  </p>
                </div>
              </div>
            </section>
          </article>
        </div>
      </main>
      <Footer />
    </>
  )
}
