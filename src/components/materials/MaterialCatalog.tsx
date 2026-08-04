import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Paper,
  Skeleton,
  Switch,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material'
import { AnimatePresence, motion } from 'framer-motion'
import {
  FiBox,
  FiChevronRight,
  FiClipboard,
  FiCopy,
  FiFileText,
  FiFolder,
  FiMaximize2,
  FiMinimize2,
  FiMoreHorizontal,
  FiRefreshCw,
  FiScissors,
  FiSearch,
  FiTrash2,
  FiPlus,
  FiEdit2,
} from 'react-icons/fi'
import { EmptyState } from '../ui/EmptyState'

export type MaterialType = 'main' | 'sub'

export interface MaterialNode {
  id: string
  type: MaterialType
  isNonStock?: boolean
  returnability?: string
  materialNumber: string
  name: string
  notes?: string
  unit?: string
  costPrice?: string
  price1?: string
  price2?: string
  price3?: string
  children: MaterialNode[]
}

interface MaterialCatalogProps {
  onLoaded?: () => void
}

type FormValues = {
  returnability: string
  materialNumber: string
  name: string
  notes: string
  unit: string
  costPrice: string
  price1: string
  price2: string
  price3: string
  isNonStock: boolean
}

interface DialogState {
  open: boolean
  mode: 'add' | 'edit' | 'message'
  title: string
  subtitle?: string
  parentId?: string
  nodeType?: MaterialType
  node?: MaterialNode
  message?: string
}

const initialTree: MaterialNode[] = [
  {
    id: 'root',
    type: 'main',
    materialNumber: 'ROOT-01',
    name: 'المواد',
    notes: 'الجذر الرئيسي للكتالوج',
    children: [
      {
        id: 'main-1',
        type: 'main',
        returnability: 'ممتازة',
        materialNumber: 'M-100',
        name: 'مواد غذائية',
        notes: 'مجموعة رئيسية',
        children: [
          {
            id: 'main-2',
            type: 'main',
            returnability: 'مقبولة',
            materialNumber: 'M-101',
            name: 'حلويات',
            notes: 'قسم الحلويات',
            children: [
              {
                id: 'sub-1',
                type: 'sub',
                isNonStock: true,
                returnability: 'عالية',
                materialNumber: 'S-200',
                name: 'شوكولا',
                unit: 'كجم',
                costPrice: '45',
                price1: '60',
                price2: '65',
                price3: '70',
                notes: 'مادة فرعية مثال',
                children: [],
              },
            ],
          },
        ],
      },
    ],
  },
]

const emptyFormValues: FormValues = {
  returnability: '',
  materialNumber: '',
  name: '',
  notes: '',
  unit: '',
  costPrice: '',
  price1: '',
  price2: '',
  price3: '',
  isNonStock: false,
}

const priceLabels = {
  priceLabel1: 'priceLabel1',
  priceLabel2: 'priceLabel2',
  priceLabel3: 'priceLabel3',
}

function cloneNode(node: MaterialNode): MaterialNode {
  return {
    ...node,
    children: node.children.map(cloneNode),
  }
}

function findNodeById(nodes: MaterialNode[], id: string): MaterialNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    const child = findNodeById(node.children, id)
    if (child) {
      return child
    }
  }
  return null
}

function collectNodeIds(nodes: MaterialNode[]): string[] {
  return nodes.flatMap((node) => [node.id, ...collectNodeIds(node.children)])
}

function updateNodeInTree(nodes: MaterialNode[], targetId: string, updater: (node: MaterialNode) => MaterialNode): MaterialNode[] {
  return nodes.map((node) => {
    if (node.id === targetId) {
      return updater(node)
    }
    if (node.children.length) {
      return {
        ...node,
        children: updateNodeInTree(node.children, targetId, updater),
      }
    }
    return node
  })
}

function addChildToParent(nodes: MaterialNode[], parentId: string, child: MaterialNode): MaterialNode[] {
  return nodes.map((node) => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...node.children, child],
      }
    }
    if (node.children.length) {
      return {
        ...node,
        children: addChildToParent(node.children, parentId, child),
      }
    }
    return node
  })
}

function removeNodeFromTree(nodes: MaterialNode[], targetId: string): MaterialNode[] {
  return nodes.reduce<MaterialNode[]>((acc, node) => {
    if (node.id === targetId) {
      return acc
    }
    acc.push({
      ...node,
      children: removeNodeFromTree(node.children, targetId),
    })
    return acc
  }, [])
}

function getNodeChildren(nodes: MaterialNode[], parentId: string): MaterialNode[] {
  const parent = findNodeById(nodes, parentId)
  return parent?.children ?? []
}

function canAcceptChildren(node: MaterialNode | null): boolean {
  if (!node) {
    return true
  }
  return node.type === 'main'
}

