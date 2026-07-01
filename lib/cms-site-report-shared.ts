export type CmsSiteReportTopServer = {
  serverId: number
  serverName: string
  views: number
  votes: number
  likes: number
}

export type CmsSiteMonthlyReport = {
  month: string
  label: string
  periodStart: string
  periodEnd: string
  uniqueVisitors: number
  views: number
  nicknameVotes: number
  accountVotes: number
  totalVotes: number
  likes: number
  reviews: number
  newUsers: number
  topServers: CmsSiteReportTopServer[]
  previousMonth: {
    uniqueVisitors: number
    views: number
    totalVotes: number
    likes: number
  } | null
}

export function formatSiteReportText(report: CmsSiteMonthlyReport): string {
  const lines = [
    `Звіт Eyzencore — ${report.label}`,
    `Період: ${report.periodStart.slice(0, 10)} — ${report.periodEnd.slice(0, 10)}`,
    '',
    `Унікальні відвідувачі: ${report.uniqueVisitors}`,
    `Перегляди: ${report.views}`,
    `Голоси (нік): ${report.nicknameVotes}`,
    `Голоси (акаунт): ${report.accountVotes}`,
    `Голоси (разом): ${report.totalVotes}`,
    `Лайки: ${report.likes}`,
    `Відгуки: ${report.reviews}`,
    `Нові користувачі: ${report.newUsers}`,
  ]
  if (report.topServers.length > 0) {
    lines.push('', 'Топ серверів:')
    report.topServers.forEach((server, index) => {
      lines.push(
        `${index + 1}. ${server.serverName} — ${server.views} переглядів, ${server.votes} голосів, ${server.likes} лайків`,
      )
    })
  }
  return lines.join('\n')
}
