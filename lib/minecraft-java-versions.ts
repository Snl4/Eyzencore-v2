/**
 * Minecraft: Java Edition release versions (newest first).
 * Includes full releases, Beta, Alpha, Infdev, Indev, Classic and Pre-Classic.
 */
const RELEASE_2026 = [
  '26.3',
  '26.2',
  '26.1.2',
  '26.1.1',
  '26.1',
] as const

const RELEASE_1_21 = [
  '1.21.11',
  '1.21.10',
  '1.21.9',
  '1.21.8',
  '1.21.7',
  '1.21.6',
  '1.21.5',
  '1.21.4',
  '1.21.3',
  '1.21.2',
  '1.21.1',
  '1.21',
] as const

const RELEASE_1_20 = ['1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20'] as const
const RELEASE_1_19 = ['1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19'] as const
const RELEASE_1_18 = ['1.18.2', '1.18.1', '1.18'] as const
const RELEASE_1_17 = ['1.17.1', '1.17'] as const
const RELEASE_1_16 = ['1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16'] as const
const RELEASE_1_15 = ['1.15.2', '1.15.1', '1.15'] as const
const RELEASE_1_14 = ['1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14'] as const
const RELEASE_1_13 = ['1.13.2', '1.13.1', '1.13'] as const
const RELEASE_1_12 = ['1.12.2', '1.12.1', '1.12'] as const
const RELEASE_1_11 = ['1.11.2', '1.11.1', '1.11'] as const
const RELEASE_1_10 = ['1.10.2', '1.10.1', '1.10'] as const
const RELEASE_1_9 = ['1.9.4', '1.9.3', '1.9.2', '1.9.1', '1.9'] as const
const RELEASE_1_8 = ['1.8.9', '1.8.8', '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8'] as const
const RELEASE_1_7 = ['1.7.10', '1.7.9', '1.7.8', '1.7.7', '1.7.6', '1.7.5', '1.7.4', '1.7.2'] as const
const RELEASE_1_6 = ['1.6.4', '1.6.2', '1.6.1'] as const
const RELEASE_1_5 = ['1.5.2', '1.5.1', '1.5'] as const
const RELEASE_1_4 = ['1.4.7', '1.4.6', '1.4.5', '1.4.4', '1.4.2'] as const
const RELEASE_1_3 = ['1.3.2', '1.3.1'] as const
const RELEASE_1_2 = ['1.2.5', '1.2.4', '1.2.3', '1.2.2', '1.2.1'] as const
const RELEASE_1_1 = ['1.1'] as const
const RELEASE_1_0 = ['1.0.1', '1.0.0'] as const

const BETA = [
  'Beta 1.8.1',
  'Beta 1.8',
  'Beta 1.7.3',
  'Beta 1.7.2',
  'Beta 1.7_01',
  'Beta 1.7',
  'Beta 1.6.6',
  'Beta 1.6.5',
  'Beta 1.6.4',
  'Beta 1.6.3',
  'Beta 1.6.2',
  'Beta 1.6.1',
  'Beta 1.6',
  'Beta 1.5_02',
  'Beta 1.5_01',
  'Beta 1.5',
  'Beta 1.4_01',
  'Beta 1.4',
  'Beta 1.3_01',
  'Beta 1.3',
  'Beta 1.2_02',
  'Beta 1.2_01',
  'Beta 1.2',
  'Beta 1.1_02',
  'Beta 1.1_01',
  'Beta 1.1',
  'Beta 1.0.2',
  'Beta 1.0_01',
  'Beta 1.0',
] as const

const ALPHA_1_2 = [
  'Alpha v1.2.6',
  'Alpha v1.2.5',
  'Alpha v1.2.4_01',
  'Alpha v1.2.3_05',
  'Alpha v1.2.3_04',
  'Alpha v1.2.3_02',
  'Alpha v1.2.3_01',
  'Alpha v1.2.3',
  'Alpha v1.2.2',
  'Alpha v1.2.1_01',
  'Alpha v1.2.1',
  'Alpha v1.2.0_02',
  'Alpha v1.2.0_01',
  'Alpha v1.2.0',
] as const

const ALPHA_1_1 = [
  'Alpha v1.1.2_01',
  'Alpha v1.1.2',
  'Alpha v1.1.1',
  'Alpha v1.1.0',
] as const

const ALPHA_1_0 = [
  'Alpha v1.0.17_02',
  'Alpha v1.0.16_02',
  'Alpha v1.0.15',
  'Alpha v1.0.14',
  'Alpha v1.0.13_02',
  'Alpha v1.0.13_01',
  'Alpha v1.0.12',
  'Alpha v1.0.11',
  'Alpha v1.0.10',
  'Alpha v1.0.9',
  'Alpha v1.0.8_01',
  'Alpha v1.0.7',
  'Alpha v1.0.6_01',
  'Alpha v1.0.5_01',
  'Alpha v1.0.4',
  'Alpha v1.0.3',
  'Alpha v1.0.2_02',
  'Alpha v1.0.2_01',
  'Alpha v1.0.1_01',
  'Alpha v1.0.0',
] as const

