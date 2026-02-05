'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { v4 as uuidv4 } from 'uuid'
import type { Skill } from '@/types/resume'

interface SkillsEditorProps {
  data: Skill[]
  onChange: (data: Skill[]) => void
}

const CATEGORIES: { value: Skill['category']; label: string }[] = [
  { value: 'programming', label: 'Programming Languages' },
  { value: 'tools', label: 'Tools & Frameworks' },
  { value: 'soft-skills', label: 'Soft Skills' },
  { value: 'language', label: 'Languages' },
  { value: 'other', label: 'Other' },
]

const CATEGORY_COLORS: Record<NonNullable<Skill['category']>, string> = {
  programming: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  tools: 'bg-green-100 text-green-800 hover:bg-green-200',
  'soft-skills': 'bg-purple-100 text-purple-800 hover:bg-purple-200',
  language: 'bg-orange-100 text-orange-800 hover:bg-orange-200',
  other: 'bg-gray-100 text-gray-800 hover:bg-gray-200',
}

export function SkillsEditor({ data, onChange }: SkillsEditorProps) {
  const [newSkill, setNewSkill] = useState('')
  const [newCategory, setNewCategory] = useState<Skill['category']>('programming')

  const handleAdd = () => {
    if (!newSkill.trim()) return

    const skill: Skill = {
      id: uuidv4(),
      name: newSkill.trim(),
      category: newCategory,
      confidence: 100,
    }

    onChange([...data, skill])
    setNewSkill('')
  }

  const handleRemove = (id: string) => {
    onChange(data.filter((skill) => skill.id !== id))
  }

  const handleCategoryChange = (id: string, category: Skill['category']) => {
    onChange(
      data.map((skill) => (skill.id === id ? { ...skill, category } : skill))
    )
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAdd()
    }
  }

  // Group skills by category
  const groupedSkills = CATEGORIES.reduce(
    (acc, cat) => {
      acc[cat.value!] = data.filter((s) => s.category === cat.value)
      return acc
    },
    {} as Record<NonNullable<Skill['category']>, Skill[]>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Skills</h3>
      </div>

      {/* Add new skill */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a skill and press Enter..."
          />
        </div>
        <Select
          value={newCategory}
          onValueChange={(v) => setNewCategory(v as Skill['category'])}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value!}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="button" onClick={handleAdd} disabled={!newSkill.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Display skills by category */}
      <div className="space-y-4">
        {CATEGORIES.map((cat) => {
          const skills = groupedSkills[cat.value!]
          if (skills.length === 0) return null

          return (
            <div key={cat.value} className="space-y-2">
              <Label className="text-sm text-gray-600">{cat.label}</Label>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge
                    key={skill.id}
                    variant="secondary"
                    className={`${CATEGORY_COLORS[skill.category!]} cursor-pointer group`}
                  >
                    {skill.name}
                    <button
                      type="button"
                      onClick={() => handleRemove(skill.id)}
                      className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
          <p>No skills added yet.</p>
          <p className="text-sm mt-1">Type a skill above and press Enter to add it.</p>
        </div>
      )}

      {/* Quick add for common skills */}
      <div className="pt-4 border-t">
        <Label className="text-sm text-gray-600 mb-2 block">Quick Add Common Skills</Label>
        <div className="flex flex-wrap gap-2">
          {['JavaScript', 'TypeScript', 'Python', 'React', 'Node.js', 'SQL', 'Git', 'Docker'].map(
            (skill) => {
              const exists = data.some(
                (s) => s.name.toLowerCase() === skill.toLowerCase()
              )
              if (exists) return null
              return (
                <Button
                  key={skill}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onChange([
                      ...data,
                      {
                        id: uuidv4(),
                        name: skill,
                        category: 'programming',
                        confidence: 100,
                      },
                    ])
                  }}
                >
                  + {skill}
                </Button>
              )
            }
          )}
        </div>
      </div>
    </div>
  )
}
