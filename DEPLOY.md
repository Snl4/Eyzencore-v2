# VPS deploy

The production deploy script expects:

- application: `/root/eyzencore-new`
- branch: `main`
- PM2 process: `eyzencore-new`
- port: `3001`

First run:

```bash
cd /root/eyzencore-new
chmod +x deploy.sh
./deploy.sh
```

Every later update:

```bash
cd /root/eyzencore-new && ./deploy.sh
```

Optional overrides:

```bash
PORT=3001 BRANCH=main PM2_APP=eyzencore-new ./deploy.sh
```

The script backs up `.env`, SQLite and `public/uploads`, pulls Git with
fast-forward only, installs dependencies, applies Prisma migrations, checks
TypeScript, builds Next.js, restarts PM2 and checks the local HTTP endpoint.

## News bot

The news bot collects Minecraft/Discord news, rewrites it in Ukrainian, creates
a site news post and sends the same update to a Telegram channel.

Required `.env` values:

```bash
TELEGRAM_BOT_TOKEN=...
TELEGRAM_NEWS_CHANNEL_ID=@your_channel_or_numeric_id
NEWS_BOT_AUTHOR_EMAIL=admin@example.com
```

Recommended for clean Ukrainian rewriting:

```bash
NEWS_BOT_REWRITE_API_KEY=...
NEWS_BOT_REWRITE_MODEL=...
```

Custom sources are optional. Format is `kind|Label|URL`, separated by commas or
new lines:

```bash
NEWS_BOT_SOURCES="rss|Modrinth|https://modrinth.com/news/feed/rss.xml,telegram|Channel|https://t.me/s/channel_name,web|Blog|https://example.com"
```

Supported source kinds: `rss`, `reddit`, `telegram`, `web`, `x`. X usually
needs a public mirror, RSS bridge or API endpoint because the main website is
not reliably fetchable from a server script.

Manual checks:

```bash
cd /root/eyzencore-new
npm run news:bot:dry
npm run news:bot
```

Cron example, every 2 hours:

```bash
crontab -e
0 */2 * * * cd /root/eyzencore-new && /usr/bin/npm run news:bot >> /root/eyzencore-new/logs/news-bot.log 2>&1
```

## Telegram Verification Bot

Long-running Telegram bot for Eyzencore account verification. It only handles
`/start link_...` links generated from user settings.

Required `.env` values:

```bash
TELEGRAM_BOT_TOKEN=...
VITE_TELEGRAM_BOT_USERNAME=EyzenCore_bot
```

`TELEGRAM_BOT_TOKEN` must belong to the same bot username configured as `VITE_TELEGRAM_BOT_USERNAME`.

Run locally or on VPS with PM2:

```bash
npm run telegram:bot
```

```bash
pm2 start npm --name telegram-bot -- run telegram:bot
pm2 save
```

If `/start` gets no reply, check:

```bash
pm2 logs telegram-bot --lines 50
pm2 list
grep -E '^(TELEGRAM_BOT_TOKEN|VITE_TELEGRAM_BOT_USERNAME)=' /root/eyzencore-new/.env
```

If the bot replies 2–4 times to one message, duplicate PM2 processes are running:

```bash
pm2 delete telegram-bot
pm2 start npm --name telegram-bot --cwd /root/eyzencore-new -i 1 -- run telegram:bot
pm2 save
```

