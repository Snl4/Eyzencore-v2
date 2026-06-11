import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBell,
  faBookOpen,
  faBullhorn,
  faChartLine,
  faCircleQuestion,
  faCode,
  faComments,
  faCubes,
  faGear,
  faGlobe,
  faKey,
  faMagnifyingGlass,
  faNewspaper,
  faServer,
  faShieldHalved,
  faScrewdriverWrench,
  faTableColumns,
  faUser,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'

const sidebarIcons: Record<string, IconDefinition> = {
  dashboard: faTableColumns,
  servers: faServer,
  minecraft: faCubes,
  discord: faDiscord,
  users: faUser,
  forum: faComments,
  news: faNewspaper,
  chart: faChartLine,
  cluster: faCubes,
  search: faMagnifyingGlass,
  bell: faBell,
  shield: faShieldHalved,
  key: faCode,
  lock: faKey,
  globe: faGlobe,
  folder: faServer,
  settings: faGear,
  community: faUsers,
  'book-open': faBookOpen,
  'circle-question': faCircleQuestion,
  bullhorn: faBullhorn,
  'screwdriver-wrench': faScrewdriverWrench,
}

export function SidebarIcon({ name }: { name: string }) {
  const icon = sidebarIcons[name] || faGear
  return <FontAwesomeIcon icon={icon} fixedWidth />
}
