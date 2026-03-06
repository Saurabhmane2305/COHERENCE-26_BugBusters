import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'

export const metadata: Metadata = {
  title: 'Budget Flow Intelligence',
  description: 'National Budget Leakage Detection & Fund Flow Analytics',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <TopBar />
          <main style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: 'var(--bg-primary)',
          }}>
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}