'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Trash2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react'

interface BulletListEditorProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  label?: string
}

export function BulletListEditor({
  items,
  onChange,
  placeholder = '输入内容...',
  label = '描述',
}: BulletListEditorProps) {
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null)

  const handleAdd = () => {
    onChange([...items, ''])
    setFocusedIndex(items.length)
  }

  const handleRemove = (index: number) => {
    const newItems = items.filter((_, i) => i !== index)
    onChange(newItems)
    setFocusedIndex(null)
  }

  const handleChange = (index: number, value: string) => {
    const newItems = [...items]
    newItems[index] = value
    onChange(newItems)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const newItems = [...items]
    ;[newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]]
    onChange(newItems)
    setFocusedIndex(index - 1)
  }

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return
    const newItems = [...items]
    ;[newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]]
    onChange(newItems)
    setFocusedIndex(index + 1)
  }

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleAdd()
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-start gap-2 p-2 rounded border ${
              focusedIndex === index ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
            }`}
          >
            <div className="flex flex-col gap-1 pt-2">
              <GripVertical className="h-4 w-4 text-gray-400 cursor-grab" />
            </div>

            <div className="flex-1">
              <Textarea
                value={item}
                onChange={(e) => handleChange(index, e.target.value)}
                onFocus={() => setFocusedIndex(index)}
                onBlur={() => setFocusedIndex(null)}
                onKeyDown={(e) => handleKeyDown(e, index)}
                placeholder={placeholder}
                rows={2}
                className="resize-none"
              />
            </div>

            <div className="flex flex-col gap-1">
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
                disabled={index === items.length - 1}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(index)}
                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAdd}
        className="w-full"
      >
        <Plus className="h-4 w-4 mr-2" />
        添加条目
      </Button>
    </div>
  )
}
