'use client'

import { Badge } from '@/components/ui/badge'

interface ConfidenceBadgeProps {
  confidence: number
  showLabel?: boolean
}

export function ConfidenceBadge({ confidence, showLabel = true }: ConfidenceBadgeProps) {
  const getVariant = () => {
    if (confidence >= 80) return 'default'
    if (confidence >= 60) return 'secondary'
    return 'destructive'
  }

  const getLabel = () => {
    if (confidence >= 80) return '高置信度'
    if (confidence >= 60) return '中置信度'
    return '需确认'
  }

  return (
    <Badge variant={getVariant()} className="text-xs">
      {showLabel ? getLabel() : `${confidence}%`}
    </Badge>
  )
}
