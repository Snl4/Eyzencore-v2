const MONTHS_UA_SHORT = [
  'СІЧ',
  'ЛЮТ',
  'БЕР',
  'КВТ',
  'ТРВ',
  'ЧЕР',
  'ЛИП',
  'СРП',
  'ВЕР',
  'ЖОВ',
  'ЛИС',
  'ГРУ',
];

export function formatJoinedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.getDate()} ${MONTHS_UA_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatNumberUA(n: number): string {
  return n.toLocaleString('uk-UA').replace(/[ ,]/g, ' ');
}
