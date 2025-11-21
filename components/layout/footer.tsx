/**
 * Footer Component
 * SCHNITTWERK - Public Website Footer
 *
 * Features:
 * - Contact information
 * - Social media links
 * - Legal links (Impressum, Datenschutz, AGB)
 * - Copyright
 * - Opening hours summary
 */

import Link from 'next/link'
import { MapPin, Phone, Mail, Instagram, Facebook } from 'lucide-react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t bg-muted/50">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">SCHNITTWERK</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-start space-x-2">
                <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <div>
                  <p>Rorschacherstrasse 152</p>
                  <p>9000 St. Gallen</p>
                  <p>Schweiz</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <a href="tel:+41711234567" className="hover:text-foreground">
                  +41 71 123 45 67
                </a>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 flex-shrink-0" />
                <a href="mailto:info@schnittwerk.ch" className="hover:text-foreground">
                  info@schnittwerk.ch
                </a>
              </div>
            </div>
          </div>

          {/* Opening Hours */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Öffnungszeiten</h3>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex justify-between">
                <span>Mo - Fr:</span>
                <span>09:00 - 18:00</span>
              </div>
              <div className="flex justify-between">
                <span>Samstag:</span>
                <span>08:00 - 16:00</span>
              </div>
              <div className="flex justify-between">
                <span>Sonntag:</span>
                <span>Geschlossen</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Navigation</h3>
            <nav className="flex flex-col space-y-2 text-sm text-muted-foreground">
              <Link href="/leistungen" className="hover:text-foreground">
                Leistungen
              </Link>
              <Link href="/team" className="hover:text-foreground">
                Team
              </Link>
              <Link href="/galerie" className="hover:text-foreground">
                Galerie
              </Link>
              <Link href="/shop" className="hover:text-foreground">
                Shop
              </Link>
              <Link href="/kontakt" className="hover:text-foreground">
                Kontakt
              </Link>
              <Link href="/termin-buchen" className="font-medium hover:text-foreground">
                Termin buchen
              </Link>
            </nav>
          </div>

          {/* Social & Legal */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Folgen Sie uns</h3>
            <div className="flex space-x-4">
              <a
                href="https://instagram.com/schnittwerk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com/schnittwerk"
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>

            <div className="space-y-2 text-sm text-muted-foreground">
              <h4 className="font-medium text-foreground">Rechtliches</h4>
              <nav className="flex flex-col space-y-1">
                <Link href="/impressum" className="hover:text-foreground">
                  Impressum
                </Link>
                <Link href="/datenschutz" className="hover:text-foreground">
                  Datenschutz
                </Link>
                <Link href="/agb" className="hover:text-foreground">
                  AGB
                </Link>
              </nav>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 border-t pt-8 text-center text-sm text-muted-foreground">
          <p>© {currentYear} SCHNITTWERK by Vanessa Carosella. Alle Rechte vorbehalten.</p>
        </div>
      </div>
    </footer>
  )
}
