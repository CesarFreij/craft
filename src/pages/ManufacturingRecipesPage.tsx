import { useEffect, useMemo, useState } from 'react'
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
      standardOutputQuantity: String(details.standardOutputQuantity),
      status: details.status,
      notes: details.notes ?? '',
      items: (details.items ?? []).map((item) => ({
        id: item.id,
        materialId: item.materialId,
        quantity: String(item.quantity),
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
      return
    }

    const payload: ManufacturingRecipePayload = {
      name: form.name.trim(),
      productMaterialId: form.productMaterialId,
      standardOutputQuantity: Number(form.standardOutputQuantity),
      notes: form.notes.trim(),
      status: form.status,
      items: form.items.map((item) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
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
    <Box sx={{ p: 2 }}>
      <PageHeader title="نماذج التصنيع" breadcrumb="تعريف نماذج الإنتاج القياسية دون التأثير على المخزون" />

      <SectionCard title="سجل نماذج التصنيع" actions={
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => { void openNewRecipe() }}>
          نموذج تصنيع جديد
        </Button>
      }>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
            <Box component="thead" sx={{ background: '#F8FAFC' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>رقم النموذج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>اسم النموذج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>المنتج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الكمية القياسية</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الوحدة</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>عدد المكونات</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الحالة</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الإجراءات</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {recipes.map((recipe) => (
                <Box component="tr" key={recipe.id} sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.04)', background: '#fff' }}>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.recipeNumber}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.name}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.productName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.standardOutputQuantity}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.unit || '—'}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{recipe.componentCount}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>
                    <Box component="span" sx={{ display: 'inline-flex', px: 1.3, py: 0.6, borderRadius: 999, background: recipe.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(148,163,184,0.12)', color: recipe.status === 'active' ? '#15803D' : '#475569', fontSize: 12, fontWeight: 700 }}>
                      {recipe.status === 'active' ? 'فعال' : 'غير فعال'}
                    </Box>
                  </Box>
                  <Box component="td" sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
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
      </SectionCard>

      <Dialog open={newRecipeOpen} onClose={handleCloseRecipeDialog} fullWidth maxWidth="lg">
        <DialogTitle>{editingRecipeId ? 'تعديل نموذج التصنيع' : 'نموذج تصنيع جديد'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '20px !important' }}>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 2 }}>
            <TextField label="رقم النموذج" value={editingRecipeId ? selectedRecipe?.recipeNumber ?? recipeNumberPreview : recipeNumberPreview} slotProps={{ input: { readOnly: true }}} fullWidth />
            <TextField label="اسم النموذج" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} required fullWidth />
            <Autocomplete
              options={stockableMaterials}
              getOptionLabel={formatRecipeMaterialLabel}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={stockableMaterials.find((material) => material.id === form.productMaterialId) ?? null}
              onChange={(_, value) => handleProductChange(value?.id ?? '')}
              renderInput={(params) => (
                <TextField {...params} label="المنتج الناتج" required fullWidth />
              )}
              fullWidth
            />
            <TextField label="الكمية القياسية الناتجة" type="number" value={form.standardOutputQuantity} onChange={(event) => setForm((current) => ({ ...current, standardOutputQuantity: event.target.value }))} required fullWidth />
            <TextField label="الوحدة" value={selectedProduct?.unit ?? ''} slotProps={{ input: { readOnly: true }}} fullWidth />
            <TextField select label="الحالة" value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as 'active' | 'inactive' }))} fullWidth>
              <MenuItem value="active">فعال</MenuItem>
              <MenuItem value="inactive">غير فعال</MenuItem>
            </TextField>
          </Box>

          <TextField label="ملاحظات" value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} multiline minRows={3} fullWidth />

          <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, background: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box sx={{ fontWeight: 700 }}>مواد نموذج التصنيع</Box>
              <Button variant="outlined" onClick={handleAddItem}>إضافة مادة</Button>
            </Box>

            <Box sx={{ overflowX: 'auto' }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #E2E8F0', minWidth: 760 }}>
                <Box component="thead" sx={{ background: '#F8FAFC' }}>
                  <Box component="tr">
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '38%', fontWeight: 700 }}>المادة</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '14%', fontWeight: 700 }}>الوحدة</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '18%', fontWeight: 700 }}>الكمية المطلوبة</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '22%', fontWeight: 700 }}>ملاحظات</Box>
                    <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '8%', fontWeight: 700 }}>الإجراءات</Box>
                  </Box>
                </Box>
                <Box component="tbody" sx={{ background: '#FFFFFF' }}>
                  {form.items.length === 0 ? (
                    <Box component="tr">
                      <Box component="td" colSpan={5} sx={{ p: 2, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#475569' }}>
                        لا توجد مواد مضافة إلى نموذج التصنيع.
                      </Box>
                    </Box>
                  ) : null}
                  {form.items.map((item) => {
                    const itemMaterial = stockableMaterials.find((material) => material.id === item.materialId)
                    return (
                      <Box component="tr" key={item.id} sx={{ background: '#FFFFFF' }}>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
                          <Autocomplete
                            options={componentOptions}
                            getOptionLabel={formatRecipeMaterialLabel}
                            isOptionEqualToValue={(option, value) => option.id === value.id}
                            value={stockableMaterials.find((material) => material.id === item.materialId) ?? null}
                            onChange={(_, value) => handleItemChange(item.id, 'materialId', value?.id ?? '')}
                            fullWidth
                            renderInput={(params) => (
                              <TextField
                                {...params}
                                variant="outlined"
                                size="small"
                                fullWidth
                                sx={{
                                  backgroundColor: '#FFFFFF',
                                  '& .MuiOutlinedInput-root': {
                                    '& fieldset': { borderColor: '#CBD5E1' },
                                    '&:hover fieldset': { borderColor: '#94A3B8' },
                                    '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '1.5px' },
                                  },
                                  '& input': { textAlign: 'center' },
                                }}
                              />
                            )}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
                          <TextField
                            value={itemMaterial?.unit ?? ''}
                            slotProps={{ input: { readOnly: true } }}
                            variant="outlined"
                            size="small"
                            sx={{
                              backgroundColor: '#F8FAFC',
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#CBD5E1' },
                                '&:hover fieldset': { borderColor: '#94A3B8' },
                                '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '1.5px' },
                              },
                              '& input': { textAlign: 'center' },
                            }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
                          <TextField
                            type="number"
                            value={item.quantity}
                            onChange={(event) => handleItemChange(item.id, 'quantity', event.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={{
                              backgroundColor: '#FFFFFF',
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#CBD5E1' },
                                '&:hover fieldset': { borderColor: '#94A3B8' },
                                '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '1.5px' },
                              },
                              '& input': { textAlign: 'center' },
                            }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
                          <TextField
                            value={item.notes}
                            onChange={(event) => handleItemChange(item.id, 'notes', event.target.value)}
                            variant="outlined"
                            size="small"
                            fullWidth
                            sx={{
                              backgroundColor: '#FFFFFF',
                              '& .MuiOutlinedInput-root': {
                                '& fieldset': { borderColor: '#CBD5E1' },
                                '&:hover fieldset': { borderColor: '#94A3B8' },
                                '&.Mui-focused fieldset': { borderColor: '#2563EB', borderWidth: '1.5px' },
                              },
                              '& input': { textAlign: 'center' },
                            }}
                          />
                        </Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
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

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>تفاصيل نموذج التصنيع</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 3, pt: '20px !important' }}>
          {selectedRecipe ? (
            <>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 2 }}>
                <TextField label="رقم النموذج" value={selectedRecipe.recipeNumber} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="اسم النموذج" value={selectedRecipe.name} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="المنتج" value={selectedRecipe.productName} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="الكمية القياسية" value={selectedRecipe.standardOutputQuantity} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="الوحدة" value={selectedRecipe.unit} slotProps={{ input: { readOnly: true }}} fullWidth />
                <TextField label="الحالة" value={selectedRecipe.status === 'active' ? 'فعال' : 'غير فعال'} slotProps={{ input: { readOnly: true }}} fullWidth />
              </Box>
              <TextField label="الملاحظات" value={selectedRecipe.notes || '—'} slotProps={{ input: { readOnly: true }}} multiline minRows={3} fullWidth />

              <Box sx={{ border: '1px solid #E2E8F0', borderRadius: 3, p: 2, background: '#FFFFFF' }}>
                <Box sx={{ fontWeight: 700, mb: 2 }}>مواد نموذج التصنيع</Box>
                <Box sx={{ overflowX: 'auto' }}>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', border: '1px solid #E2E8F0' }}>
                    <Box component="thead" sx={{ background: '#F8FAFC' }}>
                      <Box component="tr">
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '40%', fontWeight: 700 }}>المادة</Box>
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '15%', fontWeight: 700 }}>الوحدة</Box>
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '20%', fontWeight: 700 }}>الكمية المطلوبة</Box>
                        <Box component="th" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', width: '25%', fontWeight: 700 }}>ملاحظات</Box>
                      </Box>
                    </Box>
                    <Box component="tbody" sx={{ background: '#FFFFFF' }}>
                      {(selectedRecipe.items ?? []).length === 0 ? (
                        <Box component="tr">
                          <Box component="td" colSpan={4} sx={{ p: 2, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#475569' }}>
                            لا توجد مواد مضافة إلى نموذج التصنيع.
                          </Box>
                        </Box>
                      ) : null}
                      {(selectedRecipe.items ?? []).map((item) => (
                        <Box component="tr" key={item.id} sx={{ background: '#FFFFFF' }}>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.materialName}</Box>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.unit}</Box>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.quantity}</Box>
                          <Box component="td" sx={{ p: 1.5, textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.notes || '—'}</Box>
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

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
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
