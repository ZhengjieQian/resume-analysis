'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateRangePicker } from './DateRangePicker'
import { BulletListEditor } from './BulletListEditor'
import { ConfidenceBadge } from './ConfidenceBadge'
import type { Experience } from '@/types/resume'

interface ExperienceEditorProps {
  data: Experience
  onChange: (data: Experience) => void
}

export function ExperienceEditor({ data, onChange }: ExperienceEditorProps) {
  const handleChange = <K extends keyof Experience>(field: K, value: Experience[K]) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">
          {data.title || data.company || 'New Experience'}
        </h4>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor={`company-${data.id}`}>Company *</Label>
          <Input
            id={`company-${data.id}`}
            value={data.company}
            onChange={(e) => handleChange('company', e.target.value)}
            placeholder="Company Name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`title-${data.id}`}>Job Title *</Label>
          <Input
            id={`title-${data.id}`}
            value={data.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Software Engineer"
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor={`location-${data.id}`}>Location</Label>
          <Input
            id={`location-${data.id}`}
            value={data.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="City, State"
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block">Date Range</Label>
          <DateRangePicker
            startDate={data.startDate}
            endDate={data.endDate}
            isCurrent={data.isCurrent}
            onStartDateChange={(date) => handleChange('startDate', date)}
            onEndDateChange={(date) => handleChange('endDate', date)}
            onCurrentChange={(current) => handleChange('isCurrent', current)}
          />
        </div>
      </div>

      <div className="mt-4">
        <BulletListEditor
          items={data.description}
          onChange={(items) => handleChange('description', items)}
          label="Responsibilities & Achievements"
          placeholder="Describe your key responsibilities and achievements..."
        />
      </div>
    </div>
  )
}
