'use client'

/**
 * Admin Sidebar Navigation
 *
 * Main navigation for the admin portal with all modules
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Scissors,
  Users,
  Calendar,
  ShoppingBag,
  Package,
  Settings,
  Mail,
  FileText,
  BarChart3,
} from 'lucide-react'

interface NavItem {
  title: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Termine',
    href: '/admin/termine',
    icon: Calendar,
  },
  {
    title: 'Leistungen',
    href: '/admin/leistungen',
    icon: Scissors,
  },
  {
    title: 'Mitarbeiter',
    href: '/admin/mitarbeiter',
    icon: Users,
  },
  {
    title: 'Kunden',
    href: '/admin/kunden',
    icon: Users,
  },
  {
    title: 'Shop',
    href: '/admin/shop',
    icon: ShoppingBag,
  },
  {
    title: 'Bestellungen',
    href: '/admin/bestellungen',
    icon: Package,
  },
  {
    title: 'Berichte',
    href: '/admin/berichte',
    icon: BarChart3,
  },
  {
    title: 'Benachrichtigungen',
    href: '/admin/benachrichtigungen',
    icon: Mail,
  },
  {
    title: 'Einstellungen',
    href: '/admin/einstellungen',
    icon: Settings,
  },
]

export function AdminSidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex w-64 flex-col border-r bg-background">
      {/* Logo */}
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/admin" className="flex items-center gap-2">
          <Scissors className="h-6 w-6" />
          <span className="text-xl font-bold">SCHNITTWERK</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {navItems.map(item => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.title}</span>
                  {item.badge && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {item.badge}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t p-4 text-xs text-muted-foreground">
        <p>© 2024 SCHNITTWERK</p>
        <p>Version 1.0.0</p>
      </div>
    </aside>
  )
}
