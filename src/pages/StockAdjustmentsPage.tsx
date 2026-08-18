import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Button, CircularProgress, TextField, MenuItem, Typography } from '@mui/material'
import { FiPlus } from 'react-icons/fi'
import { inventoryService, movementsService, type WarehouseRecord, type StockMovementItem } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'

type AdjustmentLineItem = {
  materialId: string
  quantity: number | ''
  unit: string
  notes?: string
}

export default function StockAdjustmentsPage() {
  const navigate = useNavigate()
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [selectedWarehouse, setSelectedWarehouse] = useState('')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<AdjustmentLineItem[]>([{ materialId: '', quantity: '', unit: '', notes: '' }])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const materialOptions = useMemo(() => {
    const flattened: MaterialRecord[] = []
    const walk = (nodes: MaterialRecord[]) => {
      for (const item of nodes) {
        if (item.type === 'sub' && !item.isNonStock && (item.status ?? 'active') !== 'deleted') {
          flattened.push(item)
        }
        if (item.children?.length) walk(item.children)
      }
    }
    walk(materials)
    return flattened
  }, [materials])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [wh, mat] = await Promise.all([inventoryService.listWarehouses(), materialsService.listMaterials()])
      setWarehouses(wh)
      setMaterials(mat)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
  }, [loadData])

  const updateItem = (index: number, partial: Partial<AdjustmentLineItem>) => {
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, ...partial } : item))
  }

  const addLine = () => setItems((prev) => [...prev, { materialId: '', quantity: '', unit: '', notes: '' }])
  const removeLine = (index: number) => setItems((prev) => prev.filter((_, idx) => idx !== index))

  const handleMaterialChange = (index: number, materialId: string) => {
    const material = materialOptions.find((m) => m.id === materialId)
    updateItem(index, { materialId, unit: material?.unit ?? '' })
  }

  async function submitAdjustment() {
    if (!selectedWarehouse) {
      return alert('اختر مخزناً لتسوية الجرد.')
    }

    const invalid = items.find((item) => !item.materialId || item.quantity === '' || Number.isNaN(Number(item.quantity)) || Number(item.quantity) === 0)
    if (invalid) {
      return alert('تأكد من صحة المواد والكميات في التسوية.')
    }

    const quantities = items.map((item) => Number(item.quantity))
    const allPositive = quantities.every((value) => value > 0)
    const allNegative = quantities.every((value) => value < 0)
    if (!allPositive && !allNegative) {
      return alert('يجب أن تكون جميع كميات التسوية موجبة أو سالبة فقط.')
    }

    const docWarehouse = allPositive ? { fromWarehouseId: null, toWarehouseId: selectedWarehouse } : { fromWarehouseId: selectedWarehouse, toWarehouseId: null }

    const doc = {
      reference: reference.trim() || undefined,
      type: 'adjustment' as const,
      date: new Date().toISOString(),
      notes: notes.trim(),
      createdBy: 'local-user',
      ...docWarehouse,
      items: items.map((item) => ({ materialId: item.materialId, quantity: Number(item.quantity), unit: item.unit, notes: item.notes?.trim() } as StockMovementItem)),
    }

    try {
      setSaving(true)
      await movementsService.create(doc)
      alert('تم حفظ تسوية الجرد بنجاح.')
      navigate('/inventory/movements')
    } catch (err) {
      console.error('CREATE STOCK ADJUSTMENT FAILED', err)
      alert(getUserFriendlyErrorMessage(err, 'تعذر حفظ التسوية. يرجى المحاولة مرة أخرى.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title="تسويات الجرد" breadcrumb="إنشاء تسوية مخزون برصيد تصحيح حقيقي لكل مخزن" />

      <SectionCard title="تفاصيل التسوية">
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField
              select
              label="المخزن"
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              fullWidth
            >
              <MenuItem value="">اختر مخزناً</MenuItem>
              {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
            </TextField>
            <TextField label="رقم المستند (المرجع)" value={reference} onChange={(e) => setReference(e.target.value)} fullWidth />
            <TextField label="ملاحظات التسوية" value={notes} onChange={(e) => setNotes(e.target.value)} fullWidth multiline minRows={2} />

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mt: 2, mb: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>مواد التسوية</Typography>
              <Button variant="outlined" startIcon={<FiPlus />} onClick={addLine}>إضافة مادة أخرى</Button>
            </Box>
            <Box sx={{ display: 'grid', gap: 2 }}>
              {items.map((item, index) => (
                <Box key={index} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                  <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr 1fr 1fr', alignItems: 'center' }}>
                    <TextField
                      select
                      label="المادة"
                      value={item.materialId}
                      onChange={(e) => handleMaterialChange(index, e.target.value)}
                      fullWidth
                    >
                      <MenuItem value="">اختر مادة</MenuItem>
                      {materialOptions.map((mat) => <MenuItem key={mat.id} value={mat.id}>{mat.materialNumber} - {mat.name}</MenuItem>)}
                    </TextField>
                    <TextField
                      label="الكمية"
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                      fullWidth
                      helperText="قيمة موجبة لزيادة الرصيد، قيمة سالبة لتقليله"
                    />
                    <TextField label="الوحدة" value={item.unit} fullWidth disabled />
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button color="error" onClick={() => removeLine(index)} disabled={items.length === 1}>إزالة المادة</Button>
                  </Box>
                </Box>
              ))}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button onClick={() => navigate('/inventory')}>إلغاء</Button>
              <Button variant="contained" onClick={submitAdjustment} disabled={saving}>{saving ? <CircularProgress size={20} /> : 'حفظ التسوية'}</Button>
            </Box>
          </Box>
        )}
      </SectionCard>
    </Box>
  )
}
