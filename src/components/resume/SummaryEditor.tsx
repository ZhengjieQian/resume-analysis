'use client'

import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface SummaryEditorProps {
  data: string
  onChange: (data: string) => void
}

export function SummaryEditor({ data, onChange }: SummaryEditorProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Summary / Objective</h3>

      <div>
        <Label htmlFor="summary" className="text-sm text-gray-600">
          Write a brief professional summary or career objective
        </Label>
        <Textarea
          id="summary"
          value={data || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Experienced software engineer with 5+ years of experience in..."
          rows={6}
          className="mt-2"
        />
      </div>

      <p className="text-xs text-gray-500">
        Tip: Keep it concise (2-4 sentences) and highlight your key strengths and career goals.
      </p>
    </div>
  )
}
