import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'SCHNITTWERK by Vanessa Carosella',
    template: '%s | SCHNITTWERK',
  },
  description:
    'Professioneller Friseursalon in St. Gallen. Haarschnitte, Färben, Styling und mehr. Jetzt online Termin buchen!',
  keywords: [
    'Friseur St. Gallen',
    'Haarschnitt',
    'Balayage',
    'Färben',
    'Styling',
    'Salon',
    'SCHNITTWERK',
  ],
  authors: [{ name: 'SCHNITTWERK by Vanessa Carosella' }],
  creator: 'SCHNITTWERK',
  publisher: 'SCHNITTWERK',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'de_CH',
    url: '/',
    title: 'SCHNITTWERK by Vanessa Carosella',
    description: 'Professioneller Friseursalon in St. Gallen',
    siteName: 'SCHNITTWERK',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SCHNITTWERK by Vanessa Carosella',
    description: 'Professioneller Friseursalon in St. Gallen',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="de-CH" suppressHydrationWarning>
      <body className={cn(inter.variable, 'min-h-screen font-sans antialiased')}>
        {children}
      </body>
    </html>
  )
}