const INFDEV = [
  'Infdev 20100630',
  'Infdev 20100630-2',
  'Infdev 20100630-1',
  'Infdev 20100627',
  'Infdev 20100625-2',
  'Infdev 20100625',
  'Infdev 20100624',
  'Infdev 20100617-2',
  'Infdev 20100617',
  'Infdev 20100616-1',
  'Infdev 20100616',
  'Infdev 20100615',
  'Infdev 20100611-2',
  'Infdev 20100611-1',
  'Infdev 20100611',
  'Infdev 20100608',
  'Infdev 20100420',
  'Infdev 20100419',
  'Infdev 20100415',
  'Infdev 20100414',
  'Infdev 20100330',
  'Infdev 20100327',
  'Infdev 20100325',
  'Infdev 20100321',
  'Infdev 20100320',
  'Infdev 20100318',
  'Infdev 20100316',
  'Infdev 20100313',
  'Infdev 20100227-2',
  'Infdev 20100227-1',
  'Infdev 20100227',
] as const

const INDEV = [
  'Indev 20100223',
  'Indev 20100207',
  'Indev 20100131-2',
  'Indev 20100131-1',
  'Indev 20100131',
  'Indev 20100129-2',
  'Indev 20100129',
  'Indev 20100128',
  'Indev 20100125-2',
  'Indev 20100125',
  'Indev 20100124',
  'Indev 20100122-2',
  'Indev 20100122',
  'Indev 20100114',
  'Indev 20100113-2',
  'Indev 20100113',
  'Indev 20100110',
  'Indev 20091231-2',
  'Indev 20091231-1',
  'Indev 20091231',
  'Indev 20091223-2',
  'Indev 20091223-1',
] as const

const CLASSIC = [
  'c0.30_01c',
  'c0.29_02',
  'c0.29_01',
  'c0.28_01',
  'c0.27 SURVIVAL TEST 12',
  'c0.26 SURVIVAL TEST 11',
  'c0.25 SURVIVAL TEST 9',
  'c0.24 SURVIVAL TEST 3',
  'c0.24_01 SURVIVAL TEST 2',
  'c0.23 SURVIVAL TEST',
  'c0.22 SURVIVAL TEST 5',
  'c0.21 SURVIVAL TEST 4',
  'c0.0.22a_05',
  'c0.0.22a_04',
  'c0.0.22a_03',
  'c0.0.22a_02',
  'c0.0.22a_01',
  'c0.0.22a',
  'c0.0.21a',
  'c0.0.20a',
  'c0.0.19a_06',
  'c0.0.19a_05',
  'c0.0.19a_04',
  'c0.0.19a_03',
  'c0.0.19a_02',
  'c0.0.19a',
  'c0.0.18a_02',
  'c0.0.18a',
  'c0.0.17a_02',
  'c0.0.17a',
  'c0.0.16a_02',
  'c0.0.16a',
  'c0.0.15a_1',
  'c0.0.15a',
  'c0.0.14a_08',
  'c0.0.14a_07',
  'c0.0.14a_06',
  'c0.0.14a_04',
  'c0.0.14a_03',
  'c0.0.14a_01',
  'c0.0.14a',
  'c0.0.13a_03',
  'c0.0.13a_02',
  'c0.0.13a',
  'c0.0.12a_03',
  'c0.0.12a_02',
  'c0.0.12a',
  'c0.0.11a',
] as const

const PRE_CLASSIC = [
  'rd-161348',
  'rd-160052',
  'rd-132328',
  'rd-132211',
  'rd-132200',
  'rd-131655',
  'rd-131648',
  'rd-131645',
  'rd-20090515',
] as const

export const MINECRAFT_JAVA_VERSIONS: readonly string[] = [
  ...RELEASE_2026,
  ...RELEASE_1_21,
  ...RELEASE_1_20,
  ...RELEASE_1_19,
  ...RELEASE_1_18,
  ...RELEASE_1_17,
  ...RELEASE_1_16,
  ...RELEASE_1_15,
  ...RELEASE_1_14,
  ...RELEASE_1_13,
  ...RELEASE_1_12,
  ...RELEASE_1_11,
  ...RELEASE_1_10,
  ...RELEASE_1_9,
  ...RELEASE_1_8,
  ...RELEASE_1_7,
  ...RELEASE_1_6,
  ...RELEASE_1_5,
  ...RELEASE_1_4,
  ...RELEASE_1_3,
  ...RELEASE_1_2,
  ...RELEASE_1_1,
  ...RELEASE_1_0,
  ...BETA,
  ...ALPHA_1_2,
  ...ALPHA_1_1,
  ...ALPHA_1_0,
  ...INFDEV,
  ...INDEV,
  ...CLASSIC,
  ...PRE_CLASSIC,
]

export function mergeMinecraftVersionOptions(extraVersions: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  const push = (version: string) => {
    const normalized = String(version || '').trim()
    if (!normalized) return
    const key = normalized.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(normalized)
  }
  MINECRAFT_JAVA_VERSIONS.forEach(push)
  extraVersions.forEach(push)
  return result
}
