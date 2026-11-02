'use client'

import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  filename: string
  label?: string
  rows: Record<string, string | number | boolean | null | undefined>[]
}

export default function CsvExportButton({ filename, label = 'Export CSV Report', rows }: Props) {
  function handleExport() {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const escapeCell = (val: unknown) => {
      if (val === null || val === undefined) return ''
      const s = String(val).replace(/"/g, '""')
      return /[",\n]/.test(s) ? `"${s}"` : s
    }
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => escapeCell(r[h])).join(',')),
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      {label}
    </Button>
  )
}

