import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { APP_NAME } from '../config'
import { useOnline } from '../hooks/useOnline'
import { Icon, type IconName } from './ui/Icon'

const NAV: { to: string; label: string; icon: IconName; end?: boolean }[] = [
  { to: '/', label: 'Home', icon: 'home', end: true },
  { to: '/colour', label: 'Colour', icon: 'colour' },
  { to: '/analysis', label: 'Hair profile', icon: 'profile' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

/** One <nav>: a bottom tab bar on phones, a left sidebar on desktop. */
export default function Layout() {
  const { pathname } = useLocation()
  const online = useOnline()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      <nav className="nav" aria-label="Main">
        <span className="nav-brand">{APP_NAME}</span>
        {NAV.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className="nav-item">
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <main className="page">
        {!online && (
          <div className="offline-banner" role="status">
            You’re offline. Demo mode and your saved choices still work; live YouCam readings, renders and hair
            analysis need a connection.
          </div>
        )}
        <Outlet />
      </main>
    </div>
  )
}
