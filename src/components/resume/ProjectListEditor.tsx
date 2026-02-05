'use client'

import { Button } from '@/components/ui/button'
import { ProjectEditor } from './ProjectEditor'
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Project } from '@/types/resume'

interface ProjectListEditorProps {
  data: Project[]
  onChange: (data: Project[]) => void
}

export function ProjectListEditor({ data, onChange }: ProjectListEditorProps) {
  const handleAdd = () => {
    const newProject: Project = {
      id: uuidv4(),
      name: '',
      description: [],
      technologies: [],
      url: '',
      startDate: '',
      endDate: null,
      confidence: 100,
      order: data.length,
    }
    onChange([...data, newProject])
  }

  const handleRemove = (id: string) => {
    onChange(data.filter((project) => project.id !== id))
  }

  const handleChange = (id: string, updated: Project) => {
    onChange(data.map((project) => (project.id === id ? updated : project)))
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newData = [...data]
    ;[newData[index - 1], newData[index]] = [newData[index], newData[index - 1]]
    newData.forEach((project, i) => (project.order = i))
    onChange(newData)
  }

  const handleMoveDown = (index: number) => {
    if (index === data.length - 1) return
    const newData = [...data]
    ;[newData[index], newData[index + 1]] = [newData[index + 1], newData[index]]
    newData.forEach((project, i) => (project.order = i))
    onChange(newData)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Projects</h3>
        <Button type="button" variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          Add Project
        </Button>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          <p>No projects added yet.</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleAdd}
            className="mt-2"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add your first project
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {data.map((project, index) => (
            <div key={project.id} className="relative">
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

              <ProjectEditor
                data={project}
                onChange={(updated) => handleChange(project.id, updated)}
              />

              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(project.id)}
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
