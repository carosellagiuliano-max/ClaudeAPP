'use client'

/**
 * Header Component
 * SCHNITTWERK - Public Website Header
 *
 * Features:
 * - Logo & Branding
 * - Main Navigation
 * - Phone (click to call)
 * - Login/Register
 * - Prominent "Termin buchen" CTA
 * - Mobile responsive with hamburger menu
 */

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Phone, Calendar, Menu, X, User } from 'lucide-react'
import { useState } from 'react'

const navigation = [
  { name: 'Home', href: '/' },
  { name: 'Leistungen', href: '/leistungen' },
  { name: 'Team', href: '/team' },
  { name: 'Galerie', href: '/galerie' },
  { name: 'Über uns', href: '/ueber-uns' },
  { name: 'Shop', href: '/shop' },
  { name: 'Kontakt', href: '/kontakt' },
]

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">SCHNITTWERK</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center space-x-6 md:flex">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center space-x-4">
          {/* Phone */}
          <a
            href="tel:+41711234567"
            className="hidden items-center space-x-1 text-sm font-medium text-foreground/80 transition-colors hover:text-foreground lg:flex"
          >
            <Phone className="h-4 w-4" />
            <span>071 123 45 67</span>
          </a>

          {/* Login */}
          <Button variant="ghost" size="sm" asChild className="hidden sm:flex">
            <Link href="/login">
              <User className="mr-2 h-4 w-4" />
              Anmelden
            </Link>
          </Button>

          {/* CTA: Termin buchen */}
          <Button size="sm" asChild>
            <Link href="/termin-buchen">
              <Calendar className="mr-2 h-4 w-4" />
              Termin buchen
            </Link>
          </Button>

          {/* Mobile Menu Button */}
          <MobileMenu />
        </div>
      </nav>
    </header>
  )
}

/**
 * Mobile Menu Component
 * Only visible on mobile devices
 */
function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {isOpen && (
        <div className="absolute left-0 right-0 top-16 border-b bg-background shadow-lg">
          <div className="container space-y-1 py-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
                onClick={() => setIsOpen(false)}
              >
                {item.name}
              </Link>
            ))}

            <div className="border-t pt-4">
              <a
                href="tel:+41711234567"
                className="block rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
              >
                📞 071 123 45 67
              </a>
              <Link
                href="/login"
                className="block rounded-md px-3 py-2 text-base font-medium hover:bg-accent"
                onClick={() => setIsOpen(false)}
              >
                👤 Anmelden
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
