import { useEffect, useState, useMemo, useCallback } from 'react'
import {
  Box,
  Paper,
  Button,
  Typography,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Autocomplete,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  FormControl,
  InputLabel,
} from '@mui/material'
import { inventoryService } from '../../services/inventoryService'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiPlus,
  FiFolder,
  FiBox,
  FiFileText,
  FiChevronRight,
  FiEdit2,
  FiTrash2,
} from 'react-icons/fi'
import { materialsService } from '../../services/materialsService'
import type { MaterialRecord } from '../../services/materialsService'
import { loadSettings } from '../../services/settingsService'
import { formatCurrencyValue } from '../../utils/displayFormatting'
import { getUserFriendlyErrorMessage } from '../../utils/errorMessages'
import { useNotifications } from '../../contexts/useNotifications'

export type MaterialType = 'main' | 'sub'

export interface MaterialNode {
  id: string
  type: MaterialType
  parentId: string | null
  isNonStock?: boolean
  returnability?: string
  materialNumber: string
  name: string
  notes?: string
  unit?: string
  openingBalance?: number | null
  openingWarehouseId?: string | null
  costPrice?: string
  price1?: string
  price2?: string
  price3?: string
  children: MaterialNode[]
}

interface MaterialCatalogProps {
  onLoaded?: () => void
}

const initialTree: MaterialNode[] = []

const darkPopupPaperSx = {
  mt: 0.75,
  borderRadius: '12px',
  background: 'rgba(8, 22, 48, 0.97)',
  backdropFilter: 'blur(22px) saturate(125%)',
  WebkitBackdropFilter: 'blur(22px) saturate(125%)',
  border: '1px solid rgba(255, 255, 255, 0.14)',
  boxShadow: '0 20px 50px rgba(2, 6, 23, 0.38)',
  color: 'rgba(255, 255, 255, 0.92)',
  backgroundImage: 'none',
  '& .MuiMenuItem-root': {
    color: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '8px',
    mx: 0.5,
    my: 0.25,
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.10)',
    },
    '&.Mui-selected': {
      color: '#67E8F9',
      background: 'rgba(34, 211, 238, 0.13)',
    },
    '&.Mui-selected:hover': {
      background: 'rgba(34, 211, 238, 0.18)',
    },
  },
}

const craftDialogSlotProps = {
  backdrop: {
    sx: {
      backgroundColor: 'rgba(2, 6, 23, 0.62)',
      backdropFilter: 'blur(5px)',
      WebkitBackdropFilter: 'blur(5px)',
    },
  },
  paper: {
    sx: {
      borderRadius: '18px',
      background: 'rgba(8, 22, 48, 0.97) !important',
      backgroundColor: 'rgba(8, 22, 48, 0.97) !important',
      backgroundImage: 'none !important',
      backdropFilter: 'blur(28px) saturate(125%)',
      WebkitBackdropFilter: 'blur(28px) saturate(125%)',
      border: '1px solid rgba(148, 197, 255, 0.16)',
      boxShadow: '0 28px 72px rgba(2, 6, 23, 0.46)',
      color: 'rgba(255, 255, 255, 0.92)',
      overflow: 'hidden',

      '& .MuiDialogTitle-root': {
        color: 'rgba(255, 255, 255, 0.96)',
        fontWeight: 800,
        px: 3,
        pt: 2.5,
        pb: 1.2,
      },

      '& .MuiDialogContent-root': {
        color: 'rgba(255, 255, 255, 0.88)',
        borderColor: 'rgba(255, 255, 255, 0.12)',
      },

      '& .MuiTypography-root': {
        color: 'rgba(255, 255, 255, 0.88)',
      },

      '& .MuiOutlinedInput-root': {
        borderRadius: '14px',
        background: 'rgba(255, 255, 255, 0.07)',
        color: 'rgba(255, 255, 255, 0.92)',
        '&:hover': {
          background: 'rgba(255, 255, 255, 0.09)',
        },
        '&:hover .MuiOutlinedInput-notchedOutline': {
          borderColor: 'rgba(103, 232, 249, 0.55)',
        },
        '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
          borderColor: '#67E8F9',
          borderWidth: 1.5,
        },
      },

      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: 'rgba(203, 213, 225, 0.22)',
      },

      '& .MuiInputBase-input': {
        color: 'rgba(255, 255, 255, 0.92)',
        WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
      },

      '& .MuiInputBase-input.Mui-disabled': {
        WebkitTextFillColor: 'rgba(255, 255, 255, 0.48)',
      },

      '& input[type="number"]': {
        colorScheme: 'dark',
      },

      '& input[type="number"]::-webkit-inner-spin-button, & input[type="number"]::-webkit-outer-spin-button': {
        opacity: 0.88,
        cursor: 'pointer',
      },

      '& .MuiInputLabel-root': {
        color: 'rgba(226, 232, 240, 0.72)',
      },

      '& .MuiInputLabel-root.Mui-focused': {
        color: '#67E8F9',
      },

      '& .MuiSelect-icon, & .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
        color: 'rgba(255, 255, 255, 0.78)',
      },

      '& .MuiFormHelperText-root': {
        color: 'rgba(255, 255, 255, 0.62)',
      },

      '& .MuiFormHelperText-root.Mui-error': {
        color: '#FCA5A5',
      },

      '& .MuiButton-text': {
        color: '#CBD5E1',
      },
    },
  },
}

