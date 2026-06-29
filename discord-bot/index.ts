/**
 * Eyzencore Discord bot - verification (/link) and guild stats sync.
 * Run: npm run discord-bot
 */
import { loadAvatarBotEnv } from '@/lib/avatar-bot/load-env'
import {
  ActionRowBuilder,
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  type ChatInputCommandInteraction,
  type Guild,
  type StringSelectMenuInteraction,
} from 'discord.js'

loadAvatarBotEnv()

const token = String(process.env.DISCORD_BOT_TOKEN || '').trim()
const clientId = String(process.env.DISCORD_CLIENT_ID || '').trim()
const appUrl = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000').trim().replace(/\/$/, '')
const botSecret = String(process.env.DISCORD_BOT_SECRET || '').trim()
const linkSelectPrefix = 'eyzencore:link:'

if (!token || !clientId || !botSecret) {
  console.error('Missing DISCORD_BOT_TOKEN, DISCORD_CLIENT_ID or DISCORD_BOT_SECRET')
  process.exit(1)
}

console.log(`Discord bot API: ${appUrl}`)

const client = new Client({ intents: [GatewayIntentBits.Guilds] })

type LinkableGuild = {
  id: string
  name: string
  players: number
  max: number
}

async function registerCommands(): Promise<void> {
  const rest = new REST({ version: '10' }).setToken(token)
  const commands = [
    new SlashCommandBuilder()
      .setName('link')
      .setDescription('Привʼязати Discord-сервер до Eyzencore')
      .addStringOption((option) =>
        option.setName('code').setDescription('Код з панелі Eyzencore').setRequired(true)
      )
      .addStringOption((option) =>
        option
          .setName('guild_id')
          .setDescription('ID Discord-сервера (опційно в ЛС, якщо їх кілька)')
          .setRequired(false)
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
  const payload = (await response.json()) as { success?: boolean; serverName?: string; error?: string }
  if (response.status === 401) {
    return {
      error: 'Секрет бота не збігається з сайтом. Перевірте, що DISCORD_BOT_SECRET однаковий у .env бота і сайту, потім перезапустіть обидва процеси.',
    }
  }
  if (!response.ok) {
    return { error: payload.error || `Помилка API (${response.status})` }
  }
  return payload
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

async function userCanManageGuild(guild: Guild, userId: string): Promise<boolean> {
  if (guild.ownerId === userId) {
    return true
  }
  try {
    const member = await guild.members.fetch(userId)
    return member.permissions.has(PermissionFlagsBits.Administrator)
      || member.permissions.has(PermissionFlagsBits.ManageGuild)
  } catch {
    return false
  }
}

async function listManageableGuilds(userId: string): Promise<LinkableGuild[]> {
  const guilds = await Promise.all(
    client.guilds.cache.map(async (guild) => {
      const canManage = await userCanManageGuild(guild, userId)
      if (!canManage) {
        return null
      }
      return {
        id: guild.id,
        name: guild.name,
        players: guild.approximatePresenceCount ?? 0,
        max: guild.memberCount ?? 0,
      }
    })
  )
  return guilds.filter((guild): guild is LinkableGuild => guild !== null)
}

function mapGuildSnapshot(guild: Guild): LinkableGuild {
  return {
    id: guild.id,
    name: guild.name,
    players: guild.approximatePresenceCount ?? 0,
    max: guild.memberCount ?? 0,
  }
}

async function completeLink(input: {
  code: string
  guild: LinkableGuild
  reply: (message: string) => Promise<unknown>
}): Promise<void> {
  const result = await postVerify(input.code, input.guild.id, input.guild.name)
  if (!result.success) {
    await input.reply(`❌ ${result.error || 'Не вдалося привʼязати сервер'}`)
    return
  }
  await syncGuild(input.guild.id, input.guild.players, input.guild.max, input.guild.name)
  await input.reply(`✅ Сервер **${result.serverName}** привʼязано до Discord **${input.guild.name}**!`)
}

function buildGuildSelectRow(code: string, guilds: LinkableGuild[]) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`${linkSelectPrefix}${code}`)
    .setPlaceholder('Оберіть Discord-сервер для привʼязки')
    .addOptions(
      guilds.slice(0, 25).map((guild) => ({
        label: guild.name.slice(0, 100),
        description: `ID ${guild.id}`.slice(0, 100),
        value: guild.id,
      }))
    )
  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(menu)
}

async function handleLinkCommand(interaction: ChatInputCommandInteraction): Promise<void> {
  const code = interaction.options.getString('code', true)
  const guildIdOption = interaction.options.getString('guild_id')?.trim() || ''
  if (interaction.guild) {
    await interaction.deferReply({ ephemeral: true })
    const canManage = await userCanManageGuild(interaction.guild, interaction.user.id)
    if (!canManage) {
      await interaction.editReply('❌ Потрібні права адміністратора або «Керувати сервером».')
      return
    }
    await completeLink({
      code,
      guild: mapGuildSnapshot(interaction.guild),
      reply: (message) => interaction.editReply(message),
    })
    return
  }
  await interaction.deferReply({ ephemeral: true })
  const manageableGuilds = await listManageableGuilds(interaction.user.id)
  if (manageableGuilds.length === 0) {
    await interaction.editReply([
      '❌ Не знайдено Discord-серверів, де ви адміністратор і доданий бот EyzenCore.',
      '',
      '1. Додайте бота на свій сервер.',
      '2. Повторіть `/link` у ЛС або на каналі сервера.',
    ].join('\n'))
    return
  }
  if (guildIdOption) {
    const selectedGuild = manageableGuilds.find((guild) => guild.id === guildIdOption)
    if (!selectedGuild) {
      await interaction.editReply('❌ Бот не на цьому сервері або у вас немає прав адміністратора для вказаного `guild_id`.')
      return
    }
    await completeLink({
      code,
      guild: selectedGuild,
      reply: (message) => interaction.editReply(message),
    })
    return
  }
  if (manageableGuilds.length === 1) {
    await completeLink({
      code,
      guild: manageableGuilds[0],
      reply: (message) => interaction.editReply(message),
    })
    return
  }
  await interaction.editReply({
    content: 'Оберіть Discord-сервер, який хочете привʼязати до Eyzencore:',
    components: [buildGuildSelectRow(code, manageableGuilds)],
  })
}

async function handleLinkSelect(interaction: StringSelectMenuInteraction): Promise<void> {
  const code = interaction.customId.slice(linkSelectPrefix.length)
  const guildId = interaction.values[0]
  const guild = client.guilds.cache.get(guildId)
  if (!guild) {
    await interaction.update({ content: '❌ Сервер не знайдено. Спробуйте `/link` ще раз.', components: [] })
    return
  }
  const canManage = await userCanManageGuild(guild, interaction.user.id)
  if (!canManage) {
    await interaction.update({ content: '❌ У вас немає прав для цього сервера.', components: [] })
    return
  }
  await interaction.deferUpdate()
  const result = await postVerify(code, guild.id, guild.name)
  if (!result.success) {
    await interaction.editReply({ content: `❌ ${result.error || 'Не вдалося привʼязати сервер'}`, components: [] })
    return
  }
  await syncGuild(
    guild.id,
    guild.approximatePresenceCount ?? 0,
    guild.memberCount ?? 0,
    guild.name
  )
  await interaction.editReply({
    content: `✅ Сервер **${result.serverName}** привʼязано до Discord **${guild.name}**!`,
    components: [],
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
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'link') {
        await handleLinkCommand(interaction)
        return
      }
      if (interaction.commandName === 'online') {
        if (!interaction.guild) {
          await interaction.reply({
            content: '❌ Команда `/online` працює на Discord-сервері. У ЛС використовуйте `/link`.',
            ephemeral: true,
          })
          return
        }
        await interaction.reply({
          content: `🟢 Онлайн: **${interaction.guild.approximatePresenceCount ?? 0}** / **${interaction.guild.memberCount ?? 0}** учасників`,
          ephemeral: false,
        })
      }
      return
    }
    if (interaction.isStringSelectMenu() && interaction.customId.startsWith(linkSelectPrefix)) {
      await handleLinkSelect(interaction)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Невідома помилка'
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(`❌ ${message}`).catch(() => undefined)
      } else {
        await interaction.reply({ content: `❌ ${message}`, ephemeral: true }).catch(() => undefined)
      }
    }
    console.error('Discord interaction error:', error)
  }
})

async function start(): Promise<void> {
  await registerCommands()
  await client.login(token)
}

void start()