function getNodeLabel(type: MaterialType): string {
  switch (type) {
    case 'main':
      return 'مادة رئيسية'
    case 'sub':
      return 'مادة فرعية'
    default:
      return 'مادة'
  }
}

function getNodeIcon(type: MaterialType) {
  switch (type) {
    case 'main':
      return <FiFolder size={16} color="#2563EB" />
    case 'sub':
      return <FiBox size={16} color="#0F766E" />
    default:
      return <FiFileText size={16} color="#64748B" />
  }
}

function buildFormValues(node: MaterialNode | null): FormValues {
  if (!node) {
    return { ...emptyFormValues }
  }

  return {
    returnability: node.returnability ?? '',
    materialNumber: node.materialNumber,
    name: node.name,
    notes: node.notes ?? '',
    unit: node.unit ?? '',
    costPrice: node.costPrice ?? '',
    price1: node.price1 ?? '',
    price2: node.price2 ?? '',
    price3: node.price3 ?? '',
    isNonStock: node.isNonStock ?? false,
  }
}

function buildNodeFromValues(type: MaterialType, values: FormValues): MaterialNode {
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    materialNumber: values.materialNumber,
    name: values.name,
    notes: values.notes,
    children: [],
  }

  if (type === 'main') {
    return {
      ...base,
      returnability: values.returnability,
    }
  }

  if (type === 'sub') {
    return {
      ...base,
      returnability: values.returnability,
      unit: values.unit,
      costPrice: values.costPrice,
      price1: values.price1,
      price2: values.price2,
      price3: values.price3,
      isNonStock: values.isNonStock,
    }
  }

  return {
    ...base,
  }
}

function validateForm(values: FormValues, type: MaterialType, parentId: string, tree: MaterialNode[], currentNodeId?: string): string[] {
  const errors: string[] = []

  if (type === 'main' || type === 'sub') {
    if (!values.returnability.trim()) {
      errors.push('يرجى إدخال عائدية المادة.')
    }
    if (!values.materialNumber.trim()) {
      errors.push('يرجى إدخال رقم المادة.')
    }
    if (!values.name.trim()) {
      errors.push('يرجى إدخال اسم المادة.')
    }
  } else if (!values.name.trim()) {
    errors.push('يرجى إدخال اسم المادة.')
  }

  if ((type === 'main' || type === 'sub') && values.materialNumber.trim()) {
    const siblings = getNodeChildren(tree, parentId)
    const allNodes = collectNodeIds(tree)
    const existingNumberNode = tree.flatMap((node) => [node, ...node.children]).find((node) => node.materialNumber === values.materialNumber.trim() && node.id !== currentNodeId)
    if (existingNumberNode) {
      errors.push('رقم المادة موجود بالفعل.')
    }
    if (siblings.some((node) => node.name.trim() === values.name.trim() && node.id !== currentNodeId)) {
      errors.push('اسم المادة موجود بالفعل تحت نفس الأب.')
    }

    if (allNodes.length === 0) {
      return errors
    }
  }

  if ((type === 'main' || type === 'sub') && values.name.trim()) {
    const siblings = getNodeChildren(tree, parentId)
    if (siblings.some((node) => node.name.trim() === values.name.trim() && node.id !== currentNodeId)) {
      errors.push('اسم المادة موجود بالفعل تحت نفس الأب.')
    }
  }

  if (type === 'sub') {
    if (!values.unit.trim()) {
      errors.push('يرجى إدخال الوحدة.')
    }
    if (!values.costPrice.trim()) {
      errors.push('يرجى إدخال سعر التكلفة.')
    }
  }

  return errors
}

