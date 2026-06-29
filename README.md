# Eyzencore

[![Made by a Human](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/Snl4/Eyzencore-v2/main/public/made-by-human-stats.json)](https://eyzencore.com)

Український моніторинг Minecraft і Discord серверів: каталог, рейтинг, верифікація, дашборд власника, новини та форум.

**Сайт:** [eyzencore.com](https://eyzencore.com)

## Бейдж «Made by a Human»

Інші проєкти можуть підключити той самий підхід:

1. Скопіюйте `scripts/made-by-human-stats.ts` і `public/made-by-human-stats.json`
2. Додайте workflow `.github/workflows/made-by-human-badge.yml`
3. У README вставте:

```markdown
[![Made by a Human](https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/OWNER/REPO/main/public/made-by-human-stats.json)](https://your-site.com)
```

Скрипт рахує **людино-керовані коміти** (автор не бот). Co-authored трейлери редакторів не знижують відсоток. Мінімум на бейджі: **65%**.

Локально:

```bash
npm run badge:human
```

## Стек

- Next.js 14, TypeScript, Prisma, SQLite
- Discord bot (`npm run discord-bot`)
- Avatar Telegram bot (`npm run avatar:bot`)

## Локальний запуск

```bash
npm ci
cp .env.example .env
npm run db:deploy
npm run dev
```

## Деплой

Див. [DEPLOY.md](./DEPLOY.md)
