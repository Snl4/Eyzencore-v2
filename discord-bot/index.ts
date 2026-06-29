/**
 * Eyzencore Discord bot - verification (/link) and guild stats sync.
 * Run: npm run discord-bot
 */
import { loadAvatarBotEnv } from '@/lib/avatar-bot/load-env'
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js'

loadAvatarBotEnv()

const token = String(process.env.DISCORD_BOT_TOKEN || '').trim()
const clientId = String(process.env.DISCORD_CLIENT_ID || '').trim()
const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')
const botSecret = String(process.env.DISCORD_BOT_SECRET || '').trim()

if (!token || !clientId || !botSecret) {
  console.error('Missing DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID or DISCORD_BOT_SECRET')
  process.exit(1)
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token)
  const commands = [
    new SlashCommandBuilder()
      .setName('link')
      .setDescription('Привʼязати Discord-сервер до Eyzencore')
      .addStringOption((option) =>
        option.setName('code').setDescription('Код з панелі Eyzencore').setRequired(true)
      )
      .toJSON(),
    new SlashCommandBuilder()
      .setName('online')
      .setDescription('Показати онлайн цього Discord-сервера')
      .toJSON(),
  ]
  await rest.put(Routes.applicationCommands(clientId), { body: commands })
}

async function postVerify(code: string, guildId: string, guildName: string): Promise<{ success?: boolean; serverName?: string; error?: string }> {
  const response = await fetch(`${appUrl}/api/discord/bot/verify`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ code, guildId, guildName }),
  })
  return (await response.json()) as { success?: boolean; serverName?: string; error?: string }
}

async function syncGuild(guildId: string, players: number, max: number, guildName: string): Promise<void> {
  await fetch(`${appUrl}/api/discord/bot/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guilds: [{ guildId, players, max, guildName }] }),
  })
}

async function syncAllGuilds(): Promise<void> {
  const guilds = client.guilds.cache.map((guild) => ({
    guildId: guild.id,
    players: guild.approximatePresenceCount ?? 0,
    max: guild.memberCount ?? 0,
    guildName: guild.name,
  }))
  if (guilds.length === 0) {
    return
  }
  await fetch(`${appUrl}/api/discord/bot/sync`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${botSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ guilds }),
  })
}

client.once('ready', () => {
  console.log(`Discord bot ready as ${client.user?.tag}`)
  void syncAllGuilds()
  setInterval(() => {
    void syncAllGuilds()
  }, 60_000)
})

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return
  }
  if (!interaction.guild) {
    await interaction.reply({
      content: [
        '❌ Команда `/link` працює **на Discord-сервері**, а не в особистих повідомленнях.',
        '',
        '1. Додайте бота EyzenCore на свій Discord-сервер.',
        '2. На каналі сервера виконайте: `/link код:ВАШ_КОД`',
        '3. Код береться з панелі Eyzencore → верифікація сервера.',
      ].join('\n'),
      ephemeral: true,
    })
    return
  }
  if (interaction.commandName === 'link') {
    const code = interaction.options.getString('code', true)
    await interaction.deferReply({ ephemeral: true })
    const result = await postVerify(code, interaction.guild.id, interaction.guild.name)
    if (!result.success) {
      await interaction.editReply(`❌ ${result.error || 'Не вдалося привʼязати сервер'}`)
      return
    }
    await syncGuild(
      interaction.guild.id,
      interaction.guild.approximatePresenceCount ?? 0,
      interaction.guild.memberCount ?? 0,
      interaction.guild.name
    )
    await interaction.editReply(`✅ Сервер **${result.serverName}** привʼязано до Eyzencore!`)
    return
  }
  if (interaction.commandName === 'online') {
    await interaction.reply({
      content: `🟢 Онлайн: **${interaction.guild.approximatePresenceCount ?? 0}** / **${interaction.guild.memberCount ?? 0}** учасників`,
      ephemeral: false,
    })
  }
})

async function start(): Promise<void> {
  await registerCommands()
  await client.login(token)
}

void start()
