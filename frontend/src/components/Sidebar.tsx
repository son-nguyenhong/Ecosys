import { NavLink } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

const NAV = [
  { label: 'Dashboard', to: '/', icon: '◼' },
  { label: 'Projects', to: '/projects', icon: '📁' },
  { label: 'BA Documents', to: '/ba', icon: '📄' },
  { label: 'Test Platform', to: '/test', icon: '✅' },
]

export function Sidebar() {
  const { logout } = useAuthStore()
  return (
    <aside className="w-56 bg-vib-blue min-h-screen flex flex-col">
      <div className="px-4 py-5 border-b border-blue-800">
        <p className="text-white font-bold text-sm">DevOps Ecosystem</p>
        <p className="text-blue-300 text-xs mt-0.5">VIB Platform</p>
      </div>
      <nav className="flex-1 py-4 space-y-0.5 px-2">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-blue-800 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              }`
            }
          >
            <span>{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-blue-800">
        <button
          onClick={logout}
          className="w-full text-left text-blue-300 hover:text-white text-xs px-3 py-2 rounded hover:bg-blue-800 transition-colors"
        >
          Đăng xuất
        </button>
      </div>
    </aside>
  )
}
