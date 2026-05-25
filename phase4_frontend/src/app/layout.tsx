import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'Weekly Product Discovery',
  description: 'Fresh, AI-analyzed product launches from Flipkart every week.',
  openGraph: {
    title: 'Weekly Product Discovery',
    description: 'Fresh, AI-analyzed product launches from Flipkart every week.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-gray-50 text-gray-900 antialiased font-sans min-h-screen">
        {children}
      </body>
    </html>
  )
}
