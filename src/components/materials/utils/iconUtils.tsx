import React from 'react'
import { FiFolder, FiBox, FiClipboard } from 'react-icons/fi'
import type { MaterialType } from '../types/Material'

export function getNodeIcon(type: MaterialType, isExpanded?: boolean) {
  switch (type) {
    case 'main':
      if (isExpanded) {
        return <FiFolder size={16} color="#2563EB" fill="#2563EB" opacity={0.2} />
      }
      return <FiFolder size={16} color="#2563EB" />
    case 'sub':
      return <FiBox size={16} color="#0F766E" />
    default:
      return <FiClipboard size={16} color="#64748B" />
  }
}
