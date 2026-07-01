import { NextResponse } from 'next/server'
import { getCurrentCmsUser } from '@/lib/cms-auth'
import {
  buildCurrentMonthKey,
  getCmsSiteMonthlyReport,
  listReportMonthOptions,
} from '@/lib/cms-site-report'

export async function GET(request: Request) {
  const user = await getCurrentCmsUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const url = new URL(request.url)
  const month = String(url.searchParams.get('month') || buildCurrentMonthKey()).trim()
  try {
    const report = await getCmsSiteMonthlyReport(month)
    return NextResponse.json({
      report,
      months: listReportMonthOptions(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Не вдалося сформувати звіт'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
