'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { CmsSiteMonthlyReport } from '@/lib/cms-site-report-shared'
import { formatSiteReportText } from '@/lib/cms-site-report-shared'

type CmsSiteReportPanelProps = {
  onError: (message: string) => void
}

function formatNumber(value: number): string {
  return value.toLocaleString('uk-UA')
}

function formatDelta(current: number, previous: number): string {
  if (previous === 0) {
    return current > 0 ? '+100%' : '0%'
  }
  const delta = ((current - previous) / previous) * 100
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}%`
}

function buildMonthLabel(monthKey: string): string {
  const [yearText, monthText] = monthKey.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return monthKey
  return new Intl.DateTimeFormat('uk-UA', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

export function CmsSiteReportPanel({ onError }: CmsSiteReportPanelProps) {
  const [report, setReport] = useState<CmsSiteMonthlyReport | null>(null)
  const [months, setMonths] = useState<string[]>([])
  const [selectedMonth, setSelectedMonth] = useState('')
  const [loading, setLoading] = useState(true)
  const [copying, setCopying] = useState(false)

  const loadReport = useCallback(async (month?: string) => {
    setLoading(true)
    onError('')
    const query = month ? `?month=${encodeURIComponent(month)}` : ''
    const response = await fetch(`/api/cms/site-report${query}`, { cache: 'no-store' })
    const payload = await response.json() as {
      report?: CmsSiteMonthlyReport
      months?: string[]
      error?: string
    }
    if (!response.ok) {
      onError(payload.error || 'Не вдалося завантажити звіт')
      setLoading(false)
      return
    }
    setReport(payload.report || null)
    setMonths(Array.isArray(payload.months) ? payload.months : [])
    if (payload.report?.month) {
      setSelectedMonth(payload.report.month)
    }
    setLoading(false)
  }, [onError])

  useEffect(() => {
    void loadReport()
  }, [loadReport])

  const monthOptions = useMemo(() => {
    const source = months.length > 0 ? months : (report?.month ? [report.month] : [])
    return source.map((monthKey) => ({
      value: monthKey,
      label: buildMonthLabel(monthKey),
    }))
  }, [months, report?.month])

  const handleCopyReport = async () => {
    if (!report) return
    setCopying(true)
    try {
      await navigator.clipboard.writeText(formatSiteReportText(report))
    } catch {
      onError('Не вдалося скопіювати звіт')
      setCopying(false)
      return
    }
    setCopying(false)
  }

  if (loading) {
    return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Завантаження звіту...</div>
  }

  if (!report) {
    return <div className="set-card" style={{ color: 'var(--fg-3)' }}>Звіт недоступний.</div>
  }

  const previous = report.previousMonth

  return (
    <section className="cms-maintenance-page">
      <div className="cms-maintenance-hero">
        <div>
          <p className="cms-eyebrow">Аналітика платформи</p>
          <h1>Місячний звіт по сайту</h1>
          <p>
            Реальна статистика за обраний місяць: унікальні відвідувачі, перегляди, голоси та лайки.
            Дані враховують і поточні записи, і архів після скидань рейтингу.
          </p>
        </div>
      </div>

      <div className="cms-maintenance-layout">
        <div className="cms-maintenance-editor">
          <div>
            <p className="cms-eyebrow">Період</p>
            <h2>{report.label}</h2>
          </div>
          <label>
            <span>Місяць</span>
            <select
              value={selectedMonth}
              onChange={(event) => {
                const nextMonth = event.target.value
                setSelectedMonth(nextMonth)
                void loadReport(nextMonth)
              }}
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="cms-report-stats">
            <div>
              <span>Унікальні відвідувачі</span>
              <b>{formatNumber(report.uniqueVisitors)}</b>
              {previous ? <small>до попереднього: {formatDelta(report.uniqueVisitors, previous.uniqueVisitors)}</small> : null}
            </div>
            <div>
              <span>Перегляди</span>
              <b>{formatNumber(report.views)}</b>
              {previous ? <small>до попереднього: {formatDelta(report.views, previous.views)}</small> : null}
            </div>
            <div>
              <span>Голоси (разом)</span>
              <b>{formatNumber(report.totalVotes)}</b>
              {previous ? <small>до попереднього: {formatDelta(report.totalVotes, previous.totalVotes)}</small> : null}
            </div>
            <div>
              <span>Лайки</span>
              <b>{formatNumber(report.likes)}</b>
              {previous ? <small>до попереднього: {formatDelta(report.likes, previous.likes)}</small> : null}
            </div>
            <div>
              <span>Голоси (нік)</span>
              <b>{formatNumber(report.nicknameVotes)}</b>
            </div>
            <div>
              <span>Голоси (акаунт)</span>
              <b>{formatNumber(report.accountVotes)}</b>
            </div>
            <div>
              <span>Відгуки</span>
              <b>{formatNumber(report.reviews)}</b>
            </div>
            <div>
              <span>Нові користувачі</span>
              <b>{formatNumber(report.newUsers)}</b>
            </div>
          </div>
          <div className="cms-maintenance-actions">
            <button className="cms-primary-button" disabled={copying} onClick={() => void handleCopyReport()} type="button">
              {copying ? 'Копіювання...' : 'Скопіювати звіт'}
            </button>
            <button disabled={loading} onClick={() => void loadReport(selectedMonth)} type="button">
              Оновити
            </button>
          </div>
        </div>

        <div className="cms-maintenance-preview">
          <p className="cms-eyebrow">Топ серверів за місяць</p>
          {report.topServers.length === 0 ? (
            <div className="set-card" style={{ color: 'var(--fg-3)' }}>
              За цей місяць ще немає активності на серверах.
            </div>
          ) : (
            <div className="cms-report-top-servers">
              {report.topServers.map((server, index) => (
                <article className="cms-report-top-server-item" key={server.serverId}>
                  <b>{index + 1}. {server.serverName}</b>
                  <span>
                    👁 {formatNumber(server.views)} · ▲ {formatNumber(server.votes)} · ♥ {formatNumber(server.likes)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
