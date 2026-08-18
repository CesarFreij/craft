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
                minHeight: 40,
                borderRadius: 1.5,
                bgcolor: isSelected ? 'rgba(37,99,235,0.1)' : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                '&:hover': {
                  bgcolor: isSelected
                    ? 'rgba(37,99,235,0.15)'
                    : 'rgba(37,99,235,0.05)',
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

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {getNodeIcon(node.type, isExpanded)}
              </Box>

              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 600,
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
                    color: 'text.secondary',
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
                <Box>
                  {renderTreeNodes(node.children, depth + 1)}
                </Box>
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
        borderRadius: 2,
        bgcolor: 'background.paper',
        p: 2,
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
            borderRadius: 1.5,
          },
        }}
      />

      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {materials.length === 0 ? (
          <EmptyState
            title="لا توجد مواد"
            description="ابدأ بإضافة مادة جديدة"
          />
        ) : (
          renderTreeNodes(materials)
        )}
      </Box>
    </Paper>
  )
}
