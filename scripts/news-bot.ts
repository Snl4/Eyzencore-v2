import { runNewsBot } from '@/lib/news-bot'

runNewsBot()
  .then((result) => {
    console.log(`[news-bot] done created=${result.created}`)
  })
  .catch((error) => {
    console.error('[news-bot] failed', error)
    process.exit(1)
  })