const craftErrorAlertSx = {
  background: 'rgb(92 18 18 / 50%) !important',
  backgroundColor: 'rgb(92 18 18 / 50%) !important',
  color: '#FEE2E2 !important',
  border: '1px solid rgba(248, 113, 113, 0.58)',
  borderRadius: '14px',
  '& .MuiAlert-icon': {
    color: '#FCA5A5',
  },
  '& .MuiAlert-message': {
    color: '#FEE2E2',
    fontWeight: 700,
  },
}

const craftPanelSx = {
  borderRadius: '18px',
  background: 'rgba(248, 250, 252, 0.10)',
  backdropFilter: 'blur(36px) saturate(120%)',
  WebkitBackdropFilter: 'blur(18px) saturate(120%)',
  border: 'none',
  color: 'rgba(255, 255, 255, 0.92)',
  backgroundImage: 'none',
}


// Dialog types
interface DialogState {
  open: boolean
  mode: 'add-main' | 'add-sub' | 'edit' | 'delete' | 'error' | null
  parentId?: string | null
  nodeId?: string | null
}

interface FormData {
  returnability: string
  materialNumber: string
  name: string
  unit: string
  openingBalance?: number | string
  openingWarehouseId?: string
  costPrice: string
  price1: string
  price2: string
  price3: string
  notes: string
  isNonStock: boolean
}

const emptyForm: FormData = {
  returnability: '',
  materialNumber: '',
  name: '',
  unit: '',
  openingBalance: '',
  openingWarehouseId: '',
  costPrice: '',
  price1: '',
  price2: '',
  price3: '',
  notes: '',
  isNonStock: false,
}

// Legacy static options removed from runtime usage. Suggestions come from DB via `unitOptionsState`.

function findNodeById(nodes: MaterialNode[], id: string | null): MaterialNode | null {
  if (!id) return null
  for (const node of nodes) {
    if (node.id === id) return node
    const found = findNodeById(node.children, id)
    if (found) return found
  }
  return null
}


function countSubtree(node: MaterialNode) {
  const counts = { main: 0, sub: 0, nonStock: 0, total: 0 }

  const traverse = (current: MaterialNode) => {
    if (current.type === 'main') {
      counts.main += 1
    } else {
      counts.sub += 1
    }
    if (current.isNonStock) {
      counts.nonStock += 1
    }
    counts.total += 1
    current.children.forEach(traverse)
  }

  traverse(node)
  return counts
}

function hasNegativeNumericValue(value: string | number | null | undefined): boolean {
  if (value === '' || value === null || typeof value === 'undefined') {
    return false
  }

  const numericValue = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(numericValue) && numericValue < 0
}

function getNodeReturnabilityDisplay(materials: MaterialNode[], node: MaterialNode | null): string {
  if (!node) {
    return 'لا يوجد'
  }

  const parent = node.parentId ? findNodeById(materials, node.parentId) : null
  if (!parent) {
    return 'لا يوجد'
  }

  return `${parent.materialNumber}-${parent.name}`
}

