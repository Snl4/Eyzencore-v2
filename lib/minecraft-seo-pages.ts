import { isDiscordServer } from '@/lib/server-platform'
import type { Server } from '@/lib/types'

export interface MinecraftSeoFaqItem {
  question: string
  answer: string
}

export interface MinecraftSeoLandingPage {
  slug: string
  title: string
  description: string
  h1: string
  keywords: string[]
  paragraphs: string[]
  faq: MinecraftSeoFaqItem[]
  defaultMode?: string
  defaultVer?: string
  lockMode?: boolean
  lockVer?: boolean
  matchServer: (server: Server) => boolean
}

function normalizeText(value: string): string {
  return String(value || '').trim().toLowerCase()
}

function hasTag(server: Server, ...needles: string[]): boolean {
  const tags = server.tags.map((tag) => normalizeText(tag))
  return needles.some((needle) => tags.some((tag) => tag.includes(normalizeText(needle))))
}

function isMinecraftServer(server: Server): boolean {
  return !isDiscordServer(server)
}

function matchesSurvival(server: Server): boolean {
  const mode = normalizeText(server.mode)
  return mode.includes('survival')
    || mode.includes('вижив')
    || mode.includes('smp')
    || hasTag(server, 'survival', 'виживання', 'smp', 'ваніль', 'vanilla')
}

function matchesBedrock(server: Server): boolean {
  const core = normalizeText(server.core || '')
  const version = normalizeText(server.ver)
  const address = normalizeText(server.addr)
  return core === 'bedrock'
    || core === 'java_bedrock'
    || version.includes('bedrock')
    || address.includes(':19132')
    || hasTag(server, 'bedrock', 'mobile', 'phone', 'телефон')
}

function matchesNoPayToWin(server: Server): boolean {
  return hasTag(server, 'no-p2w', 'no p2w', 'nop2w', 'без донату', 'без-донату', 'fair', 'non-p2w')
    || normalizeText(server.shortDesc || '').includes('без донату')
    || normalizeText(server.fullDesc || '').includes('без донату')
    || normalizeText(server.desc || '').includes('без донату')
}

function matchesUkraine(server: Server): boolean {
  const country = normalizeText(server.country || '')
  const address = normalizeText(server.addr)
  const description = normalizeText(`${server.name} ${server.shortDesc || ''} ${server.fullDesc || ''} ${server.desc || ''}`)
  return country === 'ua'
    || country === 'ukraine'
    || country.includes('укра')
    || address.endsWith('.ua')
    || description.includes('україн')
    || description.includes('ukrain')
    || hasTag(server, 'ukraine', 'ukrainian', 'україна', 'український', 'ua')
}

