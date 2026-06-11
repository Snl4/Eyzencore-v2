'use client'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faArrowRightFromBracket, faChevronDown, faGear, faMoon, faSun, faUser } from '@fortawesome/free-solid-svg-icons'
import { DropdownMenu } from '@/components/ui/DropdownMenu'
import type { AuthUser } from '@/lib/auth-db'

export function UserProfileDropdown({
  user,
  theme,
  onToggleTheme,
  onLogout,
  compact = false,
}: {
  user: AuthUser | null
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  onLogout?: () => void
  compact?: boolean
}) {
  const name = user?.user_metadata.full_name || 'Гість'
  const handle = user?.user_metadata.profile_slug || 'user'
  const avatar = user?.user_metadata.avatar_url
  const avatarStyle = avatar
    ? { backgroundImage: `url(${JSON.stringify(avatar).slice(1, -1)})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : undefined

  return (
    <DropdownMenu
      className={compact ? 'profile-dropdown-compact' : ''}
      label="Меню профілю"
      align={compact ? 'start' : 'end'}
      trigger={(open) => (
        <span className={`profile-dropdown-trigger${open ? ' open' : ''}`}>
          <span className="profile-dropdown-avatar" style={avatarStyle}>{avatar ? '' : name.slice(0, 1).toUpperCase()}</span>
          <span className="profile-dropdown-user">
            <b>{name}</b>
            <small>@{handle}</small>
          </span>
          <FontAwesomeIcon className="profile-dropdown-chevron" icon={faChevronDown} />
        </span>
      )}
      items={[
        ...(user ? [{
          label: 'Мій профіль',
          description: `@${handle}`,
          href: '/profile',
          icon: <FontAwesomeIcon icon={faUser} />,
        }, {
          label: 'Налаштування',
          description: 'Акаунт і безпека',
          href: '/settings',
          icon: <FontAwesomeIcon icon={faGear} />,
        }] : [{
          label: 'Увійти',
          description: 'Відкрити свій акаунт',
          href: '/auth/login',
          icon: <FontAwesomeIcon icon={faUser} />,
        }, {
          label: 'Реєстрація',
          description: 'Створити новий акаунт',
          href: '/auth/register',
          icon: <FontAwesomeIcon icon={faGear} />,
        }]),
        {
          label: theme === 'dark' ? 'Світла тема' : 'Темна тема',
          description: 'Змінити вигляд сайту',
          icon: <FontAwesomeIcon icon={theme === 'dark' ? faSun : faMoon} />,
          onSelect: onToggleTheme,
          separatorBefore: true,
        },
        ...(onLogout ? [{
          label: 'Вийти',
          description: 'Завершити поточний сеанс',
          icon: <FontAwesomeIcon icon={faArrowRightFromBracket} />,
          onSelect: onLogout,
          danger: true,
        }] : []),
      ]}
    />
  )
}
