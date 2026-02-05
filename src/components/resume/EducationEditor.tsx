'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateRangePicker } from './DateRangePicker'
import { BulletListEditor } from './BulletListEditor'
import { ConfidenceBadge } from './ConfidenceBadge'
import type { Education } from '@/types/resume'

interface EducationEditorProps {
  data: Education
  onChange: (data: Education) => void
}

export function EducationEditor({ data, onChange }: EducationEditorProps) {
  const handleChange = <K extends keyof Education>(field: K, value: Education[K]) => {
    onChange({ ...data, [field]: value })
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">
          {data.institution || data.degree || 'New Education'}
        </h4>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor={`institution-${data.id}`}>Institution *</Label>
          <Input
            id={`institution-${data.id}`}
            value={data.institution}
            onChange={(e) => handleChange('institution', e.target.value)}
            placeholder="University Name"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`degree-${data.id}`}>Degree *</Label>
          <Input
            id={`degree-${data.id}`}
            value={data.degree}
            onChange={(e) => handleChange('degree', e.target.value)}
            placeholder="Bachelor's, Master's, Ph.D."
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`field-${data.id}`}>Field of Study</Label>
          <Input
            id={`field-${data.id}`}
            value={data.field}
            onChange={(e) => handleChange('field', e.target.value)}
            placeholder="Computer Science"
            className="mt-1"
          />
        </div>

        <div>
          <Label htmlFor={`gpa-${data.id}`}>GPA</Label>
          <Input
            id={`gpa-${data.id}`}
            value={data.gpa || ''}
            onChange={(e) => handleChange('gpa', e.target.value)}
            placeholder="3.8 / 4.0"
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block">Date Range</Label>
          <DateRangePicker
            startDate={data.startDate}
            endDate={data.endDate}
            onStartDateChange={(date) => handleChange('startDate', date)}
            onEndDateChange={(date) => handleChange('endDate', date)}
          />
        </div>
      </div>

      <div className="mt-4">
        <BulletListEditor
          items={data.description || []}
          onChange={(items) => handleChange('description', items)}
          label="Relevant Coursework / Achievements"
          placeholder="Dean's List, relevant courses, academic projects..."
        />
      </div>
    </div>
  )
}
