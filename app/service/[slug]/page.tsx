import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ServicePage } from '@/components/service/ServicePage'
import { getServicePage, listServicePageSlugs } from '@/lib/service-pages'
import { breadcrumbJsonLd, buildPageMetadata, faqJsonLd, howToJsonLd } from '@/lib/seo'

type ServicePageParams = {
  slug: string
}

export function generateStaticParams(): ServicePageParams[] {
  return listServicePageSlugs().map((slug) => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<ServicePageParams>
}): Promise<Metadata> {
  const { slug } = await params
  const page = getServicePage(slug)
  if (!page) {
    return { title: 'Сторінку не знайдено' }
  }
  return buildPageMetadata({
    title: page.title,
    description: page.description,
    path: `/service/${page.slug}`,
    keywords: page.keywords,
  })
}

export default async function ServiceSlugPage({
  params,
}: {
  params: Promise<ServicePageParams>
}) {
  const { slug } = await params
  const page = getServicePage(slug)
  if (!page) notFound()

  const jsonLd = [
    breadcrumbJsonLd([
      { name: 'Eyzencore', path: '/' },
      { name: 'Довідка', path: '/service/faq' },
      { name: page.title, path: `/service/${page.slug}` },
    ]),
    ...(page.faq?.length ? [faqJsonLd(page.faq)] : []),
    ...(page.steps?.length
      ? [
          howToJsonLd({
            name: page.title,
            description: page.description,
            path: `/service/${page.slug}`,
            steps: page.steps,
          }),
        ]
      : []),
  ]

  return (
    <>
      {jsonLd.map((entry, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(entry) }}
        />
      ))}
      <ServicePage
        eyebrow={page.eyebrow}
        title={page.title}
        description={page.description}
        updatedAt={page.updatedAt}
        intro={page.intro}
        steps={page.steps}
        sections={page.sections}
        faq={page.faq}
        relatedLinks={page.relatedLinks}
      />
    </>
  )
}
