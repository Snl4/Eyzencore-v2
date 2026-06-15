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
