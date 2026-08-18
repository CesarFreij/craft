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
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import { FiPlus, FiEye } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import {
  manufacturingService,
  type ManufacturingRecipeRecord,
  type ProductionOrderPayload,
  type ProductionOrderRecord,
} from '../services/manufacturingService'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'

type OrderFormItem = {
  id: string
  recipeItemId?: string
  materialId: string
  warehouseId: string
  plannedQuantity: string
  actualQuantity: string
  notes: string
  unit: string
}

type OrderFormState = {
  recipeId: string
  outputWarehouseId: string
  plannedOutputQuantity: string
  actualOutputQuantity: string
  date: string
  notes: string
  defaultInputWarehouseId: string
  items: OrderFormItem[]
}

const emptyFormState: OrderFormState = {
  recipeId: '',
  outputWarehouseId: '',
  plannedOutputQuantity: '',
  actualOutputQuantity: '',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  defaultInputWarehouseId: '',
  items: [],
}

function formatMaterialLabel(material: MaterialRecord): string {
  return `${material.materialNumber} - ${material.name}`
}

export function ProductionOrdersPage() {
  const [orders, setOrders] = useState<ProductionOrderRecord[]>([])
  const [recipes, setRecipes] = useState<ManufacturingRecipeRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [newOrderOpen, setNewOrderOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<ProductionOrderRecord | null>(null)
  const [orderNumberPreview, setOrderNumberPreview] = useState('PRD-000001')
  const [form, setForm] = useState<OrderFormState>(emptyFormState)
  const [selectedRecipe, setSelectedRecipe] = useState<ManufacturingRecipeRecord | null>(null)
  const [isRecipeLoading, setIsRecipeLoading] = useState(false)

  const manufacturingMaterials = useMemo(
    () => materials.filter((material) => material.type === 'sub' && !material.isNonStock && material.status !== 'deleted' && material.status !== 'inactive'),
    [materials],
  )

  const loadData = async () => {
    const [allOrders, allRecipes, allMaterials, allWarehouses] = await Promise.all([
      manufacturingService.listProductionOrders(),
      manufacturingService.listRecipes(),
      materialsService.listMaterials(),
      inventoryService.listWarehouses(),
    ])

    setOrders(allOrders)
    setRecipes(allRecipes)
    setMaterials(allMaterials)
    setWarehouses(allWarehouses)
  }

  useEffect(() => {
    void loadData()
  }, [])

  const syncRecipeItems = (recipe: ManufacturingRecipeRecord | null, nextPlannedOutputQuantity: string, currentItems: OrderFormItem[], defaultWarehouseId: string) => {
    if (!recipe || !recipe.items || recipe.items.length === 0) {
      return currentItems
    }

    const plannedOutput = Number(nextPlannedOutputQuantity)
    const standardOutput = Number(recipe.standardOutputQuantity)

    const baseFactor = Number.isFinite(plannedOutput) && plannedOutput > 0 && Number.isFinite(standardOutput) && standardOutput > 0
      ? plannedOutput / standardOutput
      : 1

    return recipe.items.map((item, index) => {
      const previousItem = currentItems.find((entry) => entry.materialId === item.materialId) ?? currentItems[index]
      const plannedQuantity = Number(item.quantity ?? 0) * baseFactor
      const currentActual = previousItem ? Number(previousItem.actualQuantity) : NaN
      const actualQuantity = Number.isFinite(currentActual) && currentActual > 0 ? currentActual : plannedQuantity

      return {
        id: previousItem?.id ?? `${recipe.id}-${item.id ?? index}`,
        recipeItemId: item.id,
        materialId: item.materialId,
        warehouseId: previousItem?.warehouseId || defaultWarehouseId || '',
        plannedQuantity: String(plannedQuantity),
        actualQuantity: String(actualQuantity),
        notes: previousItem?.notes ?? item.notes ?? '',
        unit: item.unit ?? '',
      }
    })
  }

  useEffect(() => {
    if (!form.recipeId) {
      setSelectedRecipe(null)
      setForm((current) => ({ ...current, items: [], defaultInputWarehouseId: '' }))
      return
    }

    let isMounted = true

    const loadRecipeDetails = async () => {
      setIsRecipeLoading(true)
      setErrorMessage('')

      try {
        const recipe = await manufacturingService.getRecipeById(form.recipeId)
        if (!isMounted) {
          return
        }

        setSelectedRecipe(recipe)

        if (!recipe) {
          setForm((current) => ({ ...current, items: [], defaultInputWarehouseId: '' }))
          return
        }

        setForm((current) => ({
          ...current,
          items: syncRecipeItems(recipe, current.plannedOutputQuantity || String(recipe.standardOutputQuantity), current.items, current.defaultInputWarehouseId),
          defaultInputWarehouseId: current.defaultInputWarehouseId,
        }))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setSelectedRecipe(null)
        setForm((current) => ({ ...current, items: [], defaultInputWarehouseId: '' }))
        setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر تحميل تفاصيل نموذج التصنيع.'))
      } finally {
        if (isMounted) {
          setIsRecipeLoading(false)
        }
      }
    }

    void loadRecipeDetails()

    return () => {
      isMounted = false
    }
  }, [form.recipeId])

  const openNewOrder = async () => {
    const nextNumber = await manufacturingService.getNextProductionOrderNumber()
    setOrderNumberPreview(nextNumber)
    setForm({ ...emptyFormState })
    setErrorMessage('')
    setNewOrderOpen(true)
  }

  const handleCloseOrderDialog = () => {
    setNewOrderOpen(false)
    setForm({ ...emptyFormState })
    setErrorMessage('')
  }

  const validateForm = (): string | null => {
    if (!form.recipeId) {
      return 'يجب اختيار نموذج التصنيع.'
    }

    if (isRecipeLoading) {
      return 'جارٍ تحميل مواد نموذج التصنيع، يرجى الانتظار.'
    }

    if (!selectedRecipe) {
      return 'جارٍ تحميل مواد نموذج التصنيع، يرجى الانتظار.'
    }

    if (!selectedRecipe.items || selectedRecipe.items.length === 0) {
      return 'نموذج التصنيع لا يحتوي على مواد أولية.'
    }

    if (!form.outputWarehouseId) {
      return 'يجب اختيار مخزن المنتج النهائي.'
    }

    const planned = Number(form.plannedOutputQuantity)
    const actual = Number(form.actualOutputQuantity)
    if (!Number.isFinite(planned) || planned <= 0) {
      return 'يجب أن تكون الكمية المخططة أكبر من صفر.'
    }
    if (!Number.isFinite(actual) || actual <= 0) {
      return 'يجب أن تكون الكمية الفعلية أكبر من صفر.'
    }

    if (form.items.length === 0) {
      return 'يجب إضافة مادة أولية واحدة على الأقل.'
    }

    for (const item of form.items) {
      if (!item.materialId) {
        return 'توجد مادة أولية غير محددة.'
      }
      if (!item.warehouseId) {
        return 'كل مادة أولية تحتاج إلى مخزن صرف.'
      }
      const qty = Number(item.actualQuantity)
      if (!Number.isFinite(qty) || qty <= 0) {
        return 'كل مادة أولية يجب أن تحتوي على كمية فعلية أكبر من صفر.'
      }
    }

    return null
  }

  const handleSaveOrder = async () => {
    const validationMessage = validateForm()
    if (validationMessage) {
      setErrorMessage(validationMessage)
      return
    }

    const payload: ProductionOrderPayload = {
      recipeId: form.recipeId,
      outputWarehouseId: form.outputWarehouseId,
      plannedOutputQuantity: Number(form.plannedOutputQuantity),
      actualOutputQuantity: Number(form.actualOutputQuantity),
      date: form.date,
      notes: form.notes.trim(),
      items: form.items.map((item) => ({
        recipeItemId: item.recipeItemId ?? null,
        materialId: item.materialId,
        warehouseId: item.warehouseId,
        plannedQuantity: Number(item.plannedQuantity || item.actualQuantity),
        actualQuantity: Number(item.actualQuantity),
        unit: item.unit,
        notes: item.notes.trim(),
      })),
    }

    try {
      setErrorMessage('')
      await manufacturingService.createProductionOrder(payload)
      await loadData()
      handleCloseOrderDialog()
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر إنشاء أمر الإنتاج. يرجى المحاولة مرة أخرى.'))
    }
  }

  const handleDeleteOrder = async (orderId: string) => {
    const confirmed = window.confirm('هل أنت متأكد من حذف هذا الأمر مع إلغاء أثر المخزون والتكلفة؟')
    if (!confirmed) {
      return
    }

    try {
      setErrorMessage('')
      await manufacturingService.deleteProductionOrder(orderId)
      setSelectedOrder(null)
      setDetailsOpen(false)
      await loadData()
    } catch (error) {
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حذف أمر الإنتاج، يرجى التحقق من رصيد المخزون والمواد قبل الحذف.'))
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title="أوامر الإنتاج" breadcrumb="إنشاء واعتماد أوامر إنتاج فعليّة مع أثر المخزون" />

      <SectionCard
        title="سجل أوامر الإنتاج"
        actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => { void openNewOrder() }}>
            أمر إنتاج جديد
          </Button>
        }
      >
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <Box component="thead" sx={{ background: '#F8FAFC' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>رقم الأمر</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>النموذج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>المنتج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>كمية الإنتاج</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>المخزن</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>التكلفة</Box>
                <Box component="th" sx={{ p: 2, textAlign: 'center', fontWeight: 700 }}>الإجراء</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {orders.map((order) => (
                <Box component="tr" key={order.id} sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.04)', background: '#fff' }}>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.orderNumber}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.recipeName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.productName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.actualOutputQuantity}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.outputWarehouseName}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>{order.totalProductionCost.toFixed(2)}</Box>
                  <Box component="td" sx={{ p: 2, textAlign: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<FiEye />}
                      onClick={() => {
                        setSelectedOrder(order)
                        setDetailsOpen(true)
                      }}
                    >
                      تفاصيل
                    </Button>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </SectionCard>

      <Dialog open={newOrderOpen} onClose={handleCloseOrderDialog} maxWidth="lg" fullWidth>
        <DialogTitle>إنشاء أمر إنتاج جديد</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'grid', gap: 2 }}>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))', gap: 2 }}>
              <TextField label="رقم الأمر" value={orderNumberPreview} InputProps={{ readOnly: true }} />
              <TextField label="تاريخ الأمر" type="date" value={form.date} onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))} />
              <Autocomplete
                options={recipes}
                getOptionLabel={(option) => option.name}
                value={recipes.find((recipe) => recipe.id === form.recipeId) ?? null}
                onChange={(_, value) => {
                  const nextRecipeId = value?.id ?? ''
                  setForm((current) => ({
                    ...current,
                    recipeId: nextRecipeId,
                    items: [],
                  }))
                  if (nextRecipeId) {
                    void (async () => {
                      const recipe = await manufacturingService.getRecipeById(nextRecipeId)
                      setSelectedRecipe(recipe)
                      if (!recipe) {
                        setForm((current) => ({ ...current, items: [] }))
                        return
                      }

                      setForm((current) => ({
                        ...current,
                        items: syncRecipeItems(recipe, current.plannedOutputQuantity || String(recipe.standardOutputQuantity), current.items),
                      }))
                    })()
                  } else {
                    setSelectedRecipe(null)
                  }
                }}
                renderInput={(params) => <TextField {...params} label="نموذج التصنيع" />}
              />
              <TextField
                select
                label="مخزن المنتج النهائي"
                value={form.outputWarehouseId}
                onChange={(event) => setForm((current) => ({ ...current, outputWarehouseId: event.target.value }))}
              >
                {warehouses.filter((warehouse) => warehouse.status !== 'deleted').map((warehouse) => (
                  <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                ))}
              </TextField>
              <TextField
                label="الكمية المخططة"
                value={form.plannedOutputQuantity}
                onChange={(event) => {
                  const nextValue = event.target.value
                  setForm((current) => {
                    const nextForm = { ...current, plannedOutputQuantity: nextValue }

                    if (!selectedRecipe || !selectedRecipe.items || selectedRecipe.items.length === 0) {
                      return nextForm
                    }

                    const plannedOutput = Number(nextValue)
                    const standardOutput = Number(selectedRecipe.standardOutputQuantity)

                    if (!Number.isFinite(plannedOutput) || plannedOutput <= 0 || !Number.isFinite(standardOutput) || standardOutput <= 0) {
                      return nextForm
                    }

                    const factor = plannedOutput / standardOutput
                    const nextItems = selectedRecipe.items.map((item, index) => {
                      const previousItem = current.items.find((entry) => entry.materialId === item.materialId) ?? current.items[index]
                      const plannedQuantity = Number(item.quantity ?? 0) * factor
                      const actualCurrent = previousItem ? Number(previousItem.actualQuantity) : NaN
                      const actualQuantity = Number.isFinite(actualCurrent) && actualCurrent > 0 ? actualCurrent : plannedQuantity

                      return {
                        id: previousItem?.id ?? `${selectedRecipe.id}-${item.id ?? index}`,
                        materialId: item.materialId,
                        warehouseId: previousItem?.warehouseId ?? '',
                        plannedQuantity: String(plannedQuantity),
                        actualQuantity: String(actualQuantity),
                        notes: previousItem?.notes ?? item.notes ?? '',
                      }
                    })

                    return { ...nextForm, items: nextItems }
                  })
                }}
              />
              <TextField
                label="الكمية الفعلية"
                value={form.actualOutputQuantity}
                onChange={(event) => setForm((current) => ({ ...current, actualOutputQuantity: event.target.value }))}
              />
            </Box>

            {selectedRecipe && (
              <Box sx={{ p: 2, border: '1px solid rgba(15, 23, 42, 0.08)', borderRadius: 2, background: '#F8FAFC' }}>
                <Typography sx={{ fontWeight: 700, mb: 1 }}>{selectedRecipe.name}</Typography>
                <Typography variant="body2" color="text.secondary">الكمية القياسية: {selectedRecipe.standardOutputQuantity} | المنتج: {selectedRecipe.productName}</Typography>
              </Box>
            )}

            {isRecipeLoading ? (
              <Alert severity="info">جارٍ تحميل مواد نموذج التصنيع، يرجى الانتظار.</Alert>
            ) : null}

            {selectedRecipe && selectedRecipe.items && selectedRecipe.items.length > 0 ? (
              <Box sx={{ display: 'grid', gap: 2 }}>
                <TextField
                  select
                  label="المخزن الافتراضي للمواد الأولية"
                  value={form.defaultInputWarehouseId}
                  onChange={(event) => {
                    const warehouseId = event.target.value
                    setForm((current) => ({
                      ...current,
                      defaultInputWarehouseId: warehouseId,
                      items: current.items.map((item) => ({
                        ...item,
                        warehouseId: item.warehouseId || warehouseId,
                      })),
                    }))
                  }}
                >
                  <MenuItem value="">بدون مخزن افتراضي</MenuItem>
                  {warehouses.filter((warehouse) => warehouse.status !== 'deleted').map((warehouse) => (
                    <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                  ))}
                </TextField>

                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>المواد الأولية</Typography>
                  <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                    <Box component="thead" sx={{ background: '#F8FAFC' }}>
                      <Box component="tr">
                        <Box component="th" sx={{ p: 1, textAlign: 'center' }}>المادة</Box>
                        <Box component="th" sx={{ p: 1, textAlign: 'center' }}>الوحدة</Box>
                        <Box component="th" sx={{ p: 1, textAlign: 'center' }}>الكمية حسب النموذج</Box>
                        <Box component="th" sx={{ p: 1, textAlign: 'center' }}>الاستهلاك الفعلي</Box>
                        <Box component="th" sx={{ p: 1, textAlign: 'center' }}>مخزن الصرف</Box>
                        <Box component="th" sx={{ p: 1, textAlign: 'center' }}>الإجراءات</Box>
                      </Box>
                    </Box>
                    <Box component="tbody">
                      {form.items.map((item) => {
                        const material = materials.find((entry) => entry.id === item.materialId)
                        return (
                          <Box component="tr" key={item.id} sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.05)' }}>
                            <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                              <TextField value={material ? formatMaterialLabel(material) : ''} InputProps={{ readOnly: true }} size="small" fullWidth />
                            </Box>
                            <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                              <TextField value={item.unit || material?.unit || ''} InputProps={{ readOnly: true }} size="small" fullWidth />
                            </Box>
                            <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                              <TextField value={item.plannedQuantity} InputProps={{ readOnly: true }} size="small" fullWidth />
                            </Box>
                            <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                              <TextField
                                value={item.actualQuantity}
                                type="number"
                                size="small"
                                fullWidth
                                onChange={(event) => {
                                  setForm((current) => ({
                                    ...current,
                                    items: current.items.map((entry) => entry.id === item.id ? { ...entry, actualQuantity: event.target.value } : entry),
                                  }))
                                }}
                              />
                            </Box>
                            <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                              <TextField
                                select
                                value={item.warehouseId}
                                size="small"
                                fullWidth
                                onChange={(event) => {
                                  setForm((current) => ({
                                    ...current,
                                    items: current.items.map((entry) => entry.id === item.id ? { ...entry, warehouseId: event.target.value } : entry),
                                  }))
                                }}
                              >
                                {warehouses.filter((warehouse) => warehouse.status !== 'deleted').map((warehouse) => (
                                  <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
                                ))}
                              </TextField>
                            </Box>
                            <Box component="td" sx={{ p: 1, textAlign: 'center' }}>
                              <Button size="small" color="error" onClick={() => {
                                setForm((current) => ({
                                  ...current,
                                  items: current.items.filter((entry) => entry.id !== item.id),
                                }))
                              }}>حذف</Button>
                            </Box>
                          </Box>
                        )
                      })}
                    </Box>
                  </Box>
                </Box>
              </Box>
            ) : null}

            <TextField
              label="ملاحظات الأمر"
              multiline
              minRows={3}
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
            />

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseOrderDialog}>إلغاء</Button>
          <Button variant="contained" onClick={() => { void handleSaveOrder() }}>حفظ الأمر</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>تفاصيل أمر الإنتاج</DialogTitle>
        <DialogContent dividers>
          {selectedOrder ? (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography>رقم الأمر: {selectedOrder.orderNumber}</Typography>
              <Typography>النموذج: {selectedOrder.recipeName}</Typography>
              <Typography>المنتج: {selectedOrder.productName}</Typography>
              <Typography>المخزن: {selectedOrder.outputWarehouseName}</Typography>
              <Typography>الكمية الفعلية: {selectedOrder.actualOutputQuantity}</Typography>
              <Typography>التكلفة الكلية: {selectedOrder.totalProductionCost.toFixed(2)}</Typography>
              {selectedOrder.inputs && selectedOrder.inputs.length > 0 && (
                <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                  <Box component="thead">
                    <Box component="tr">
                      <Box component="th">المادة</Box>
                      <Box component="th">المخزن</Box>
                      <Box component="th">الكمية</Box>
                      <Box component="th">التكلفة</Box>
                    </Box>
                  </Box>
                  <Box component="tbody">
                    {selectedOrder.inputs.map((input) => (
                      <Box component="tr" key={input.id}>
                        <Box component="td">{input.materialName}</Box>
                        <Box component="td">{input.warehouseName}</Box>
                        <Box component="td">{input.actualQuantity}</Box>
                        <Box component="td">{input.totalCost.toFixed(2)}</Box>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'space-between' }}>
          <Button color="error" variant="outlined" onClick={() => { if (selectedOrder) { void handleDeleteOrder(selectedOrder.id) } }}>حذف الأمر</Button>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
