import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TablePagination,
  TextField,
  Tooltip,
} from '@mui/material'
import { FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import {
  manufacturingService,
  type ManufacturingRecipePayload,
  type ManufacturingRecipeRecord,
} from '../services/manufacturingService'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'


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
  '& .MuiMenuItem-root, & .MuiAutocomplete-option': {
    color: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '8px',
    mx: 0.5,
    my: 0.25,
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.10)',
    },
    '&.Mui-selected, &[aria-selected="true"]': {
      color: '#67E8F9',
      background: 'rgba(34, 211, 238, 0.13)',
    },
  },
}

const darkSelectSlotProps = {
  select: {
    MenuProps: {
      slotProps: {
        paper: {
          sx: darkPopupPaperSx,
        },
      },
    },
  },
}

const craftPageGlassSx = {
  '& .MuiPaper-root:not(.MuiAlert-root)': {
    background: 'rgba(248, 250, 252, 0.10) !important',
    backdropFilter: 'blur(36px) saturate(120%)',
    WebkitBackdropFilter: 'blur(18px) saturate(120%)',
    boxShadow: '0 18px 45px rgba(2, 6, 23, 0.16) !important',
    border: 'none !important',
    borderRadius: '18px',
    color: 'rgba(255, 255, 255, 0.92)',
    backgroundImage: 'none !important',
  },

  '& .MuiTypography-root': {
    color: 'rgba(255, 255, 255, 0.92)',
  },

  '& .MuiInputBase-root': {
    background: 'rgba(255, 255, 255, 0.07)',
    color: 'rgba(255, 255, 255, 0.92)',
    borderRadius: '14px',
  },

  '& .MuiInputBase-input': {
    color: 'rgba(255, 255, 255, 0.92)',
    WebkitTextFillColor: 'rgba(255, 255, 255, 0.92)',
  },

  '& .MuiInputBase-input::placeholder': {
    color: 'rgba(255, 255, 255, 0.58)',
    opacity: 1,
  },

  '& .MuiInputLabel-root': {
    color: 'rgba(255, 255, 255, 0.72)',
  },

  '& .MuiInputLabel-root.Mui-focused': {
    color: '#67E8F9',
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

  '& .MuiSelect-icon, & .MuiAutocomplete-popupIndicator, & .MuiAutocomplete-clearIndicator': {
    color: 'rgba(255, 255, 255, 0.78)',
  },

  '& .MuiInputAdornment-root .MuiIconButton-root': {
    color: 'rgba(255, 255, 255, 0.82)',
  },

  '& .MuiTable-root': {
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },

  '& .MuiTableHead-root .MuiTableRow-root': {
    background: 'rgba(255, 255, 255, 0.055)',
  },

  '& .MuiTableBody-root .MuiTableRow-root': {
    background: 'rgba(255, 255, 255, 0.022)',
  },

  '& .MuiTableBody-root .MuiTableRow-root:hover': {
    background: 'rgba(255, 255, 255, 0.055)',
  },

  '& .MuiTableCell-root': {
    color: 'rgba(255, 255, 255, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
  },

  '& .MuiTableHead-root .MuiTableCell-root': {
    color: 'rgba(255, 255, 255, 0.94)',
    fontWeight: 700,
  },

  '& .MuiTablePagination-root': {
    color: 'rgba(255, 255, 255, 0.96)',
  },

  '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
    color: 'rgba(255, 255, 255, 0.92)',
    fontWeight: 600,
  },

  '& .MuiTablePagination-select, & .MuiTablePagination-selectIcon': {
    color: 'rgba(255, 255, 255, 0.96)',
  },

  '& .MuiTablePagination-actions .MuiIconButton-root': {
    color: 'rgba(255, 255, 255, 0.96)',
  },

  '& .MuiTablePagination-actions .MuiIconButton-root.Mui-disabled': {
    color: 'rgba(255, 255, 255, 0.32)',
  },

  '& .MuiIconButton-colorPrimary': {
    color: '#60A5FA',
  },

  '& .MuiButton-outlined': {
    color: '#93C5FD',
    borderColor: 'rgba(96, 165, 250, 0.46)',
  },

  '& .MuiButton-outlined:hover': {
    borderColor: '#60A5FA',
    background: 'rgba(96, 165, 250, 0.10)',
  },

  '& .MuiCircularProgress-root': {
    color: '#67E8F9',
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
      background:
        'linear-gradient(145deg, rgba(10, 27, 61, 0.97) 0%, rgba(8, 45, 78, 0.95) 100%)',
      backdropFilter: 'blur(28px) saturate(125%)',
      WebkitBackdropFilter: 'blur(28px) saturate(125%)',
      border: '1px solid rgba(148, 197, 255, 0.16)',
      boxShadow: '0 28px 72px rgba(2, 6, 23, 0.46)',
      color: 'rgba(255, 255, 255, 0.92)',
      backgroundImage: 'none',
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
      },

      '& .MuiTypography-root': {
        color: 'rgba(255, 255, 255, 0.88)',
      },

      '& strong': {
        color: 'rgba(255, 255, 255, 0.96)',
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

      '& .MuiInputBase-input::placeholder': {
        color: 'rgba(255, 255, 255, 0.56)',
        opacity: 1,
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

      '& .MuiInputAdornment-root .MuiIconButton-root': {
        color: 'rgba(255, 255, 255, 0.82)',
      },

      '& input[type="number"]': {
        colorScheme: 'dark',
      },

      '& input[type="number"]::-webkit-inner-spin-button, & input[type="number"]::-webkit-outer-spin-button': {
        opacity: 0.88,
        cursor: 'pointer',
      },

      '& .MuiDialogContent-root .MuiPaper-root:not(.MuiAlert-root)': {
        background: 'rgba(255, 255, 255, 0.045) !important',
        border: '1px solid rgba(255, 255, 255, 0.14) !important',
        boxShadow: 'none !important',
        color: 'rgba(255, 255, 255, 0.92)',
        backgroundImage: 'none !important',
      },

      '& .MuiTable-root': {
        background: 'transparent',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      },

      '& .MuiTableHead-root .MuiTableRow-root': {
        background: 'rgba(255, 255, 255, 0.055)',
      },

      '& .MuiTableBody-root .MuiTableRow-root': {
        background: 'rgba(255, 255, 255, 0.022)',
      },

      '& .MuiTableBody-root .MuiTableRow-root:hover': {
        background: 'rgba(255, 255, 255, 0.055)',
      },

      '& .MuiTableCell-root': {
        color: 'rgba(255, 255, 255, 0.88)',
        border: '1px solid rgba(255, 255, 255, 0.18)',
      },

      '& .MuiTableHead-root .MuiTableCell-root': {
        color: 'rgba(255, 255, 255, 0.94)',
        fontWeight: 700,
      },

      '& .MuiButton-outlined': {
        color: '#93C5FD',
        borderColor: 'rgba(96, 165, 250, 0.46)',
      },

      '& .MuiButton-outlined:hover': {
        borderColor: '#60A5FA',
        background: 'rgba(96, 165, 250, 0.10)',
      },

      '& .MuiButton-text': {
        color: '#CBD5E1',
      },

      '& .MuiButton-text.MuiButton-colorError': {
        color: '#FCA5A5',
      },

      '& .MuiCircularProgress-root': {
        color: '#67E8F9',
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

const craftHtmlTableSx = {
  width: '100%',
  borderCollapse: 'collapse',
  background: 'transparent',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  '& thead': {
    background: 'rgba(255, 255, 255, 0.055)',
  },
  '& tbody tr': {
    background: 'rgba(255, 255, 255, 0.022)',
  },
  '& tbody tr:hover': {
    background: 'rgba(255, 255, 255, 0.055)',
  },
  '& th': {
    color: 'rgba(255, 255, 255, 0.94)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    fontWeight: 700,
  },
  '& td': {
    color: 'rgba(255, 255, 255, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    fontWeight: 400,
  },
}

type RecipeFormItem = {
  id: string
  materialId: string
  quantity: string
  notes: string
}

type RecipeFormState = {
  name: string
  productMaterialId: string
  standardOutputQuantity: string
  status: 'active' | 'inactive'
  notes: string
  items: RecipeFormItem[]
}

const emptyFormState: RecipeFormState = {
  name: '',
  productMaterialId: '',
  standardOutputQuantity: '',
  status: 'active',
  notes: '',
  items: [],
}

function formatRecipeMaterialLabel(material: MaterialRecord): string {
  return `${material.materialNumber} - ${material.name}`
}

const numberFormatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function roundToTwo(value: number): number {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.round((value + Number.EPSILON) * 100) / 100
}

function formatNumber(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? numberFormatter.format(numericValue) : '0.00'
}

function formatEditableNumber(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0)
  return Number.isFinite(numericValue) ? roundToTwo(numericValue).toFixed(2) : '0.00'
}

function formatInteger(value: number | string | null | undefined): string {
  const numericValue = Number(value ?? 0)

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(numericValue)
}

// materialsService.listMaterials() returns a hierarchical tree (children nested), so options must be flattened.
function flattenStockableSubMaterials(nodes: MaterialRecord[]): MaterialRecord[] {
  const result: MaterialRecord[] = []

  const walk = (items: MaterialRecord[]) => {
    for (const item of items) {
      if (
        item.type === 'sub' &&
        !item.isNonStock &&
        (item.status ?? 'active') === 'active'
      ) {
        result.push(item)
      }

      if (item.children?.length) {
        walk(item.children)
      }
    }
  }

  walk(nodes)
  return result
}

export function ManufacturingRecipesPage() {
  const [recipes, setRecipes] = useState<ManufacturingRecipeRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [newRecipeOpen, setNewRecipeOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedRecipe, setSelectedRecipe] = useState<ManufacturingRecipeRecord | null>(null)
  const [recipeToDelete, setRecipeToDelete] = useState<ManufacturingRecipeRecord | null>(null)
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null)
  const [recipeNumberPreview, setRecipeNumberPreview] = useState('BOM-000001')
  const [form, setForm] = useState<RecipeFormState>(emptyFormState)
  const [errorMessage, setErrorMessage] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const recipeDialogContentRef = useRef<HTMLDivElement | null>(null)

  const scrollRecipeDialogToTop = useCallback(() => {
    const scrollToTop = () => {
      const content = recipeDialogContentRef.current
      if (!content) return

      content.scrollTop = 0
      content.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    }

    window.requestAnimationFrame(() => {
      scrollToTop()
      window.requestAnimationFrame(scrollToTop)
    })

    window.setTimeout(scrollToTop, 80)
  }, [])

  useEffect(() => {
    if (!newRecipeOpen || !errorMessage) return
    scrollRecipeDialogToTop()
  }, [newRecipeOpen, errorMessage, scrollRecipeDialogToTop])

  const stockableMaterials = useMemo(() => flattenStockableSubMaterials(materials), [materials])
  const componentOptions = useMemo(
    () => stockableMaterials.filter((material) => material.id !== form.productMaterialId),
    [stockableMaterials, form.productMaterialId],
  )

  const loadRecipes = async () => {
    const [allRecipes, allMaterials] = await Promise.all([
      manufacturingService.listRecipes(),
      materialsService.listMaterials(),
    ])

    setRecipes(allRecipes)
    setMaterials(allMaterials)
  }

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadRecipes()
    }, 0)
  
    return () => window.clearTimeout(timerId)
  }, [])

  const openNewRecipe = async () => {
    const nextNumber = await manufacturingService.getNextRecipeNumber()
    setRecipeNumberPreview(nextNumber)
    setEditingRecipeId(null)
    setForm({ ...emptyFormState })
    setErrorMessage('')
    setNewRecipeOpen(true)
  }

  const openEditRecipe = async (recipe: ManufacturingRecipeRecord) => {
    const details = await manufacturingService.getRecipeById(recipe.id)
    if (!details) {
      return
    }

    setEditingRecipeId(details.id)
    setRecipeNumberPreview(details.recipeNumber)
    setForm({
      name: details.name,
      productMaterialId: details.productMaterialId,
      standardOutputQuantity: formatEditableNumber(details.standardOutputQuantity),
      status: details.status,
      notes: details.notes ?? '',
      items: (details.items ?? []).map((item) => ({
        id: item.id,
        materialId: item.materialId,
        quantity: formatEditableNumber(item.quantity),
        notes: item.notes ?? '',
      })),
    })
    setErrorMessage('')
    setNewRecipeOpen(true)
  }

  const handleCloseRecipeDialog = () => {
    setNewRecipeOpen(false)
    setEditingRecipeId(null)
    setForm({ ...emptyFormState })
    setErrorMessage('')
  }

  const openRecipeDetails = async (recipeId: string) => {
    try {
      const details = await manufacturingService.getRecipeById(recipeId)

      if (!details) {
        setErrorMessage('تعذر تحميل تفاصيل نموذج التصنيع.')
        return
      }

      setSelectedRecipe(details)
      setDetailsOpen(true)
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل تفاصيل نموذج التصنيع.'))
    }
  }

  const handleProductChange = (materialId: string) => {
    setForm((current) => ({ ...current, productMaterialId: materialId }))
  }

  const handleAddItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        { id: `${Date.now()}-${Math.random()}`, materialId: '', quantity: '', notes: '' },
      ],
    }))
  }

  const handleRemoveItem = (itemId: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== itemId),
    }))
  }

  const handleItemChange = (itemId: string, field: 'materialId' | 'quantity' | 'notes', value: string) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }))
  }

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return 'اسم النموذج مطلوب.'
    }

    if (!form.productMaterialId) {
      return 'يجب اختيار المنتج الناتج.'
    }

    const productMaterial = stockableMaterials.find(
      (material) => material.id === form.productMaterialId
    )

    if (
      !productMaterial ||
      productMaterial.type !== 'sub' ||
      productMaterial.isNonStock ||
      (productMaterial.status ?? 'active') !== 'active'
    ) {
      return 'المنتج الناتج غير موجود أو غير صالح للتصنيع.'
    }

    const standardOutputQuantity = Number(form.standardOutputQuantity)
    if (!Number.isFinite(standardOutputQuantity) || standardOutputQuantity <= 0) {
      return 'يجب أن تكون الكمية القياسية أكبر من صفر.'
    }

    if (form.items.length === 0) {
      return 'يجب إضافة مكون واحد على الأقل.'
    }

    const seen = new Set<string>()

    for (const item of form.items) {
      const material = stockableMaterials.find(
        (candidate) => candidate.id === item.materialId
      )

      if (
        !material ||
        material.type !== 'sub' ||
        material.isNonStock ||
        (material.status ?? 'active') !== 'active'
      ) {
        return 'كل مادة أولية يجب أن تكون مادة فرعية مخزنية فعالة.'
      }

      if (item.materialId === form.productMaterialId) {
        return 'لا يمكن استخدام المنتج الناتج نفسه كمادة أولية.'
      }

      if (seen.has(item.materialId)) {
        return 'المادة مضافة مسبقاً إلى نموذج التصنيع.'
      }

      const quantity = Number(item.quantity)
      if (!Number.isFinite(quantity) || quantity <= 0) {
        return 'يجب أن تكون الكمية أكبر من صفر.'
      }

      seen.add(item.materialId)
    }

    return null
  }

  const handleSaveRecipe = async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setErrorMessage(validationMessage)
      scrollRecipeDialogToTop()
      return
    }

    const payload: ManufacturingRecipePayload = {
      name: form.name.trim(),
      productMaterialId: form.productMaterialId,
      standardOutputQuantity: roundToTwo(Number(form.standardOutputQuantity)),
      notes: form.notes.trim(),
      status: form.status,
      items: form.items.map((item) => ({
        materialId: item.materialId,
        quantity: roundToTwo(Number(item.quantity)),
        notes: item.notes.trim(),
        sortOrder: 0,
      })),
    }

    try {
      setErrorMessage('')

      if (editingRecipeId) {
        await manufacturingService.updateRecipe(editingRecipeId, payload)
      } else {
        await manufacturingService.createRecipe(payload)
      }

      await loadRecipes()
      handleCloseRecipeDialog()
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حفظ نموذج التصنيع. يرجى المحاولة مرة أخرى.'))
      scrollRecipeDialogToTop()
    }
  }

  const handleDeleteRecipe = async () => {
    if (!recipeToDelete) {
      return
    }

    try {
      await manufacturingService.deleteRecipe(recipeToDelete.id)
      setDeleteDialogOpen(false)
      setRecipeToDelete(null)
      await loadRecipes()
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حذف نموذج التصنيع. يرجى المحاولة مرة أخرى.'))
    }
  }

  const selectedProduct = stockableMaterials.find((material) => material.id === form.productMaterialId)

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader title="نماذج التصنيع" breadcrumb="تعريف نماذج الإنتاج القياسية دون التأثير على المخزون" />

      <SectionCard title="سجل نماذج التصنيع" actions={
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => { void openNewRecipe() }}>
          نموذج تصنيع جديد
        </Button>
      }>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ ...craftHtmlTableSx, minWidth: 900 }}>
            <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>رقم النموذج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>اسم النموذج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>المنتج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الكمية القياسية</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الوحدة</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>عدد المكونات</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الحالة</Box>
                <Box component="th" sx={{ p: 1, textAlign: 'center', fontWeight: 700, width: 130, minWidth: 130, maxWidth: 130 }}>الإجراءات</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {recipes
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((recipe) => (
                <Box component="tr" key={recipe.id} sx={{ borderTop: '1px solid rgba(255, 255, 255, 0.18)', background: 'rgba(255, 255, 255, 0.022)' }}>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.recipeNumber}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.name}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.productName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatNumber(recipe.standardOutputQuantity)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.unit || '—'}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{formatInteger(recipe.componentCount)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>
                    <Box component="span" sx={{ display: 'inline-flex', px: 1.3, py: 0.6, borderRadius: 999, background: recipe.status === 'active' ? 'rgba(34, 211, 238, 0.16)' : 'rgba(148, 163, 184, 0.12)', color: recipe.status === 'active' ? '#67E8F9' : '#C7D2E0', border: recipe.status === 'active' ? '1px solid rgba(34, 211, 238, 0.32)' : '1px solid rgba(148, 163, 184, 0.28)', fontSize: 12, fontWeight: 700 }}>
                      {recipe.status === 'active' ? 'فعال' : 'غير فعال'}
                    </Box>
                  </Box>
                  <Box component="td" sx={{ p: 1, width: 130, minWidth: 130, maxWidth: 130 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 0.5, flexWrap: 'nowrap' }}>
                      <Tooltip title="عرض التفاصيل">
                        <IconButton size="small" color="secondary" onClick={() => { void openRecipeDetails(recipe.id) }}>
                          <FiEye size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => { void openEditRecipe(recipe) }}>
                          <FiEdit2 size={16} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton size="small" color="error" onClick={() => { setRecipeToDelete(recipe); setDeleteDialogOpen(true) }}>
                          <FiTrash2 size={16} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={recipes.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value))
              setPage(0)
            }}
          />
        </Box>
      </SectionCard>

      <Dialog open={newRecipeOpen} onClose={handleCloseRecipeDialog} fullWidth maxWidth="lg" slotProps={craftDialogSlotProps}>
        <DialogTitle>{editingRecipeId ? 'تعديل نموذج التصنيع' : 'نموذج تصنيع جديد'}</DialogTitle>
        <DialogContent
          ref={recipeDialogContentRef}
          sx={{ display: 'grid', gap: 2, pt: '20px !important' }}
        >
          {errorMessage ? <Alert severity="error" sx={craftErrorAlertSx}>{errorMessage}</Alert> : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 2 }}>
            <TextField label="رقم النموذج" value={editingRecipeId ? selectedRecipe?.recipeNumber ?? recipeNumberPreview : recipeNumberPreview} slotProps={{ input: { readOnly: true }}} fullWidth />
            <TextField label="اسم النموذج" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
            <Autocomplete
              options={stockableMaterials}
              getOptionLabel={formatRecipeMaterialLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={stockableMaterials.find((material) => material.id === form.productMaterialId) ?? null}
              onChange={(_, value) => handleProductChange(value?.id ?? '')}
              slotProps={{ paper: { sx: darkPopupPaperSx } }}
              renderInput={(params) => (
                <TextField {...params} label="المنتج الناتج" required fullWidth />
              )}
              fullWidth
            />
            <TextField
              label="الكمية القياسية الناتجة"
              type="number"
              value={form.standardOutputQuantity}
              onChange={(event) => setForm((current) => ({ ...current, standardOutputQuantity: event.target.value }))}
              onBlur={() => {
                setForm((current) => ({
                  ...current,
                  standardOutputQuantity: current.standardOutputQuantity
                    ? formatEditableNumber(current.standardOutputQuantity)
                    : '',
                }))
              }}
              slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
              required
              fullWidth
            />
            <TextField label="الوحدة" value={selectedProduct?.unit ?? ''} slotProps={{ input: { readOnly: true }}} fullWidth />
            <TextField select label="الحالة" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as 'active' | 'inactive' }))} slotProps={darkSelectSlotProps} fullWidth>
              <MenuItem value="active">فعال</MenuItem>
              <MenuItem value="inactive">غير فعال</MenuItem>
            </TextField>
          </Box>

          <TextField label="ملاحظات" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth />

          <Box sx={{ border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '14px', p: 2, background: 'rgba(255, 255, 255, 0.035)' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ fontWeight: 700 }}>مواد نموذج التصنيع</Box>
              <Button variant="outlined" onClick={handleAddItem}>إضافة مادة</Button>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ ...craftHtmlTableSx, tableLayout: 'fixed', minWidth: 760 }}>
                <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                  <Box component="tr">
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '38%', fontWeight: 700 }}>المادة</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '14%', fontWeight: 700 }}>الوحدة</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '18%', fontWeight: 700 }}>الكمية المطلوبة</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '22%', fontWeight: 700 }}>ملاحظات</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '8%', fontWeight: 700 }}>الإجراءات</Box>
                  </Box>
                </Box>
                <Box component="tbody">
                  {form.items.length === 0 ? (
                    <Box component="tr">
                      <Box component="td" colSpan={5} sx={{ p: 2, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', color: 'rgba(255, 255, 255, 0.62)' }}>
                        لا توجد مواد مضافة إلى نموذج التصنيع.
                      </Box>
                    </Box>
                  ) : null}
                  {form.items.map((item) => {
                    const itemMaterial = stockableMaterials.find((material) => material.id === item.materialId)
                    return (
                      <Box component="tr" key={item.id}>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                          <Autocomplete
                            options={componentOptions}
                            getOptionLabel={formatRecipeMaterialLabel}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={stockableMaterials.find((material) => material.id === item.materialId) ?? null}
                            onChange={(_, value) => handleItemChange(item.id, 'materialId', value?.id ?? '')}
                            fullWidth
                            slotProps={{ paper: { sx: darkPopupPaperSx } }}
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="outlined"
                                size="small"
                                fullWidth
                            sx={{ '& input': { textAlign: 'center' } }}
                              />
                            )}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                          <TextField
                            value={itemMaterial?.unit ?? ''}
                            slotProps={{ input: { readOnly: true } }}
                            variant="outlined"
                            size="small"
                            sx={{ '& input': { textAlign: 'center' } }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(item.id, 'quantity', event.target.value)}
                            onBlur={() => {
                              if (item.quantity) {
                                handleItemChange(item.id, 'quantity', formatEditableNumber(item.quantity))
                              }
                            }}
                            variant="outlined"
                            size="small"
                            fullWidth
                            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                            sx={{ '& input': { textAlign: 'center' } }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                          <TextField
                            value={item.notes}
                            onChange={(event) => handleItemChange(item.id, 'notes', event.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={{ '& input': { textAlign: 'center' } }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>
                          <IconButton color="error" onClick={() => handleRemoveItem(item.id)}>
                            <FiTrash2 size={16} />
                          </IconButton>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseRecipeDialog}>إلغاء</Button>
          <Button variant="contained" onClick={() => { void handleSaveRecipe() }}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="lg" slotProps={craftDialogSlotProps}>
        <DialogTitle>تفاصيل نموذج التصنيع</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 3, pt: '20px !important' }}>
          {selectedRecipe ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 2 }}>
                <TextField label="رقم النموذج" value={selectedRecipe.recipeNumber} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="اسم النموذج" value={selectedRecipe.name} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="المنتج" value={selectedRecipe.productName} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="الكمية القياسية" value={formatNumber(selectedRecipe.standardOutputQuantity)} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="الوحدة" value={selectedRecipe.unit} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="الحالة" value={selectedRecipe.status === 'active' ? 'فعال' : 'غير فعال'} slotProps={{ input: { readOnly: true }}} fullWidth />
              </Box>
              <TextField label="الملاحظات" value={selectedRecipe.notes || '—'} slotProps={{ input: { readOnly: true }}} multiline minRows={3} fullWidth />

              <Box sx={{ border: '1px solid rgba(255, 255, 255, 0.14)', borderRadius: '14px', p: 2, background: 'rgba(255, 255, 255, 0.035)' }}>
                <Box sx={{ fontWeight: 700, mb: 2 }}>مواد نموذج التصنيع</Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{ ...craftHtmlTableSx, tableLayout: 'fixed' }}>
                    <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
                      <Box component="tr">
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '40%', fontWeight: 700 }}>المادة</Box>
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '15%', fontWeight: 700 }}>الوحدة</Box>
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '20%', fontWeight: 700 }}>الكمية المطلوبة</Box>
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', width: '25%', fontWeight: 700 }}>ملاحظات</Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {(selectedRecipe.items ?? []).length === 0 ? (
                        <Box component="tr">
                          <Box component="td" colSpan={4} sx={{ p: 2, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)', color: 'rgba(255, 255, 255, 0.62)' }}>
                            لا توجد مواد مضافة إلى نموذج التصنيع.
                          </Box>
                        </Box>
                      ) : null}
                      {(selectedRecipe.items ?? []).map((item) => (
                        <Box component="tr" key={item.id}>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>{item.materialName}</Box>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>{item.unit}</Box>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>{formatNumber(item.quantity)}</Box>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid rgba(255, 255, 255, 0.18)' }}>{item.notes || '—'}</Box>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth slotProps={craftDialogSlotProps}>
        <DialogTitle>تأكيد حذف نموذج التصنيع</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2 }}>
          <Box>هل أنت متأكد من حذف نموذج التصنيع؟</Box>
          {recipeToDelete ? (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Box><strong>رقم النموذج:</strong> {recipeToDelete.recipeNumber}</Box>
              <Box><strong>اسم النموذج:</strong> {recipeToDelete.name}</Box>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>تراجع</Button>
          <Button variant="contained" color="error" onClick={() => { void handleDeleteRecipe() }}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
