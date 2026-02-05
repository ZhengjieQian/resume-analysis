'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'

interface DateRangePickerProps {
  startDate: string
  endDate: string | null
  isCurrent?: boolean
  onStartDateChange: (date: string) => void
  onEndDateChange: (date: string | null) => void
  onCurrentChange?: (isCurrent: boolean) => void
}

export function DateRangePicker({
  startDate,
  endDate,
  isCurrent = false,
  onStartDateChange,
  onEndDateChange,
  onCurrentChange,
}: DateRangePickerProps) {
  // 将 YYYY-MM-DD 转换为 YYYY-MM 用于 month input
  const formatForInput = (date: string) => {
    if (!date) return ''
    const parts = date.split('-')
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`
    }
    return date
  }

  // 将 YYYY-MM 转换为 YYYY-MM-01
  const formatFromInput = (date: string) => {
    if (!date) return ''
    return `${date}-01`
  }

  const handleCurrentChange = (checked: boolean) => {
    if (onCurrentChange) {
      onCurrentChange(checked)
    }
    if (checked) {
      onEndDateChange(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex-1 min-w-[140px]">
        <Label htmlFor="startDate" className="text-sm text-gray-600">
          开始日期
        </Label>
        <Input
          id="startDate"
          type="month"
          value={formatForInput(startDate)}
          onChange={(e) => onStartDateChange(formatFromInput(e.target.value))}
          className="mt-1"
        />
      </div>

      <div className="flex-1 min-w-[140px]">
        <Label htmlFor="endDate" className="text-sm text-gray-600">
          结束日期
        </Label>
        <Input
          id="endDate"
          type="month"
          value={isCurrent ? '' : formatForInput(endDate || '')}
          onChange={(e) => onEndDateChange(formatFromInput(e.target.value))}
          disabled={isCurrent}
          className="mt-1"
          placeholder={isCurrent ? '至今' : ''}
        />
      </div>

      {onCurrentChange && (
        <div className="flex items-center space-x-2 pb-2">
          <Checkbox
            id="isCurrent"
            checked={isCurrent}
            onCheckedChange={handleCurrentChange}
          />
          <Label htmlFor="isCurrent" className="text-sm cursor-pointer">
            至今
          </Label>
        </div>
      )}
    </div>
  )
}
