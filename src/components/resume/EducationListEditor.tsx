'use client'

import { Button } from '@/components/ui/button'
import { EducationEditor } from './EducationEditor'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Education } from '@/types/resume'

interface EducationListEditorProps {
  data: Education[]
  onChange: (data: Education[]) => void
}

export function EducationListEditor({ data, onChange }: EducationListEditorProps) {
  const handleAdd = () => {
    const newEdu: Education = {
      id: uuidv4(),
      institution: '',
      degree: '',
      field: '',
      startDate: '',
      endDate: null,
      gpa: '',
      description: [],
      confidence: 100,
      order: data.length,
    }
    onChange([...data, newEdu])
  }

  const handleRemove = (id: string) => {
    onChange(data.filter((edu) => edu.id !== id))
  }

  const handleChange = (id: string, updated: Education) => {
    onChange(data.map((edu) => (edu.id === id ? updated : edu)))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newData = [...data]
    ;[newData[index - 1], newData[index]] = [newData[index], newData[index - 1]]
    newData.forEach((edu, i) => (edu.order = i))
    onChange(newData)
  }

  const handleMoveDown = (index: number) => {
    if (index === data.length - 1) return
    const newData = [...data]
    ;[newData[index], newData[index + 1]] = [newData[index + 1], newData[index]]
    newData.forEach((edu, i) => (edu.order = i))
    onChange(newData)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Education</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Education
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          <p>No education added yet.</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add your first education
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((edu, index) => (
            <div key={edu.id} className="relative">
              <div className="absolute -left-10 top-4 flex flex-col gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveUp(index)}
                  disabled={index === 0}
                  className="h-6 w-6 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleMoveDown(index)}
                  disabled={index === data.length - 1}
                  className="h-6 w-6 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>

              <EducationEditor
                data={edu}
                onChange={(updated) => handleChange(edu.id, updated)}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(edu.id)}
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