function MaterialCatalog({ onLoaded }: MaterialCatalogProps) {
  const [tree, setTree] = useState<MaterialNode[]>(initialTree)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('root')
  const [expandedIds, setExpandedIds] = useState<string[]>(['root'])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [leftWidth, setLeftWidth] = useState(410)
  const [resizing, setResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; nodeId: string } | null>(null)
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: 'add', title: '' })
  const [formValues, setFormValues] = useState<FormValues>({ ...emptyFormValues })
  const [errors, setErrors] = useState<string[]>([])
  const [clipboard, setClipboard] = useState<{ node: MaterialNode; mode: 'copy' | 'cut' } | null>(null)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false)
      onLoaded?.()
    }, 650)
    return () => window.clearTimeout(timer)
  }, [onLoaded])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!resizing) {
        return
      }
      const nextWidth = Math.min(Math.max(event.clientX - 24, 320), 720)
      setLeftWidth(nextWidth)
    }

    const handleMouseUp = () => setResizing(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [resizing])

  const selectedNode = useMemo(() => findNodeById(tree, selectedNodeId) ?? null, [selectedNodeId, tree])

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
        }
        visit(node.children)
      })
    }

    visit(tree)
    return matches
  }, [searchTerm, tree])

  const openAddDialog = (parentId: string, type: MaterialType) => {
    const parent = findNodeById(tree, parentId)
    if (!canAcceptChildren(parent)) {
      setDialog({
        open: true,
        mode: 'message',
        title: 'لا يمكن إضافة عناصر فرعية',
        message: 'المواد الفرعية والمادة غير المخزنية لا تسمح بإضافة عناصر فرعية. يرجى اختيار مادة رئيسية أو الجذر لإضافة عنصر جديد.',
      })
      return
    }

    setDialog({
      open: true,
      mode: 'add',
      title: type === 'main' ? 'إضافة مادة رئيسية' : type === 'sub' ? 'إضافة مادة فرعية' : 'إضافة مادة لا مخزنية',
      subtitle: 'أدخل بيانات المادة الجديدة',
      parentId,
      nodeType: type,
    })
    setErrors([])
    setFormValues({ ...emptyFormValues })
  }

  const openEditDialog = (node: MaterialNode) => {
    setDialog({
      open: true,
      mode: 'edit',
      title: 'تعديل المادة',
      subtitle: node.name,
      node,
      nodeType: node.type,
    })
    setErrors([])
    setFormValues(buildFormValues(node))
  }

  const handleSubmit = () => {
    const activeType = dialog.nodeType ?? selectedNode?.type ?? 'main'
    const parentId = dialog.parentId ?? selectedNode?.id ?? 'root'
    const currentNodeId = dialog.node?.id

    const validationErrors = validateForm(formValues, activeType, parentId, tree, currentNodeId)
    if (validationErrors.length) {
      setErrors(validationErrors)
      return
    }

    if (dialog.mode === 'edit' && dialog.node) {
      setTree((currentTree) => updateNodeInTree(currentTree, dialog.node!.id, (node) => ({ ...node, ...buildNodeFromValues(dialog.node!.type, formValues), id: node.id, children: node.children })))
    } else {
      const newNode = buildNodeFromValues(activeType, formValues)
      setTree((currentTree) => addChildToParent(currentTree, parentId, newNode))
      setSelectedNodeId(newNode.id)
    }

    setDialog({ open: false, mode: 'add', title: '' })
    setErrors([])
  }

  const handleDelete = (nodeId: string) => {
    setTree((currentTree) => removeNodeFromTree(currentTree, nodeId))
    if (selectedNodeId === nodeId) {
      setSelectedNodeId('root')
    }
  }

  const handleCopy = (node: MaterialNode) => {
    setClipboard({ node: cloneNode(node), mode: 'copy' })
  }

  const handleCut = (node: MaterialNode) => {
    setClipboard({ node: cloneNode(node), mode: 'cut' })
  }

  const handlePaste = (targetId: string) => {
    if (!clipboard) {
      return
    }
    const targetNode = findNodeById(tree, targetId)
    if (!canAcceptChildren(targetNode)) {
      setDialog({
        open: true,
        mode: 'message',
        title: 'لا يمكن لصق العنصر هنا',
        message: 'لا يمكن إلحاق عناصر فرعية إلى هذا النوع من المواد. يرجى اختيار مادة رئيسية أو الجذر.',
      })
      return
    }

    const clonedNode = cloneNode(clipboard.node)
    const newId = `${clonedNode.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const pastedNode = { ...clonedNode, id: newId }

    setTree((currentTree) => addChildToParent(currentTree, targetId, pastedNode))
    setSelectedNodeId(newId)

    if (clipboard.mode === 'cut') {
      setTree((currentTree) => removeNodeFromTree(currentTree, clipboard.node.id))
    }
    setClipboard(null)
    setContextMenu(null)
  }

  const handleRefresh = () => {
    setSearchTerm('')
    setExpandedIds(['root'])
    setSelectedNodeId('root')
  }

  const toggleNode = (nodeId: string) => {
    setExpandedIds((current) => (current.includes(nodeId) ? current.filter((item) => item !== nodeId) : [...current, nodeId]))
  }

  const expandAll = () => {
    const allIds = collectNodeIds(tree)
    setExpandedIds(allIds)
  }

  const collapseAll = () => {
    setExpandedIds([])
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Paper sx={{ borderRadius: 4, p: 3, background: '#fff', boxShadow: '0 10px 20px rgba(15, 23, 42, 0.08)' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2.4 }}>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 17 }}>كتالوج المواد</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mt: 0.3 }}>شجرة هرمية مع نموذج تحرير متقدم</Typography>
          </Box>
          <TreeToolbar onExpandAll={expandAll} onCollapseAll={collapseAll} onRefresh={handleRefresh} />
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Skeleton variant="rounded" height={280} sx={{ flex: 1, borderRadius: 3 }} />
            <Skeleton variant="rounded" height={280} sx={{ flex: 1, borderRadius: 3 }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', minHeight: 560 }}>
            <Box sx={{ flex: `0 0 ${leftWidth}px`, minWidth: 320, maxWidth: 720, display: 'flex' }}>
              <MaterialDetailsPanel
                selectedNode={selectedNode}
                onAddChild={openAddDialog}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onCut={handleCut}
                onPaste={handlePaste}
                onRefresh={handleRefresh}
                clipboard={clipboard}
              />
            </Box>
            <Box
              onMouseDown={() => setResizing(true)}
              sx={{ width: 12, cursor: 'col-resize', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <Box sx={{ width: 3, height: '72%', borderRadius: 999, bgcolor: 'rgba(15,23,42,0.12)' }} />
            </Box>
            <Box sx={{ flex: 1, minWidth: 320 }}>
              <MaterialTree
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                tree={tree}
                expandedIds={expandedIds}
                toggleNode={toggleNode}
                selectedNodeId={selectedNodeId}
                setSelectedNodeId={setSelectedNodeId}
                visibleMatches={visibleMatches}
                onContextMenu={(event, nodeId) => {
                  event.preventDefault()
                  setContextMenu({ mouseX: event.clientX, mouseY: event.clientY, nodeId })
                  setSelectedNodeId(nodeId)
                }}
                onAddChild={openAddDialog}
                onEdit={openEditDialog}
                onDelete={handleDelete}
                onCopy={handleCopy}
                onCut={handleCut}
                onPaste={handlePaste}
                onRefresh={handleRefresh}
              />
            </Box>
          </Box>
        )}
      </Paper>

      <MaterialDialog
        open={dialog.open}
        title={dialog.title}
        subtitle={dialog.subtitle}
        onClose={() => {
          setDialog({ open: false, mode: 'add', title: '' })
          setErrors([])
        }}
        onConfirm={handleSubmit}
        confirmLabel={dialog.mode === 'message' ? 'حسناً' : 'حفظ'}
      >
        {dialog.mode === 'message' ? (
          <Alert severity="info" sx={{ borderRadius: 3 }}>{dialog.message}</Alert>
        ) : (
          <>
            {errors.length > 0 && <ValidationMessage messages={errors} />}
            <MaterialForm
              type={dialog.nodeType ?? 'main'}
              values={formValues}
              onChange={setFormValues}
              priceLabels={priceLabels}
            />
          </>
        )}
      </MaterialDialog>

      <ContextMenu
        anchor={{ x: contextMenu?.mouseX ?? 0, y: contextMenu?.mouseY ?? 0 }}
        open={Boolean(contextMenu)}
        onClose={() => setContextMenu(null)}
        selectedNode={selectedNode}
        onAddChild={openAddDialog}
        onEdit={openEditDialog}
        onDelete={handleDelete}
        onCopy={handleCopy}
        onCut={handleCut}
        onPaste={handlePaste}
        onRefresh={handleRefresh}
        clipboard={clipboard}
        nodeId={contextMenu?.nodeId ?? selectedNodeId}
      />
    </Box>
  )
}

interface TreePanelProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  tree: MaterialNode[]
  expandedIds: string[]
  toggleNode: (nodeId: string) => void
  selectedNodeId: string
  setSelectedNodeId: (nodeId: string) => void
  visibleMatches: string[]
  onContextMenu: (event: React.MouseEvent<HTMLElement>, nodeId: string) => void
  onAddChild: (parentId: string, type: MaterialType) => void
  onEdit: (node: MaterialNode) => void
  onDelete: (nodeId: string) => void
  onCopy: (node: MaterialNode) => void
  onCut: (node: MaterialNode) => void
  onPaste: (nodeId: string) => void
  onRefresh: () => void
}

interface TreeToolbarProps {
  onExpandAll: () => void
  onCollapseAll: () => void
  onRefresh: () => void
}

function TreeToolbar({ onExpandAll, onCollapseAll, onRefresh }: TreeToolbarProps) {
  const theme = useTheme()

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Tooltip title="توسيع الكل" placement="bottom">
        <IconButton aria-label="توسيع الكل" onClick={onExpandAll} size="small" sx={{ bgcolor: 'rgba(37,99,235,0.08)', color: theme.palette.primary.main, border: '1px solid rgba(37, 99, 235, 0.12)' }}>
          <FiMaximize2 size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="طي الكل" placement="bottom">
        <IconButton aria-label="طي الكل" onClick={onCollapseAll} size="small" sx={{ bgcolor: 'rgba(15,23,42,0.04)', color: '#334155', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <FiMinimize2 size={16} />
        </IconButton>
      </Tooltip>
      <Tooltip title="تحديث" placement="bottom">
        <IconButton aria-label="تحديث" onClick={onRefresh} size="small" sx={{ bgcolor: 'rgba(15,23,42,0.04)', color: '#334155', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
          <FiRefreshCw size={16} />
        </IconButton>
      </Tooltip>
    </Box>
  )
}

interface TreeNodeProps {
  node: MaterialNode
  depth: number
  isExpanded: boolean
  isSelected: boolean
  isMatch: boolean
  onToggle: (nodeId: string) => void
  onSelect: (nodeId: string) => void
  onContextMenu: (event: React.MouseEvent<HTMLElement>, nodeId: string) => void
}

function TreeNode({ node, depth, isExpanded, isSelected, isMatch, onToggle, onSelect, onContextMenu }: TreeNodeProps) {
  const theme = useTheme()
  const hasChildren = node.children.length > 0
  const iconColor = node.type === 'main' ? theme.palette.primary.main : node.type === 'sub' ? '#0F766E' : '#64748B'
  const indent = depth * 24

  return (
    <Box sx={{ position: 'relative', pl: `${indent}px`, pr: 0.75, py: 0.15, width: '100%', minWidth: 0 }}>
      {depth > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: -10,
            bottom: 20,
            left: 12 + (depth - 1) * 24,
            width: 1,
            // bgcolor: 'rgba(148, 163, 184, 0.32)',
          }}
        />
      )}

      <motion.div layout initial={{ opacity: 0, y: -3 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => onSelect(node.id)}
          onContextMenu={(event) => onContextMenu(event, node.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelect(node.id)
            }
          }}
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: 40,
            px: 0.75,
            borderRadius: 1.75,
            bgcolor: isSelected ? 'rgba(37,99,235,0.12)' : 'transparent',
            transition: 'all 0.18s ease',
            cursor: 'pointer',
            overflow: 'hidden',
            width: '100%',
            minWidth: 0,
            '&:hover': {
              bgcolor: isSelected ? ' rgba(37,99,235,0.05))' : 'rgba(37,99,235,0.05)',
            },
          }}
        >
          <Box sx={{ width: 20, minWidth: 20, display: 'grid', placeItems: 'center', flexShrink: 0 }}>
            {hasChildren ? (
              <IconButton
                aria-label={isExpanded ? 'طي الفرع' : 'توسيع الفرع'}
                size="small"
                onClick={(event) => {
                  event.stopPropagation()
                  onToggle(node.id)
                }}
                sx={{
                  p: 0,
                  minWidth: 18,
                  width: 18,
                  height: 18,
                  color: '#334155',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 0,
                  bgcolor: 'transparent',
                  '&:hover': {
                    bgcolor: 'transparent',
                    color: theme.palette.primary.main,
                  },
                }}
              >
                <motion.span animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.18, ease: 'easeOut' }}>
                  <FiChevronRight size={18} />
                </motion.span>
              </IconButton>
            ) : (
              <Box sx={{ width: 18, height: 18, display: 'grid', placeItems: 'center' }}>
                <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: 'rgba(148,163,184,0.55)' }} />
              </Box>
            )}
          </Box>

          <Box
            sx={{
              width: 30,
              height: 30,
              display: 'grid',
              placeItems: 'center',
              color: iconColor,
              flexShrink: 0,
            }}
          >
            {getNodeIcon(node.type)}
          </Box>

          <Box sx={{ flexGrow: 1, minWidth: 0, overflow: 'hidden' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 13.2, lineHeight: 1.25, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.name}</Typography>
            <Typography sx={{ fontSize: 11.6, color: 'text.secondary', mt: 0.05, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.materialNumber}</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0, ml: 0.2 }}>
            {isMatch && <Chip label="نتيجة" size="small" color="primary" variant="outlined" />}
          </Box>
        </Box>
      </motion.div>
    </Box>
  )
}

function MaterialTree({
  searchTerm,
  onSearchChange,
  tree,
  expandedIds,
  toggleNode,
  selectedNodeId,
  setSelectedNodeId,
  visibleMatches,
  onContextMenu,
}: TreePanelProps) {
  const renderTree = (nodes: MaterialNode[], depth = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedIds.includes(node.id) || node.children.length === 0
      const isMatch = visibleMatches.includes(node.id)
      const isSelected = selectedNodeId === node.id
      const hasChildren = node.children.length > 0
      const showChildren = hasChildren && isExpanded

      return (
        <Box key={node.id}>
          <TreeNode
            node={node}
            depth={depth}
            isExpanded={isExpanded}
            isSelected={isSelected}
            isMatch={isMatch}
            onToggle={toggleNode}
            onSelect={setSelectedNodeId}
            onContextMenu={onContextMenu}
          />
          <AnimatePresence initial={false}>
            {showChildren && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
              >
                <Box sx={{ pt: 0.2, pb: 0.2 }}>{renderTree(node.children, depth + 1)}</Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      )
    })
  }

  return (
    <Box sx={{ borderRadius: 4, p: 2.2, bgcolor: 'rgba(248,250,252,0.92)', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid rgba(15, 23, 42, 0.06)', minWidth: 0 }}>
      <SearchTree value={searchTerm} onChange={onSearchChange} />
      <Box sx={{ padding: '16px', overflowY: 'auto', overflowX: 'hidden', flex: 1, pr: 0.5, py: 0.4, minWidth: 0 }}>
        {tree.length === 0 ? (
          <EmptyState title="لا توجد مواد بعد" description="ابدأ بإضافة مادة رئيسية أو فرعية" />
        ) : (
          <Box sx={{ width: '100%', minWidth: 0 }}>{renderTree(tree)}</Box>
        )}
      </Box>
    </Box>
  )
}

interface MaterialDetailsPanelProps {
  selectedNode: MaterialNode | null
  onAddChild: (parentId: string, type: MaterialType) => void
  onEdit: (node: MaterialNode) => void
  onDelete: (nodeId: string) => void
  onCopy: (node: MaterialNode) => void
  onCut: (node: MaterialNode) => void
  onPaste: (nodeId: string) => void
  onRefresh: () => void
  clipboard: { node: MaterialNode; mode: 'copy' | 'cut' } | null
}

function MaterialDetailsPanel({ selectedNode, onAddChild, onEdit, onDelete, onCopy, onCut, onPaste, clipboard }: MaterialDetailsPanelProps) {
  const canHaveChildren = selectedNode?.type === 'main' || !selectedNode

  return (
    <Box sx={{ borderRadius: 4, p: 3, bgcolor: 'rgba(248,250,252,0.92)', height: '100%', display: 'flex', flexDirection: 'column', gap: 2, border: '1px solid rgba(15, 23, 42, 0.06)' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: 16 }}>تفاصيل المادة</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize: 12, mt: 0.25 }}>اختر عقدة من الشجرة لتعديل أو إضافة عناصر جديدة</Typography>
        </Box>
      </Box>
      {!selectedNode ? (
        <EmptyState title="لم يتم اختيار مادة" description="حدد عقدة في الشجرة لعرض التفاصيل" />
      ) : (
        <>
          <Paper sx={{ p: 2.5, borderRadius: 3, bgcolor: '#fff', border: '1px solid rgba(15, 23, 42, 0.06)', boxShadow: '0 12px 30px rgba(15, 23, 42, 0.04)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1.3 }}>
              {getNodeIcon(selectedNode.type)}
              <Typography sx={{ fontWeight: 800 }}>{selectedNode.name}</Typography>
            </Box>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 1.2 }}>رقم المادة: {selectedNode.materialNumber}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13, mb: 1.2 }}>النوع: {getNodeLabel(selectedNode.type)}</Typography>
            <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>{selectedNode.notes || 'لا توجد ملاحظات'}</Typography>
          </Paper>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Chip label={selectedNode.type === 'main' ? 'مادة رئيسية' : selectedNode.type === 'sub' ? 'مادة فرعية' : 'مادة لا مخزنية'} color="primary" variant="outlined" />
            {clipboard && <Chip label={clipboard.mode === 'cut' ? 'تم قصه' : 'تم نسخه'} color="secondary" variant="outlined" />}
          </Box>

          <Divider />

          <Box sx={{ display: 'grid', gap: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14 }}>الإجراءات</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <ActionButton label="مادة رئيسية" icon={<FiFolder size={18} />} onClick={() => onAddChild(selectedNode.id, 'main')} disabled={!canHaveChildren} />
              <ActionButton label="مادة فرعية" icon={<FiBox size={18} />} onClick={() => onAddChild(selectedNode.id, 'sub')} disabled={!canHaveChildren} />
              <ActionButton label="تعديل" icon={<FiEdit2 size={18} />} onClick={() => onEdit(selectedNode)} />
              <ActionButton label="حذف" icon={<FiTrash2 size={18} />} onClick={() => onDelete(selectedNode.id)} />
              <ActionButton label="نسخ" icon={<FiCopy size={18} />} onClick={() => onCopy(selectedNode)} />
              <ActionButton label="قص" icon={<FiScissors size={18} />} onClick={() => onCut(selectedNode)} />
              <ActionButton label="لصق" icon={<FiClipboard size={18} />} onClick={() => onPaste(selectedNode.id)} disabled={!clipboard} />
            </Box>
          </Box>
        </>
      )}
    </Box>
  )
}

interface SearchTreeProps {
  value: string
  onChange: (value: string) => void
}

function SearchTree({ value, onChange }: SearchTreeProps) {
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder="ابحث في المواد"
      fullWidth
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <FiSearch />
            </InputAdornment>
          ),
        },
      }}
      sx={{
        bgcolor: '#fff',
        borderRadius: 3,
        '& .MuiOutlinedInput-root': {
          borderRadius: 3,
          minHeight: 46,
          '& fieldset': { borderColor: 'rgba(15, 23, 42, 0.12)' },
          '&:hover fieldset': { borderColor: 'rgba(37, 99, 235, 0.3)' },
          '&.Mui-focused fieldset': { borderColor: '#2563EB', boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)' },
        },
      }}
    />
  )
}

interface ContextMenuProps {
  anchor: { x: number; y: number }
  open: boolean
  onClose: () => void
  selectedNode: MaterialNode | null
  onAddChild: (parentId: string, type: MaterialType) => void
  onEdit: (node: MaterialNode) => void
  onDelete: (nodeId: string) => void
  onCopy: (node: MaterialNode) => void
  onCut: (node: MaterialNode) => void
  onPaste: (nodeId: string) => void
  onRefresh: () => void
  clipboard: { node: MaterialNode; mode: 'copy' | 'cut' } | null
  nodeId: string
}

function ContextMenu({ anchor, open, onClose, selectedNode, onAddChild, onEdit, onDelete, onCopy, onCut, onPaste, onRefresh, clipboard, nodeId }: ContextMenuProps) {
  const canAddChildren = !selectedNode || selectedNode.type === 'main'
  return (
    <Menu
      open={open}
      onClose={onClose}
      anchorReference="anchorPosition"
      anchorPosition={open ? { top: anchor.y, left: anchor.x } : undefined}
    >
      <MenuItem disabled={!canAddChildren} onClick={() => { onAddChild(nodeId, 'main'); onClose() }}>
        <FiFolder size={14} style={{ marginLeft: 8 }} /> إضافة مادة رئيسية
      </MenuItem>
      <MenuItem disabled={!canAddChildren} onClick={() => { onAddChild(nodeId, 'sub'); onClose() }}>
        <FiBox size={14} style={{ marginLeft: 8 }} /> إضافة مادة فرعية
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => { if (selectedNode) { onEdit(selectedNode); onClose() } }}>
        <FiEdit2 size={14} style={{ marginLeft: 8 }} /> تعديل
      </MenuItem>
      <MenuItem onClick={() => { if (selectedNode) { onDelete(selectedNode.id); onClose() } }}>
        <FiTrash2 size={14} style={{ marginLeft: 8 }} /> حذف
      </MenuItem>
      <MenuItem onClick={() => { if (selectedNode) { onCopy(selectedNode); onClose() } }}>
        <FiCopy size={14} style={{ marginLeft: 8 }} /> نسخ
      </MenuItem>
      <MenuItem onClick={() => { if (selectedNode) { onCut(selectedNode); onClose() } }}>
        <FiScissors size={14} style={{ marginLeft: 8 }} /> قص
      </MenuItem>
      <MenuItem disabled={!clipboard} onClick={() => { onPaste(nodeId); onClose() }}>
        <FiClipboard size={14} style={{ marginLeft: 8 }} /> لصق
      </MenuItem>
      <Divider />
      <MenuItem onClick={() => { onRefresh(); onClose() }}>
        <FiRefreshCw size={14} style={{ marginLeft: 8 }} /> تحديث
      </MenuItem>
    </Menu>
  )
}

interface MaterialDialogProps {
  open: boolean
  title: string
  subtitle?: string
  onClose: () => void
  onConfirm: () => void
  confirmLabel?: string
  children: React.ReactNode
}

function MaterialDialog({ open, title, subtitle, onClose, onConfirm, confirmLabel = 'حفظ', children }: MaterialDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md" slotProps={{ paper: { sx: { borderRadius: 4, p: 1, boxShadow: '0 24px 80px rgba(15, 23, 42, 0.16)' } } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 20 }}>{title}</DialogTitle>
      {subtitle && <Typography sx={{ px: 3, color: 'text.secondary' }}>{subtitle}</Typography>}
      <DialogContent dividers>{children}</DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <IconButton onClick={onClose} size="small"><FiMoreHorizontal /></IconButton>
        <Box sx={{ flexGrow: 1 }} />
        <IconButton onClick={onConfirm} color="primary" sx={{ bgcolor: 'rgba(37,99,235,0.08)', borderRadius: 2, px: 2 }}>
          <FiPlus size={16} style={{ marginLeft: 6 }} />
          <Typography sx={{ fontWeight: 700 }}>{confirmLabel}</Typography>
        </IconButton>
      </DialogActions>
    </Dialog>
  )
}

interface ValidationMessageProps {
  messages: string[]
}

function ValidationMessage({ messages }: ValidationMessageProps) {
  return (
    <Alert severity="error" sx={{ mb: 2, borderRadius: 3 }}>
      <Box component="ul" sx={{ m: 0, pr: 2 }}>
        {messages.map((message) => (
          <li key={message}>{message}</li>
        ))}
      </Box>
    </Alert>
  )
}

interface MaterialFormProps {
  type: MaterialType
  values: FormValues
  onChange: (values: FormValues) => void
  priceLabels: Record<'priceLabel1' | 'priceLabel2' | 'priceLabel3', string>
}

function ActionButton({ label, icon, onClick, disabled = false }: { label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <Tooltip title={label} placement="bottom">
      <span>
        <IconButton
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
          sx={{
            minHeight: 42,
            px: 1.4,
            borderRadius: 2.2,
            bgcolor: disabled ? 'rgba(15, 23, 42, 0.04)' : '#fff',
            border: disabled ? '1px solid rgba(15, 23, 42, 0.06)' : '1px solid rgba(37, 99, 235, 0.16)',
            color: disabled ? '#94A3B8' : '#1D4ED8',
            boxShadow: disabled ? 'none' : '0 10px 24px rgba(37, 99, 235, 0.08)',
            '&:hover': {
              bgcolor: disabled ? 'rgba(15, 23, 42, 0.04)' : 'rgba(37, 99, 235, 0.09)',
              transform: 'translateY(-1px)',
            },
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography sx={{ fontSize: 13, fontWeight: 700 }}>{label}</Typography>
          </Box>
        </IconButton>
      </span>
    </Tooltip>
  )
}

function MaterialForm({ type, values, onChange, priceLabels }: MaterialFormProps) {
  const updateField = (field: keyof FormValues, nextValue: string | boolean) => {
    onChange({ ...values, [field]: nextValue })
  }

  if (type === 'main') {
    return <MainMaterialForm values={values} onChange={updateField} />
  }

  if (type === 'sub') {
    return <SubMaterialForm values={values} onChange={updateField} priceLabels={priceLabels} />
  }

  return <NonStockMaterialForm values={values} onChange={updateField} />
}

interface MainMaterialFormProps {
  values: FormValues
  onChange: (field: keyof FormValues, value: string | boolean) => void
}

function MainMaterialForm({ values, onChange }: MainMaterialFormProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <TextField label="عائدية المادة" required value={values.returnability} onChange={(event) => onChange('returnability', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="رقم المادة" required value={values.materialNumber} onChange={(event) => onChange('materialNumber', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="اسم المادة" required value={values.name} onChange={(event) => onChange('name', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="ملاحظات" multiline minRows={4} value={values.notes} onChange={(event) => onChange('notes', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
    </Box>
  )
}

interface SubMaterialFormProps {
  values: FormValues
  onChange: (field: keyof FormValues, value: string | boolean) => void
  priceLabels: Record<'priceLabel1' | 'priceLabel2' | 'priceLabel3', string>
}

function SubMaterialForm({ values, onChange, priceLabels }: SubMaterialFormProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <TextField label="عائدية المادة" required value={values.returnability} onChange={(event) => onChange('returnability', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="رقم المادة" required value={values.materialNumber} onChange={(event) => onChange('materialNumber', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="اسم المادة" required value={values.name} onChange={(event) => onChange('name', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="الوحدة" required value={values.unit} onChange={(event) => onChange('unit', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="سعر التكلفة" required value={values.costPrice} onChange={(event) => onChange('costPrice', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label={priceLabels.priceLabel1} value={values.price1} onChange={(event) => onChange('price1', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label={priceLabels.priceLabel2} value={values.price2} onChange={(event) => onChange('price2', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label={priceLabels.priceLabel3} value={values.price3} onChange={(event) => onChange('price3', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <FormControlLabel
        control={<Switch checked={values.isNonStock} onChange={(event) => onChange('isNonStock', event.target.checked)} color="primary" />}
        label="مادة لا مخزنية"
        sx={{ mt: 0.5 }}
      />
      <TextField label="ملاحظات" multiline minRows={4} value={values.notes} onChange={(event) => onChange('notes', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
    </Box>
  )
}

interface NonStockMaterialFormProps {
  values: FormValues
  onChange: (field: keyof FormValues, value: string | boolean) => void
}

function NonStockMaterialForm({ values, onChange }: NonStockMaterialFormProps) {
  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <TextField label="اسم المادة" required value={values.name} onChange={(event) => onChange('name', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5, minHeight: 48 } }} />
      <TextField label="ملاحظات" multiline minRows={4} value={values.notes} onChange={(event) => onChange('notes', event.target.value)} sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2.5 } }} />
    </Box>
  )
}

export { MaterialCatalog }

export default MaterialCatalog
