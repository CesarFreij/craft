import React, { useState, useMemo } from 'react'
import {
  Box,
  TextField,
  InputAdornment,
  Paper,
  Typography,
  IconButton,
} from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import { FiSearch, FiChevronRight } from 'react-icons/fi'
import type { MaterialNode } from '../types/Material'
import { getNodeIcon } from '../utils/iconUtils'
import { EmptyState } from '../../ui/EmptyState'

interface MaterialTreeProps {
  materials: MaterialNode[]
  selectedNodeId: string | null
  onNodeSelect: (nodeId: string) => void
  onAddMain: (parentId: string | null) => void
  onAddSub: (parentId: string) => void
  selectedNode: MaterialNode | null
}

export const MaterialTree: React.FC<MaterialTreeProps> = ({
  materials,
  selectedNodeId,
  onNodeSelect,
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<string[]>(['root'])

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const visibleMatches = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase()
    if (!normalized) {
      return []
    }

    const matches: string[] = []
    const visit = (nodes: MaterialNode[]) => {
      nodes.forEach((node) => {
        const haystack = `${node.name} ${node.materialNumber}`.toLowerCase()
        if (haystack.includes(normalized)) {
          matches.push(node.id)
          // Expand parent nodes to show search results
          if (!expandedIds.includes(node.id)) {
            setExpandedIds((prev) => [...prev, node.id])
          }
        }
        visit(node.children)
      })
    }

    visit(materials)
    return matches
  }, [searchTerm, materials, expandedIds])

  const toggleNode = (nodeId: string) => {
    setExpandedIds((current) =>
      current.includes(nodeId)
        ? current.filter((item) => item !== nodeId)
        : [...current, nodeId]
    )
  }

  const renderTreeNodes = (nodes: MaterialNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedIds.includes(node.id)
      const isSelected = selectedNodeId === node.id
      const hasChildren = node.children.length > 0

      return (
        <Box key={node.id} sx={{ width: '100%' }}>
          <motion.div
            layout
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <Box
              sx={{
                pl: `${depth * 20}px`,
                pr: 1,
                py: 0.75,
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                minHeight: 42,
                borderRadius: '10px',
                color: 'rgba(255, 255, 255, 0.88)',
                bgcolor: isSelected
                  ? 'rgba(34, 211, 238, 0.13)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid rgba(34, 211, 238, 0.22)'
                  : '1px solid transparent',
                cursor: 'pointer',
                transition:
                  'background 150ms ease, border-color 150ms ease, color 150ms ease',
                '&:hover': {
                  bgcolor: isSelected
                    ? 'rgba(34, 211, 238, 0.18)'
                    : 'rgba(56, 189, 248, 0.08)',
                },
              }}
              onClick={() => onNodeSelect(node.id)}
            >
              {hasChildren && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleNode(node.id)
                  }}
                  sx={{
                    p: 0.25,
                    minWidth: 24,
                    width: 24,
                    height: 24,
                    color: isSelected ? '#67E8F9' : 'rgba(255, 255, 255, 0.72)',
                    '&:hover': {
                      color: '#67E8F9',
                      background: 'rgba(34, 211, 238, 0.10)',
                    },
                  }}
                >
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <FiChevronRight size={16} />
                  </motion.div>
                </IconButton>
              )}

              {!hasChildren && <Box sx={{ width: 24 }} />}

              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.75,
                  color: isSelected ? '#67E8F9' : '#93C5FD',
                }}
              >
                {getNodeIcon(node.type, isExpanded)}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    color: isSelected
                      ? 'rgba(255, 255, 255, 0.96)'
                      : 'rgba(255, 255, 255, 0.88)',
                    fontWeight: isSelected ? 700 : 600,
                    fontSize: 13,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.name}
                </Typography>

                <Typography
                  sx={{
                    fontSize: 11,
                    color: isSelected
                      ? 'rgba(103, 232, 249, 0.78)'
                      : 'rgba(255, 255, 255, 0.56)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {node.materialNumber}
                </Typography>
              </Box>
            </Box>
          </motion.div>

          <AnimatePresence initial={false}>
            {hasChildren && isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Box>{renderTreeNodes(node.children, depth + 1)}</Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      )
    })
  }

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        borderRadius: '18px',
        background: 'rgba(248, 250, 252, 0.10)',
        backdropFilter: 'blur(36px) saturate(120%)',
        WebkitBackdropFilter: 'blur(18px) saturate(120%)',
        boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16)',
        color: 'rgba(255, 255, 255, 0.92)',
        backgroundImage: 'none',
        p: 2,
        overflow: 'hidden',

        '& .MuiTypography-root': {
          color: 'inherit',
        },
      }}
    >
      <TextField
        placeholder="ابحث في المواد..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        size="small"
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch size={16} />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          mb: 2,

          '& .MuiOutlinedInput-root': {
            borderRadius: '14px',
            background: 'rgba(255, 255, 255, 0.07)',
            color: 'rgba(255, 255, 255, 0.92)',
          },

          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255, 255, 255, 0.18)',
          },

          '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(103, 232, 249, 0.55)',
          },

          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#67E8F9',
            borderWidth: 1.5,
          },

          '& .MuiInputBase-input': {
            color: 'rgba(255, 255, 255, 0.92)',
            WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
          },

          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(255, 255, 255, 0.58)',
            opacity: 1,
          },

          '& .MuiInputAdornment-root': {
            color: '#E2E8F0',
          },
        }}
      />

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          pr: 0.5,
        }}
      >
        {materials.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: 'grid',
              placeItems: 'center',
              '& .MuiTypography-root': {
                color: 'rgba(255, 255, 255, 0.72)',
              },
            }}
          >
            <EmptyState
              title="لا توجد مواد"
              description="ابدأ بإضافة مادة جديدة"
            />
          </Box>
        ) : (
          renderTreeNodes(materials)
        )}
      </Box>
    </Paper>
  )
}