export const MINECRAFT_SEO_LANDING_PAGES: MinecraftSeoLandingPage[] = [
  {
    slug: 'survival',
    title: 'Українські survival сервери майнкрафт - виживання, SMP, ваніль',
    description:
      'Каталог українських survival серверів майнкрафт: виживання, SMP, ваніль, економіка та приватні світи. Онлайн, рейтинг, голоси, відгуки та IP для швидкого підключення.',
    h1: 'Українські survival сервери майнкрафт',
    keywords: [
      'українські сервера майнкрафт виживання',
      'survival minecraft ukraine',
      'smp сервери україна',
      'ванільні minecraft сервери',
      'minecraft survival server list',
    ],
    paragraphs: [
      'Survival - найпопулярніший формат серед українських гравців Minecraft. Тут важливі економіка, привати, клани, івенти та стабільна спільнота, а не лише PvP чи міні-ігри.',
      'На Eyzencore зібрано українські survival та SMP проєкти з живим онлайном, рейтингом, голосами та відгуками. Порівнюй версії Java і Bedrock, дивись теги режимів і обирай сервер, де комфортно грати щодня.',
      'Для власників survival-серверів доступні сторінка проєкту, статистика, API, callback та інструменти просування в каталозі.',
    ],
    defaultMode: 'Survival',
    lockMode: false,
    faq: [
      {
        question: 'Як обрати survival сервер українською?',
        answer: 'Дивіться онлайн, версію Minecraft, теги режиму, відгуки гравців і рейтинг. Для спокійної гри шукайте no-p2w, ваніль або SMP з активною модерацією.',
      },
      {
        question: 'Чи є українські SMP сервери в каталозі?',
        answer: 'Так, у розділі survival зібрані SMP, виживання, ваніль та суміжні режими з українськими спільнотами.',
      },
    ],
    matchServer: matchesSurvival,
  },
  {
    slug: 'bedrock',
    title: 'Українські Bedrock сервери майнкрафт - для телефону та консолей',
    description:
      'Каталог українських Bedrock серверів майнкрафт для телефону, планшета, Windows і консолей. Онлайн, IP, версії, рейтинг і відгуки гравців.',
    h1: 'Українські Bedrock сервери майнкрафт',
    keywords: [
      'українські сервера майнкрафт на телефон',
      'bedrock minecraft ukraine',
      'minecraft pe сервери україна',
      'minecraft bedrock server list',
      'майнкрафт бедрок сервери',
    ],
    paragraphs: [
      'Bedrock-версія Minecraft підходить для гри на телефоні, планшеті, Windows 10/11 і консолях. Для таких проєктів важливі стабільний IP, актуальна версія та зрозумілий онлайн.',
      'У цьому розділі Eyzencore показує українські Bedrock і cross-play сервери з рейтингом, голосами, відгуками та описом режимів. Можна швидко знайти сервер для мобільної гри або спільного проходження з друзями.',
      'Власники Bedrock-проєктів можуть додати сервер у моніторинг, оновлювати опис, збирати відгуки та відстежувати статистику переходів.',
    ],
    faq: [
      {
        question: 'Як підключитися до Bedrock сервера?',
        answer: 'Скопіюйте IP або invite-адресу зі сторінки сервера, відкрийте Minecraft Bedrock, перейдіть у Play -> Servers -> Add Server і вставте адресу.',
      },
      {
        question: 'Чи показуються тут сервери для телефону?',
        answer: 'Так, у Bedrock-каталозі зібрані проєкти для мобільних пристроїв, консолей і Windows, включно з cross-play серверами.',
      },
    ],
    matchServer: matchesBedrock,
  },
  {
    slug: 'no-p2w',
    title: 'Українські Minecraft сервери без донату - fair play і no-p2w',
    description:
      'Список українських Minecraft серверів без донату та pay-to-win механік. Обирай fair play проєкти з чесним балансом, рейтингом і відгуками гравців.',
    h1: 'Українські Minecraft сервери без донату',
    keywords: [
      'minecraft сервер без донату',
      'no p2w minecraft ukraine',
      'fair play minecraft сервери',
      'українські сервера майнкрафт без донату',
      'non p2w minecraft',
    ],
    paragraphs: [
      'Сервери без донату цікавлять гравців, які хочуть fair play без купівлі переваг за реальні гроші. Такі проєкти часто мають сильнішу довіру, активнішу спільноту та довшу історію.',
      'Eyzencore збирає українські Minecraft сервери з тегами no-p2w, без донату та чесним балансом. Порівнюй онлайн, режим, версію, рейтинг і відгуки перед тим, як обрати постійний проєкт.',
      'Якщо ваш сервер працює без pay-to-win моделі, додайте його в каталог і позначте відповідні теги, щоб гравці швидше знаходили вас у цьому розділі.',
    ],
    faq: [
      {
        question: 'Що означає no-p2w на Minecraft сервері?',
        answer: 'Це сервер без pay-to-win донату, де реальні гроші не дають вирішальної переваги в PvP, економіці або прогресі.',
      },
      {
        question: 'Як додати сервер у розділ без донату?',
        answer: 'Під час оформлення сторінки додайте теги no-p2w або вкажіть у описі, що сервер працює без донату на переваги.',
      },
    ],
    matchServer: matchesNoPayToWin,
  },
  {
    slug: 'ukraine',
    title: 'Українські сервера майнкрафт - каталог проєктів України',
    description:
      'Повний каталог українських серверів майнкрафт: україномовні спільноти, .ua адреси, Survival, SMP, PvP, SkyBlock і Bedrock. Онлайн, рейтинг, голоси та відгуки.',
    h1: 'Українські сервера майнкрафт',
    keywords: [
      'українські сервера майнкрафт',
      'українські minecraft сервери',
      'minecraft servers ukraine',
      'сервери майнкрафт україна',
      'україномовні minecraft сервери',
    ],
    paragraphs: [
      'Українські Minecraft сервери обʼєднують гравців українською мовою, з локальними івентами, знайомими доменами та спільнотами, де зручно спілкуватися без мовного барʼєру.',
      'Eyzencore збирає українські проєкти з різними режимами: Survival, SMP, SkyBlock, PvP, Creative, mini-games, Java і Bedrock. У кожної сторінки є онлайн, рейтинг, голоси, відгуки та швидке копіювання IP.',
      'Якщо ви власник українського сервера, додайте проєкт у каталог, підтвердіть права та отримайте окрему сторінку для просування в пошуку й соцмережах.',
    ],
    faq: [
      {
        question: 'Де знайти українські сервера майнкрафт?',
        answer: 'У цьому розділі Eyzencore зібрано українські Minecraft проєкти з фільтрами за режимом, версією, онлайном і рейтингом.',
      },
      {
        question: 'Чи можна додати свій український сервер?',
        answer: 'Так, базове додавання безкоштовне. Після публікації сервер зʼявиться в каталозі, рейтингу та пошуку Eyzencore.',
      },
    ],
    matchServer: matchesUkraine,
  },
]

export function getMinecraftSeoLandingPage(slug: string): MinecraftSeoLandingPage | null {
  return MINECRAFT_SEO_LANDING_PAGES.find((page) => page.slug === slug) || null
}

export function listMinecraftSeoLandingSlugs(): string[] {
  return MINECRAFT_SEO_LANDING_PAGES.map((page) => page.slug)
}

export function filterMinecraftServers(servers: Server[]): Server[] {
  return servers.filter(isMinecraftServer)
}

export function filterServersForMinecraftSeoPage(servers: Server[], page: MinecraftSeoLandingPage): Server[] {
  return filterMinecraftServers(servers).filter(page.matchServer)
}
