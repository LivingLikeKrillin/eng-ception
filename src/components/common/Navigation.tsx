import { NavLink } from 'react-router-dom'

export default function Navigation() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center gap-1 text-xs ${isActive ? 'text-sky-600 font-bold' : 'text-gray-400'}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-3 flex justify-around max-w-lg mx-auto">
      <NavLink to="/" className={linkClass} end>
        <span className="text-lg">🏠</span>
        <span>홈</span>
      </NavLink>
      <NavLink to="/patterns" className={linkClass}>
        <span className="text-lg">📚</span>
        <span>패턴</span>
      </NavLink>
      <NavLink to="/review" className={linkClass}>
        <span className="text-lg">🔄</span>
        <span>복습</span>
      </NavLink>
    </nav>
  )
}
