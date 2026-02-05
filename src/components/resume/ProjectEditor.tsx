'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DateRangePicker } from './DateRangePicker'
import { BulletListEditor } from './BulletListEditor'
import { ConfidenceBadge } from './ConfidenceBadge'
import { Badge } from '@/components/ui/badge'
import { X } from 'lucide-react'
import { useState } from 'react'
import type { Project } from '@/types/resume'

interface ProjectEditorProps {
  data: Project
  onChange: (data: Project) => void
}

export function ProjectEditor({ data, onChange }: ProjectEditorProps) {
  const [newTech, setNewTech] = useState('')

  const handleChange = <K extends keyof Project>(field: K, value: Project[K]) => {
    onChange({ ...data, [field]: value })
  }

  const handleAddTech = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTech.trim()) {
      e.preventDefault()
      const technologies = [...(data.technologies || []), newTech.trim()]
      handleChange('technologies', technologies)
      setNewTech('')
    }
  }

  const handleRemoveTech = (index: number) => {
    const technologies = (data.technologies || []).filter((_, i) => i !== index)
    handleChange('technologies', technologies)
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-white">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">
          {data.name || 'New Project'}
        </h4>
        <ConfidenceBadge confidence={data.confidence} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label htmlFor={`name-${data.id}`}>Project Name *</Label>
          <Input
            id={`name-${data.id}`}
            value={data.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Project Name"
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor={`url-${data.id}`}>URL / Link</Label>
          <Input
            id={`url-${data.id}`}
            value={data.url || ''}
            onChange={(e) => handleChange('url', e.target.value)}
            placeholder="https://github.com/..."
            className="mt-1"
          />
        </div>

        <div className="md:col-span-2">
          <Label className="mb-2 block">Date Range</Label>
          <DateRangePicker
            startDate={data.startDate || ''}
            endDate={data.endDate ?? null}
            onStartDateChange={(date) => handleChange('startDate', date)}
            onEndDateChange={(date) => handleChange('endDate', date)}
          />
        </div>

        <div className="md:col-span-2">
          <Label htmlFor={`tech-${data.id}`}>Technologies</Label>
          <Input
            id={`tech-${data.id}`}
            value={newTech}
            onChange={(e) => setNewTech(e.target.value)}
            onKeyDown={handleAddTech}
            placeholder="Type a technology and press Enter..."
            className="mt-1"
          />
          {data.technologies && data.technologies.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {data.technologies.map((tech, index) => (
                <Badge
                  key={index}
                  variant="secondary"
                  className="bg-blue-100 text-blue-800 cursor-pointer group"
                >
                  {tech}
                  <button
                    type="button"
                    onClick={() => handleRemoveTech(index)}
                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-4">
        <BulletListEditor
          items={data.description}
          onChange={(items) => handleChange('description', items)}
          label="Description & Key Features"
          placeholder="Describe the project, your role, and key achievements..."
        />
      </div>
    </div>
  )
}
