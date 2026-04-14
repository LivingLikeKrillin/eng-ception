import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'

interface Item {
  to: string
  label: string
  icon: ReactNode
  end?: boolean
}

const ITEMS: Item[] = [
  {
    to: '/',
    label: '홈',
    end: true,
    icon: (
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3m10-11v10a1 1 0 01-1 1h-3m-4 0v-6a1 1 0 011-1h2a1 1 0 011 1v6" />
    ),
  },
  {
    to: '/patterns',
    label: '구조',
    icon: (
      <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    ),
  },
  {
    to: '/review',
    label: '복습',
    icon: (
      <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    ),
  },
]

export default function Navigation() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 max-w-[393px] mx-auto bg-bg border-t border-line pt-2.5 pb-7 flex">
      {ITEMS.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className="flex-1 flex flex-col items-center gap-1 py-1.5 group"
        >
          {({ isActive }) => (
            <>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke={isActive ? 'var(--color-accent)' : 'var(--color-t2)'}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                {item.icon}
              </svg>
              <span
                className="text-[10px] font-semibold"
                style={{ color: isActive ? 'var(--color-accent)' : 'var(--color-t2)' }}
              >
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