export function MaterialCatalog({ onLoaded }: MaterialCatalogProps) {
  const settings = loadSettings()
  const notify = useNotifications()
  const salesPrice1Label = settings.salesPrice1Name || 'سعر البيع الأول'
  const salesPrice2Label = settings.salesPrice2Name || 'سعر البيع الثاني'
  const salesPrice3Label = settings.salesPrice3Name || 'سعر البيع الثالث'

  const [materials, setMaterials] = useState<MaterialNode[]>(initialTree)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [treeWidth, setTreeWidth] = useState(40)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [dialog, setDialog] = useState<DialogState>({ open: false, mode: null })
  const [formData, setFormData] = useState<FormData>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [errorMessage, setErrorMessage] = useState('')
  const [unitOptionsState, setUnitOptionsState] = useState<string[]>([])
  const [warehouses, setWarehouses] = useState<{id:string,name:string,status?:string}[]>([])
  const [subMaterialAverageCost, setSubMaterialAverageCost] = useState(0)

  const openingWarehouseRequired = Number(formData.openingBalance || 0) > 0

  const extractUnitsFromRecords = useCallback((records: MaterialRecord[]): string[] => {
    const flattened: MaterialRecord[] = []
    const walk = (items: MaterialRecord[]) => {
      for (const item of items) {
        flattened.push(item)
        if (item.children?.length) walk(item.children)
      }
    }
    walk(records)
    const units = Array.from(new Set(flattened.map(item => (item.unit ?? '').trim()).filter(unit => unit.length > 0)))
    return units
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      onLoaded?.()
    }, 300)
    return () => clearTimeout(timer)
  }, [onLoaded])

  const convertMaterialRecords = useCallback(function convertMaterialRecords(records: MaterialRecord[]): MaterialNode[] {
    return records.map((r) => ({
      id: r.id,
      type: r.type,
      parentId: r.parentId ?? null,
      isNonStock: r.isNonStock ?? false,
      returnability: r.returnability ?? '',
      materialNumber: r.materialNumber,
      name: r.name,
      notes: r.notes ?? '',
      unit: r.unit ?? '',
      openingBalance: r.openingBalance ?? null,
      openingWarehouseId: r.openingWarehouseId ?? null,
      costPrice: r.costPrice ?? '',
      price1: r.price1 ?? '',
      price2: r.price2 ?? '',
      price3: r.price3 ?? '',
      children: [],
    }))
  }, [])

  const buildTreeFromRecords = useCallback((records: MaterialRecord[]): MaterialNode[] => {
    const flattenedRecords: MaterialRecord[] = []

    const walkRecords = (items: MaterialRecord[]) => {
      for (const item of items) {
        flattenedRecords.push(item)
        if (Array.isArray(item.children) && item.children.length > 0) {
          walkRecords(item.children)
        }
      }
    }

    walkRecords(records)

    const nodes = convertMaterialRecords(flattenedRecords)
    const byId = new Map<string, MaterialNode>()

    for (const node of nodes) {
      byId.set(node.id, node)
    }

    const roots: MaterialNode[] = []

    for (const node of nodes) {
      const parentId = node.parentId
      if (parentId && byId.has(parentId)) {
        const parent = byId.get(parentId)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    }

    return roots
  }, [convertMaterialRecords])

  useEffect(() => {
    let cancelled = false

    const loadMaterials = async () => {
      try {
        const persisted = await materialsService.listMaterials()
        if (!cancelled) {
          setMaterials(buildTreeFromRecords(persisted))

          // extract unit suggestions
          const flattened: MaterialRecord[] = []

          const walk = (items: MaterialRecord[]) => {
            for (const item of items) {
              flattened.push(item)

              if (item.children?.length) {
                walk(item.children)
              }
            }
          }

          walk(persisted)

              const units = Array.from(
                new Set(
                  flattened
                    .map((item) => (item.unit ?? '').trim())
                    .filter((unit) => unit.length > 0)
                )
              )

              setUnitOptionsState(units)
        }
      } catch (error) {
        console.error('FAILED_TO_LOAD_MATERIALS_FROM_SQLITE', error)
      }
    }

    void loadMaterials()

    return () => {
      cancelled = true
    }
  }, [buildTreeFromRecords])

  const selectedNode = useMemo(() => {
    return findNodeById(materials, selectedNodeId)
  }, [selectedNodeId, materials])

  const selectedNodeReturnability = useMemo(() => {
    return getNodeReturnabilityDisplay(materials, selectedNode)
  }, [materials, selectedNode])

  useEffect(() => {
    let cancelled = false

    const loadAverageCost = async () => {
      if (!selectedNode || selectedNode.type !== 'sub' || selectedNode.isNonStock) {
        setSubMaterialAverageCost(0)
        return
      }

      try {
        const balances = await inventoryService.getBalancesByMaterial(selectedNode.id)
        if (cancelled) return

        const totalQuantity = balances.reduce((sum, balance) => sum + Number(balance.quantity ?? 0), 0)
        if (totalQuantity <= 0) {
          setSubMaterialAverageCost(0)
          return
        }

        const weightedTotal = balances.reduce((sum, balance) => {
          return sum + Number(balance.quantity ?? 0) * Number(balance.averageCost ?? 0)
        }, 0)

        setSubMaterialAverageCost(weightedTotal / totalQuantity)
      } catch (error) {
        console.error('FAILED_TO_LOAD_SUB_MATERIAL_AVERAGE_COST', error)
        if (!cancelled) {
          setSubMaterialAverageCost(0)
        }
      }
    }

    void loadAverageCost()

    return () => {
      cancelled = true
    }
  }, [selectedNode])

  const createNodeId = useCallback((type: MaterialType) => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return `${type}-${crypto.randomUUID()}`
    }
    return `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }, [])


  // Validate form
  const validateForm = useCallback(
    (data: FormData, nodeType: 'main' | 'sub'): Record<string, string> => {
      const errors: Record<string, string> = {}

      if (!data.name.trim()) errors.name = 'اسم المادة مطلوب'
      if (!data.materialNumber.trim()) errors.materialNumber = 'رقم المادة مطلوب'

        if (nodeType === 'sub') {
          if (typeof data.unit !== 'string' || !data.unit.trim()) errors.unit = 'الوحدة مطلوبة'
          // opening warehouse required only when openingBalance > 0
          const ob = typeof data.openingBalance === 'number' ? data.openingBalance : (data.openingBalance ? Number(data.openingBalance) : 0)
          if (ob > 0 && !data.openingWarehouseId) errors.openingWarehouseId = 'يجب اختيار مخزن للرصد الافتتاحي.'
        }

      return errors
    },
    []
  )

  // Dialog handlers
  const openAddMainDialog = useCallback(() => {
    const parent = selectedNode
    const parentId = parent ? parent.id : null
    const returnability = parent ? `${parent.materialNumber}-${parent.name}` : ''

    setFormData({ ...emptyForm, returnability })
    setFormErrors({})
    setDialog({
      open: true,
      mode: 'add-main',
      parentId,
    })
  }, [selectedNode])

  const openAddSubDialog = useCallback(() => {
    if (selectedNode?.type !== 'main') {
      setErrorMessage('يجب تحديد مادة رئيسية أولاً لإضافة مادة فرعية.')
      setDialog({ open: true, mode: 'error' })
      return
    }
    const prefillReturnability = `${selectedNode.materialNumber}-${selectedNode.name}`
    setFormData({ ...emptyForm, returnability: prefillReturnability })
    setFormErrors({})
    setDialog({
      open: true,
      mode: 'add-sub',
      parentId: selectedNode.id,
    })
    // load warehouses for opening warehouse select
    void (async () => {
      try {
        const wh = await inventoryService.listWarehouses()
        setWarehouses(wh.filter(w => w.status === 'active'))
      } catch (e) {
        console.error('FAILED_TO_LOAD_WAREHOUSES', e)
      }
    })()
  }, [selectedNode])

  const openEditDialog = useCallback(() => {
    if (!selectedNode) return

    const data: FormData = {
      returnability: getNodeReturnabilityDisplay(materials, selectedNode),
      materialNumber: selectedNode.materialNumber,
      name: selectedNode.name,
      unit: selectedNode.unit || '',
      openingBalance: selectedNode.openingBalance ?? '',
      openingWarehouseId: selectedNode.openingWarehouseId ?? '',
      costPrice: selectedNode.costPrice || '',
      price1: selectedNode.price1 || '',
      price2: selectedNode.price2 || '',
      price3: selectedNode.price3 || '',
      notes: selectedNode.notes || '',
      isNonStock: selectedNode.isNonStock || false,
    }

    setFormData(data)
    setFormErrors({})
    setDialog({
      open: true,
      mode: 'edit',
      nodeId: selectedNodeId,
    })
  }, [materials, selectedNode, selectedNodeId])

  const openDeleteDialog = useCallback(() => {
    setDialog({
      open: true,
      mode: 'delete',
      nodeId: selectedNodeId,
    })
  }, [selectedNodeId])

  // Form submission
  const handleSaveMain = useCallback(async () => {
    const errors = validateForm(formData, 'main')
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (
      hasNegativeNumericValue(formData.openingBalance) ||
      hasNegativeNumericValue(formData.costPrice) ||
      hasNegativeNumericValue(formData.price1) ||
      hasNegativeNumericValue(formData.price2) ||
      hasNegativeNumericValue(formData.price3)
    ) {
      setErrorMessage('لا يمكن إدخال قيمة سالبة.')
      setDialog({ open: true, mode: 'error' })
      return
    }

    const payload = {
      id: createNodeId('main'),
      type: 'main' as const,
      parentId: dialog.parentId ?? null,
      returnability: formData.returnability,
      materialNumber: formData.materialNumber,
      name: formData.name,
      notes: formData.notes,
      isNonStock: false,
    }

    try {
      const persisted = await materialsService.createMaterial(payload)
      setMaterials(buildTreeFromRecords(persisted))
      // Update unit suggestions only after successful save and persisted data
      try {
        const units = extractUnitsFromRecords(persisted)
        setUnitOptionsState(units)
      } catch (e) {
        console.error('FAILED_TO_EXTRACT_UNITS_AFTER_CREATE', e)
      }
      if (payload.parentId) {
        setExpandedIds((prev) => {
          const next = new Set(prev)
          next.add(payload.parentId as string)
          return next
        })
      }
      setSelectedNodeId(payload.id ?? null)
      setDialog({ open: false, mode: null })
      setFormErrors({})
      notify.success('تمت إضافة المادة بنجاح.')
    } catch (error) {
      console.error('FAILED_TO_CREATE_MAIN_MATERIAL', error)
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حفظ المادة. يرجى المحاولة مرة أخرى.'))
      setDialog({ open: true, mode: 'error' })
    }
  }, [formData, dialog, validateForm, createNodeId, buildTreeFromRecords, extractUnitsFromRecords, notify])

  const handleSaveSub = useCallback(async () => {
    const errors = validateForm(formData, 'sub')
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    if (
      hasNegativeNumericValue(formData.openingBalance) ||
      hasNegativeNumericValue(formData.costPrice) ||
      hasNegativeNumericValue(formData.price1) ||
      hasNegativeNumericValue(formData.price2) ||
      hasNegativeNumericValue(formData.price3)
    ) {
      setErrorMessage('لا يمكن إدخال قيمة سالبة.')
      setDialog({ open: true, mode: 'error' })
      return
    }

    const payload = {
      id: createNodeId('sub'),
      type: 'sub' as const,
      parentId: dialog.parentId ?? null,
      returnability: formData.returnability,
      materialNumber: formData.materialNumber,
      name: formData.name,
      unit: formData.unit,
      openingBalance: formData.openingBalance === '' ? null : (typeof formData.openingBalance === 'number' ? formData.openingBalance : Number(formData.openingBalance)),
      openingWarehouseId: formData.openingWarehouseId || null,
      costPrice: formData.costPrice,
      price1: formData.price1,
      price2: formData.price2,
      price3: formData.price3,
      notes: formData.notes,
      isNonStock: formData.isNonStock,
    }

    try {
      const persisted = await materialsService.createMaterial(payload)
      setMaterials(buildTreeFromRecords(persisted))
      if (payload.parentId) {
        setExpandedIds((prev) => {
          const next = new Set(prev)
          next.add(payload.parentId as string)
          return next
        })
      }
      setSelectedNodeId(payload.id ?? null)
      setDialog({ open: false, mode: null })
      setFormErrors({})
      notify.success('تمت إضافة المادة بنجاح.')
    } catch (error) {
      console.error('FAILED_TO_CREATE_SUB_MATERIAL', error)
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حفظ المادة. يرجى المحاولة مرة أخرى.'))
      setDialog({ open: true, mode: 'error' })
    }
  }, [formData, dialog, validateForm, createNodeId, buildTreeFromRecords, notify])

  const handleSaveEdit = useCallback(async () => {
    if (!dialog.nodeId) return

    const node = findNodeById(materials, dialog.nodeId || null)
    if (!node) return

    const errors = validateForm(formData, node.type)
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors)
      return
    }

    const payload = {
      returnability: formData.returnability,
      materialNumber: formData.materialNumber,
      name: formData.name,
      notes: formData.notes,
      type: node.type,
      parentId: node.parentId ?? null,
      isNonStock: node.type === 'sub' ? formData.isNonStock : false,
      unit: formData.unit,
      openingBalance: formData.openingBalance === '' ? null : (typeof formData.openingBalance === 'number' ? formData.openingBalance : Number(formData.openingBalance)),
      openingWarehouseId: formData.openingWarehouseId || null,
      costPrice: formData.costPrice,
      price1: formData.price1,
      price2: formData.price2,
      price3: formData.price3,
    }

    try {
      const persisted = await materialsService.updateMaterial(dialog.nodeId, payload)
      setMaterials(buildTreeFromRecords(persisted))
      try {
        const units = extractUnitsFromRecords(persisted)
        setUnitOptionsState(units)
      } catch (e) {
        console.error('FAILED_TO_EXTRACT_UNITS_AFTER_UPDATE', e)
      }
      setDialog({ open: false, mode: null })
      setFormErrors({})
      notify.info('تم تعديل المادة بنجاح.')
    } catch (error) {
      console.error('FAILED_TO_UPDATE_MATERIAL', error)
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحديث المادة. يرجى المحاولة مرة أخرى.'))
      setDialog({ open: true, mode: 'error' })
    }
  }, [dialog.nodeId, formData, validateForm, materials, buildTreeFromRecords, extractUnitsFromRecords, notify])

  const handleConfirmDelete = useCallback(async () => {
    if (!dialog.nodeId) return

    try {
      const persisted = await materialsService.deleteMaterial(dialog.nodeId)
      setMaterials(buildTreeFromRecords(persisted))
      try {
        const units = extractUnitsFromRecords(persisted)
        setUnitOptionsState(units)
      } catch (e) {
        console.error('FAILED_TO_EXTRACT_UNITS_AFTER_DELETE', e)
      }
      setDialog({ open: false, mode: null })
      notify.error('تم حذف المادة بنجاح.')
    } catch (error) {
      console.error('FAILED_TO_DELETE_MATERIAL', error)
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حذف المادة. يرجى المحاولة مرة أخرى.'))
      setDialog({ open: true, mode: 'error' })
    }
  }, [dialog.nodeId, buildTreeFromRecords, extractUnitsFromRecords, notify])

  const handleFormChange = useCallback(
    (field: keyof FormData, value: FormData[keyof FormData]) => {
      setFormData((prev) => ({ ...prev, [field]: value }))
      if (formErrors[field]) {
        setFormErrors((prev) => {
          const newErrors = { ...prev }
          delete newErrors[field]
          return newErrors
        })
      }
    },
    [formErrors]
  )

  const deleteCounts = useMemo(
    () => (selectedNode ? countSubtree(selectedNode) : null),
    [selectedNode]
  )

  const toggleNode = useCallback((nodeId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId)
      } else {
        newSet.add(nodeId)
      }
      return newSet
    })
  }, [])

  const canAddSubMaterial = selectedNode?.type === 'main'

  const renderTree = (nodes: MaterialNode[], depth = 0) => {
    return nodes.map((node) => {
      const nodeChildren = Array.isArray(node.children) ? node.children : []
      const isExpanded = expandedIds.has(node.id)
      const isSelected = selectedNodeId === node.id
      const hasChildren = nodeChildren.length > 0
      const showChildren = hasChildren && isExpanded

      return (
        <Box key={node.id}>
          <Box
            sx={{
              pl: `${depth * 24}px`,
              py: 0.5,
              pr: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            {hasChildren ? (
              <motion.button
                onClick={(event) => {
                  event.stopPropagation()
                  toggleNode(node.id)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 20,
                  height: 20,
                  color: isSelected ? '#67E8F9' : 'rgba(255, 255, 255, 0.72)',
                }}
                animate={{ rotate: isExpanded ? 90 : 0 }}
                transition={{ duration: 0.15 }}
              >
                <FiChevronRight size={18} />
              </motion.button>
            ) : (
              <Box sx={{ width: 20 }} />
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {node.type === 'main' && <FiFolder size={16} color="#67E8F9" />}
              {node.type === 'sub' && !node.isNonStock && <FiBox size={16} color="#93C5FD" />}
              {node.type === 'sub' && node.isNonStock && <FiFileText size={16} color="#CBD5E1" />}
            </Box>

            <Box
              onClick={(event) => {
                event.stopPropagation()
                setSelectedNodeId(node.id)
              }}
              sx={{
                flex: 1,
                p: 1,
                borderRadius: '10px',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.88)',
                bgcolor: isSelected
                  ? 'rgba(34, 211, 238, 0.13)'
                  : 'transparent',
                border: isSelected
                  ? '1px solid rgba(34, 211, 238, 0.22)'
                  : '1px solid transparent',
                '&:hover': {
                  bgcolor: isSelected
                    ? 'rgba(34, 211, 238, 0.18)'
                    : 'rgba(56, 189, 248, 0.08)',
                },
              }}
            >
              <Typography
                sx={{
                  fontWeight: isSelected ? 700 : 600,
                  fontSize: 13,
                  lineHeight: 1.3,
                }}
              >
                {node.name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                {node.materialNumber}
              </Typography>
            </Box>
          </Box>

          <AnimatePresence initial={false}>
            {showChildren && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.15 }}
              >
                {renderTree(nodeChildren, depth + 1)}
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      )
    })
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        width: '100%',
        overflow: 'hidden',
        background: 'transparent',
        color: 'rgba(255, 255, 255, 0.92)',
      }}
    >
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          gap: 1.5,
          p: 2,
          flexShrink: 0,
          alignItems: 'center',
          flexWrap: 'wrap',
          borderBottom: '1px solid rgba(255, 255, 255, 0.14)',
          background: 'transparent',
        }}
      >
        <Button
          variant="contained"
          color="primary"
          startIcon={<FiPlus />}
          onClick={openAddMainDialog}
          sx={{
            borderRadius: '12px',
            px: 2.25,
            fontWeight: 700,
          }}
        >
          إضافة مادة رئيسية
        </Button>
        <Tooltip
          title={canAddSubMaterial ? '' : 'يجب تحديد مادة رئيسية أولاً لإضافة مادة فرعية.'}
          placement="bottom"
          disableHoverListener={canAddSubMaterial}
          disableFocusListener={canAddSubMaterial}
        >
          <span>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FiPlus />}
              disabled={!canAddSubMaterial}
              disableRipple={!canAddSubMaterial}
              onClick={openAddSubDialog}
              sx={{
                borderRadius: '12px',
                px: 2.25,
                fontWeight: 700,
                color: '#93C5FD',
                borderColor: 'rgba(96, 165, 250, 0.46)',
                '&:hover': {
                  borderColor: '#60A5FA',
                  background: 'rgba(96, 165, 250, 0.10)',
                },
                '&.Mui-disabled': {
                  cursor: 'not-allowed',
                  pointerEvents: 'auto',
                  opacity: 1,
                  color: 'rgba(203, 213, 225, 0.38)',
                  borderColor: 'rgba(148, 163, 184, 0.16)',
                  background: 'rgba(148, 163, 184, 0.08)',
                },
              }}
            >
              إضافة مادة فرعية
            </Button>
          </span>
        </Tooltip>

        <Box sx={{ flex: 1 }} />


      </Box>

      {/* Main Content */}
      <Box
        sx={{
          display: 'flex',
          minHeight: 0,
          overflow: 'hidden',
          gap: 0,
          alignItems: 'stretch',
        }}
        data-resizable-container
      >
        {/* Tree Panel */}
        <Paper
          elevation={0}
          onClick={() => setSelectedNodeId(null)}
          sx={{
            ...craftPanelSx,
            width: `${treeWidth}%`,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 2,
            m: 2,
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: 14,
              mb: 2,
              color: 'rgba(255, 255, 255, 0.94)',
              flexShrink: 0,
            }}
          >
            شجرة المواد
          </Typography>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
            }}
          >
            {renderTree(materials)}
          </Box>
        </Paper>

        {/* Resizable Divider */}
        <Box
          onMouseDown={(e) => {
            e.preventDefault()
            const startX = e.clientX
            const startWidth = treeWidth

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const container = document.querySelector(
                '[data-resizable-container]'
              ) as HTMLElement
              if (!container) return

              const rect = container.getBoundingClientRect()
              const deltaX = moveEvent.clientX - startX
              const deltaPercent = (deltaX / rect.width) * 100
              const newWidth = Math.max(30, Math.min(70, startWidth - deltaPercent))

              setTreeWidth(newWidth)
            }

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove)
              document.removeEventListener('mouseup', handleMouseUp)
            }

            document.addEventListener('mousemove', handleMouseMove)
            document.addEventListener('mouseup', handleMouseUp)
          }}
          sx={{
            width: 4,
            flexShrink: 0,
            alignSelf: 'center',
            height: '80%',
            maxHeight: '80%',
            minHeight: 0,
            cursor: 'col-resize',
            background: 'linear-gradient(135deg, #0a3697 0%, #0a6fcb 50%, #0cdbeb 100%)rgba(255, 255, 255, 0.16)',
            borderRadius: '999px',
            transition: 'background 160ms ease, box-shadow 160ms ease',
          }}
        />

        {/* Form Panel */}
        <Paper
          elevation={0}
          sx={{
            ...craftPanelSx,
            width: `${100 - treeWidth}%`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            p: 3,
            m: 2,
            boxSizing: 'border-box',
            paddingRight: 0,
          }}
        >
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              overflowX: 'hidden',
              pr: 3,
            }}
          >
            {!selectedNode ? (
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  color: 'rgba(255, 255, 255, 0.72)',
                }}
              >
                اختر مادة من القائمة
              </Box>
            ) : (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 16 }}>
                  {selectedNode.name}
                </Typography>

                {(selectedNode.type === 'main' || selectedNode.type === 'sub') && (
                  <>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        عائدية المادة
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {selectedNodeReturnability}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        رقم المادة
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {selectedNode.materialNumber}
                      </Typography>
                    </Box>
                  </>
                )}

                {selectedNode.type === 'sub' && (
                  <>
                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        الوحدة
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {selectedNode.unit}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        سعر التكلفة
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {formatCurrencyValue(selectedNode.costPrice ?? 0, 'price')}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        متوسط التكلفة
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {formatCurrencyValue(subMaterialAverageCost ?? 0, 'average')}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        {salesPrice1Label}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {formatCurrencyValue(selectedNode.price1 ?? 0, 'price')}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        {salesPrice2Label}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {formatCurrencyValue(selectedNode.price2 ?? 0, 'price')}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        {salesPrice3Label}
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {selectedNode.price3}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                        مادة لا مخزنية
                      </Typography>
                      <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)' }}>
                        {selectedNode.isNonStock ? 'نعم' : 'لا'}
                      </Typography>
                    </Box>
                  </>
                )}

                <Box>
                  <Typography sx={{ fontWeight: 600, fontSize: 12 }}>
                    ملاحظات
                  </Typography>
                  <Typography sx={{ color: 'rgba(255, 255, 255, 0.78)', whiteSpace: 'pre-wrap' }}>
                    {selectedNode.notes || 'لا توجد ملاحظات'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          {selectedNode ? (
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                pt: 2,
                pr: 3,
                flexShrink: 0,
                alignItems: 'center',
              }}
            >
              <Button
                size="small"
                startIcon={<FiEdit2 size={16} />}
                onClick={openEditDialog}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  color: '#60A5FA',
                  '&:hover': {
                    color: '#93C5FD',
                    background: 'rgba(96, 165, 250, 0.12)',
                  },
                }}
              >
                تعديل
              </Button>

              <Button
                size="small"
                startIcon={<FiTrash2 size={16} />}
                onClick={openDeleteDialog}
                color="error"
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                حذف
              </Button>
            </Box>
          ) : null}
        </Paper>
      </Box>

      {/* Add Main Material Dialog */}
      <Dialog
        open={dialog.open && dialog.mode === 'add-main'}
        onClose={() => setDialog({ open: false, mode: null })}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}      >
        <DialogTitle>إضافة مادة رئيسية</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'grid', gap: 2 }}>
          {formErrors.name && (
            <Alert severity="error" sx={craftErrorAlertSx}>{formErrors.name}</Alert>
          )}
          <TextField
            label="عائدية المادة"
            fullWidth
            value={formData.returnability}
            onChange={(e) => handleFormChange('returnability', e.target.value)}
            error={!!formErrors.returnability}
            helperText={formErrors.returnability}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
          <TextField
            label="رقم المادة"
            fullWidth
            required
            value={formData.materialNumber}
            onChange={(e) => handleFormChange('materialNumber', e.target.value)}
            error={!!formErrors.materialNumber}
            helperText={formErrors.materialNumber}
          />
          <TextField
            label="اسم المادة"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            error={!!formErrors.name}
            helperText={formErrors.name}
          />
          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, mode: null })}>
            إلغاء
          </Button>
          <Button onClick={handleSaveMain} variant="contained" color="primary">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Sub Material Dialog */}
      <Dialog
        open={dialog.open && dialog.mode === 'add-sub'}
        onClose={() => setDialog({ open: false, mode: null })}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}      >
        <DialogTitle>إضافة مادة فرعية</DialogTitle>
        <DialogContent sx={{ pt: '16px !important', display: 'grid', gap: 2 }}>
          {Object.keys(formErrors).length > 0 && (
            <Alert severity="error" sx={craftErrorAlertSx}>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {Object.values(formErrors).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </Box>
            </Alert>
          )}
          <TextField
            label="عائدية المادة"
            fullWidth
            value={formData.returnability}
            onChange={(e) => handleFormChange('returnability', e.target.value)}
            error={!!formErrors.returnability}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
          <TextField
            label="رقم المادة"
            fullWidth
            required
            value={formData.materialNumber}
            onChange={(e) => handleFormChange('materialNumber', e.target.value)}
            error={!!formErrors.materialNumber}
          />
          <TextField
            label="اسم المادة"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            error={!!formErrors.name}
          />
          <FormControl fullWidth error={!!formErrors.unit}>
            <Autocomplete
              freeSolo
              options={unitOptionsState}
              value={formData.unit}
              onChange={(e, v) => handleFormChange('unit', (v ?? '') as string)}
              onInputChange={(e, v) => handleFormChange('unit', v)}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => (
                <TextField
                    {...params}
                    label="الوحدة"
                    required
                    error={!!formErrors.unit}
                    helperText={formErrors.unit}
                  />
              )}
            />
          </FormControl>

          {/* opening balance and warehouse - shown only for sub and stockable */}
          {formData.isNonStock !== true && (
            <>
              <TextField
                label="الرصيد الافتتاحي"
                fullWidth
                type="number"
                value={formData.openingBalance ?? ''}
                onChange={(e) => handleFormChange('openingBalance', e.target.value === '' ? '' : Number(e.target.value))}
                slotProps={{ htmlInput: { min: 0 } }}
                helperText={formErrors.openingBalance}
              />

              <FormControl fullWidth error={!!formErrors.openingWarehouseId}>
                <InputLabel id="opening-warehouse-label" required={openingWarehouseRequired}>مخزن الرصيد الافتتاحي</InputLabel>
                <Select
                  labelId="opening-warehouse-label"
                  value={formData.openingWarehouseId ?? ''}
                  onChange={(e) => handleFormChange('openingWarehouseId', e.target.value)}
                  label="مخزن الرصيد الافتتاحي"
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: darkPopupPaperSx,
                      },
                    },
                  }}
                >
                  <MenuItem value="">
                    <em>اختر مخزن</em>
                  </MenuItem>
                  {warehouses.map((w) => (
                    <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </>
          )}
          <TextField
            label="سعر التكلفة"
            fullWidth
            type="number"
            value={formData.costPrice}
            onChange={(e) => handleFormChange('costPrice', e.target.value)}
            error={!!formErrors.costPrice}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label={salesPrice1Label}
            fullWidth
            type="number"
            value={formData.price1}
            onChange={(e) => handleFormChange('price1', e.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label={salesPrice2Label}
            fullWidth
            type="number"
            value={formData.price2}
            onChange={(e) => handleFormChange('price2', e.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <TextField
            label={salesPrice3Label}
            fullWidth
            type="number"
            value={formData.price3}
            onChange={(e) => handleFormChange('price3', e.target.value)}
            slotProps={{ htmlInput: { min: 0 } }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={formData.isNonStock}
                onChange={(e) => handleFormChange('isNonStock', e.target.checked)}
                color="primary"
                sx={{
                  overflow: 'visible',
                  '& .MuiSwitch-switchBase': {
                    padding: '8px',
                  },
                  '& .MuiSwitch-track': {
                    width: '50px',
                    backgroundColor: formData.isNonStock ? 'rgba(34, 211, 238, 0.34)' : 'rgba(148, 163, 184, 0.24)',
                    opacity: 1,
                  },
                  '& .MuiSwitch-thumb': {
                    width: '20px',
                    height: '20px',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: 'rgba(34, 211, 238, 0.34)',
                  },
                }}
              />
            }
            label="مادة لا مخزنية"
            sx={{
              ml: 0,
              mr: 0,
              display: 'flex',
              flexDirection: 'row-reverse',
              justifyContent: 'flex-end',
              gap: 2,
            }}
          />
          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, mode: null })}>
            إلغاء
          </Button>
          <Button onClick={handleSaveSub} variant="contained" color="primary">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={dialog.open && dialog.mode === 'edit'}
        onClose={() => setDialog({ open: false, mode: null })}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}      >
        <DialogTitle>تعديل المادة</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, paddingTop: '20px !important' }}>
          {Object.keys(formErrors).length > 0 && (
            <Alert severity="error" sx={craftErrorAlertSx}>
              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                {Object.values(formErrors).map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </Box>
            </Alert>
          )}
          <TextField
            label="عائدية المادة"
            fullWidth
            value={formData.returnability}
            onChange={(e) => handleFormChange('returnability', e.target.value)}
            error={!!formErrors.returnability}
            slotProps={{
              input: {
                readOnly: true,
              },
            }}
          />
          <TextField
            label="رقم المادة"
            fullWidth
            required
            value={formData.materialNumber}
            onChange={(e) => handleFormChange('materialNumber', e.target.value)}
            error={!!formErrors.materialNumber}
          />
          <TextField
            label="اسم المادة"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            error={!!formErrors.name}
          />

          {selectedNode?.type === 'sub' && (
            <>
              <FormControl fullWidth error={!!formErrors.unit}>
                <Autocomplete
                  freeSolo
                  options={unitOptionsState}
                  value={formData.unit}
                  onChange={(e, v) => handleFormChange('unit', (v ?? '') as string)}
                  onInputChange={(e, v) => handleFormChange('unit', v)}
                  slotProps={{ paper: { sx: darkPopupPaperSx } }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="الوحدة"
                      required
                      error={!!formErrors.unit}
                      helperText={formErrors.unit}
                    />
                  )}
                />
              </FormControl>
              <TextField
                label="سعر التكلفة"
                fullWidth
                type="number"
                value={formData.costPrice}
                onChange={(e) => handleFormChange('costPrice', e.target.value)}
                error={!!formErrors.costPrice}
                required={false}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label={salesPrice1Label}
                fullWidth
                type="number"
                value={formData.price1}
                onChange={(e) => handleFormChange('price1', e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label={salesPrice2Label}
                fullWidth
                type="number"
                value={formData.price2}
                onChange={(e) => handleFormChange('price2', e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <TextField
                label={salesPrice3Label}
                fullWidth
                type="number"
                value={formData.price3}
                onChange={(e) => handleFormChange('price3', e.target.value)}
                slotProps={{ htmlInput: { min: 0 } }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isNonStock}
                    onChange={(e) => handleFormChange('isNonStock', e.target.checked)}
                    color="primary"
                    sx={{
                      '& .MuiSwitch-switchBase': {
                        padding: '8px',
                      },
                      '& .MuiSwitch-track': {
                        width: '50px',
                        backgroundColor: formData.isNonStock ? 'rgba(34, 211, 238, 0.34)' : 'rgba(148, 163, 184, 0.24)',
                        opacity: 1,
                      },
                      '& .MuiSwitch-thumb': {
                        width: '20px',
                        height: '20px',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                        transform: 'translateY(1px)'
                      },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                        backgroundColor: 'rgba(34, 211, 238, 0.34)',
                      },
                    }}
                  />
                }
                label="مادة لا مخزنية"
                sx={{
                  ml: 0,
                  mr: 0,
                  display: 'flex',
                  flexDirection: 'row-reverse',
                  justifyContent: 'flex-end',
                  gap: 2,
                }}
              />
              {/* when toggling non-stock, clear opening fields */}
              {formData.isNonStock && (
                (() => {
                  if (formData.openingBalance !== '') handleFormChange('openingBalance', '')
                  if (formData.openingWarehouseId) handleFormChange('openingWarehouseId', '')
                  return null
                })()
              )}
            </>
          )}

          <TextField
            label="ملاحظات"
            fullWidth
            multiline
            rows={4}
            value={formData.notes}
            onChange={(e) => handleFormChange('notes', e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog({ open: false, mode: null })}>
            إلغاء
          </Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">
            حفظ
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={dialog.open && dialog.mode === 'delete'}
        onClose={() => setDialog({ open: false, mode: null })}
        maxWidth="xs"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>حذف المادة</DialogTitle>

        <DialogContent>
          <Typography>
            هل أنت متأكد من حذف المادة{' '}
            <strong>{selectedNode?.name || selectedNode?.materialNumber || ''}</strong>؟
          </Typography>

          <Typography sx={{ mt: 1, color: '#FCA5A5', fontSize: 13 }}>
            سيتم حذف هذه المادة وجميع المواد التابعة لها، ولا يمكن التراجع عن هذا الإجراء.
          </Typography>

          {deleteCounts ? (
            <Typography sx={{ mt: 1, color: '#FCA5A5', fontSize: 13, fontWeight: 700 }}>
              المجموع: {deleteCounts.total} مادة
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setDialog({ open: false, mode: null })}>
            إلغاء
          </Button>

          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Dialog */}
      <Dialog
        open={dialog.open && dialog.mode === 'error'}
        onClose={() => setDialog({ open: false, mode: null })}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}      >
        <DialogTitle>تعذر إتمام العملية</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={craftErrorAlertSx}>{errorMessage}</Alert>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setDialog({ open: false, mode: null })}
            variant="contained"
            color="primary"
          >
            حسناً
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default MaterialCatalog
