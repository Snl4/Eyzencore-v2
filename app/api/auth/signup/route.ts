import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Реєстрація доступна лише після підтвердження коду з пошти.' },
    { status: 410 }
  );
}
