import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, InputAdornment, TextField, MenuItem, Table, TableHead, TableRow, TableCell, TableBody, TablePagination } from '@mui/material'
import { FiPlus, FiCalendar } from 'react-icons/fi'
import { inventoryService, movementsService, type WarehouseRecord, type StockMovementDocument } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import { SearchField } from '../components/ui/SearchField'
import { SectionCard } from '../components/ui/SectionCard'
import { PageHeader } from '../components/ui/PageHeader'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatDateDMY, formatDisplayNumber, toInternalDate } from '../utils/displayFormatting'

type MovementType =
  | 'purchase'
  | 'sale'
  | 'production'
  | 'transfer'
  | 'adjustment'
  | 'purchase_return'
  | 'sale_return'

const movementTypeLabels: Record<string, string> = {
  purchase: 'شراء',
  sale: 'بيع',
  purchase_return: 'إرجاع مشتريات',
  sale_return: 'إرجاع مبيعات',
  production: 'تصنيع',
  production_in: 'تصنيع',
  production_out: 'تصنيع',
  transfer: 'تحويل',
  transfer_in: 'تحويل',
  transfer_out: 'تحويل',
  adjustment: 'تسوية جرد',
  adjustment_in: 'تسوية جرد',
  adjustment_out: 'تسوية جرد',
  manual_in: 'تسوية جرد',
  manual_out: 'تسوية جرد',
  stock_in: 'تسوية جرد',
  stock_out: 'تسوية جرد',
  opening: 'رصيد افتتاحي',
  opening_balance: 'رصيد افتتاحي',
  opening_balance_in: 'رصيد افتتاحي',
}

const movementTypeFilterOptions: Array<{ value: string; label: string }> = [
  { value: '', label: 'الكل' },
  { value: 'purchase', label: 'شراء' },
  { value: 'sale', label: 'بيع' },
  { value: 'production', label: 'تصنيع' },
  { value: 'transfer', label: 'تحويل' },
  { value: 'adjustment', label: 'تسوية جرد' },
  { value: 'opening', label: 'رصيد افتتاحي' },
  { value: 'purchase_return', label: 'إرجاع مشتريات' },
  { value: 'sale_return', label: 'إرجاع مبيعات' },
]


function getMovementTypeLabel(type: string, reference?: string): string {
  const normalizedType = (type ?? '').toLowerCase()

  if (reference && /^OPENING-/i.test(reference)) {
    return 'رصيد افتتاحي'
  }

  if (normalizedType === 'purchase_return') {
    return 'إرجاع مشتريات'
  }

  if (normalizedType === 'sale_return') {
    return 'إرجاع مبيعات'
  }

  if (normalizedType === 'production_in' || normalizedType === 'production_out' || normalizedType === 'production') {
    return 'تصنيع'
  }

  if (normalizedType === 'transfer_in' || normalizedType === 'transfer_out' || normalizedType === 'transfer') {
    return 'تحويل'
  }

  if (normalizedType === 'adjustment_in' || normalizedType === 'adjustment_out' || normalizedType === 'adjustment') {
    return 'تسوية جرد'
  }

  if (!normalizedType) {
    return 'غير محدد'
  }

  return movementTypeLabels[normalizedType] ?? 'غير محدد'
}

function getMovementWarehouseLabel(name: string | null | undefined): string {
  return name?.trim() ? name : '__'
}

function DateFilterField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [focused, setFocused] = useState(false)
  const nativeDateInputRef = useRef<HTMLInputElement>(null)
  const shrink = Boolean(value) || focused

  const openDatePicker = () => {
    const input = nativeDateInputRef.current
    if (!input) return
    if (typeof input.showPicker === 'function') {
      input.showPicker()
    } else {
      input.focus()
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        label={label}
        type="text"
        fullWidth
        value={value ? formatDateDMY(value) : ''}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onClick={openDatePicker}
        placeholder="DD/MM/YYYY"
        slotProps={{
          htmlInput: {
            inputMode: 'numeric',
            pattern: '[0-9\\/]*',
          },
          inputLabel: {
            shrink,
            // keep the rest-state label clear of the reserved calendar icon zone
            sx: {
              '&:not(.MuiInputLabel-shrink)': {
                transform: 'translate(46px, 16px) scale(1)',
              },
            },
          },
          input: {
            startAdornment: (
              <InputAdornment position="start" sx={{ marginInlineEnd: 1 }}>
                <IconButton size="small" onClick={openDatePicker} edge="start" aria-label="اختيار التاريخ" sx={{ color: '#0F172A' }}>
                  <FiCalendar />
                </IconButton>
              </InputAdornment>
            ),
          },
        }}
      />
      <input
        ref={nativeDateInputRef}
        type="date"
        value={value || ''}
        onChange={(event) => onChange(event.target.value)}
        style={{ position: 'absolute', top: 0, left: 0, width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        tabIndex={-1}
        aria-hidden="true"
      />
    </Box>
  )
}

type MovementRow = {
  reference: string
  type: string
  date: string
  status: string
  fromWarehouseId?: string | null
  toWarehouseId?: string | null

  itemCount?: number
  warehouseSummary?: string
  documentNotes?: string | null

  materialName?: string
  warehouseName?: string
  quantityIn?: number
  quantityOut?: number
  unit?: string
  createdBy?: string
  supplierName?: string
  customerName?: string
  partyName?: string
}

type MovementLineItem = {
  materialId: string
  quantity: number | ''
  unit: string
  notes?: string
}

type MovementDetailItem = {
  materialId?: string
  materialNumber?: string
  materialName?: string
  warehouseName?: string

  quantity?: number
  quantityIn?: number
  quantityOut?: number

  unit?: string
  cost?: number | null
  notes?: string
}

type MovementDetails = {
  reference?: string
  type: MovementType
  date?: string
  status?: string
  fromWarehouseId?: string | null
  toWarehouseId?: string | null
  createdBy?: string
  notes?: string
  items?: MovementDetailItem[]
  fromWarehouseName?: string | null
  toWarehouseName?: string | null
  partyName?: string
}

export default function MovementsPage() {
  const [loading, setLoading] = useState(true)
  const [movements, setMovements] = useState<MovementRow[]>([])
  const [openNew, setOpenNew] = useState(false)
  const [openDetails, setOpenDetails] = useState(false)
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [materials, setMaterials] = useState<MaterialRecord[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')
  const [materialFilter, setMaterialFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [movementDetails, setMovementDetails] = useState<MovementDetails | null>(null)

  const materialOptions = useMemo(() => {
    const flattened: MaterialRecord[] = []
    const walk = (nodes: MaterialRecord[]) => {
      for (const item of nodes) {
        // only include stockable sub materials
        if (item.type === 'sub' && !item.isNonStock && (item.status ?? 'active') !== 'deleted') {
          flattened.push(item)
        }
        if (item.children?.length) walk(item.children)
      }
    }
    walk(materials)
    return flattened
  }, [materials])

  const loadMovements = useCallback(async () => {
    setLoading(true)
    try {
      const filter: {
        type?: string
        status?: string
        warehouseId?: string
        materialId?: string
        fromDate?: string
        toDate?: string
        reference?: string
      } = {}
      if (typeFilter) filter.type = typeFilter
      if (warehouseFilter) filter.warehouseId = warehouseFilter
      if (materialFilter) filter.materialId = materialFilter
      if (fromDate) filter.fromDate = toInternalDate(fromDate)
      if (toDate) filter.toDate = toInternalDate(toDate)
      if (search) filter.reference = search
      const items = await movementsService.list(filter)
      setMovements(items || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [typeFilter, warehouseFilter, materialFilter, fromDate, toDate, search])

  const initData = useCallback(async () => {
    setLoading(true)
    try {
      const [wh, mat] = await Promise.all([inventoryService.listWarehouses(), materialsService.listMaterials()])
      setWarehouses(wh)
      setMaterials(mat)
      await loadMovements()
    } finally {
      setLoading(false)
    }
  }, [loadMovements])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void initData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [initData])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMovements()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadMovements])

  const openMovementDetails = useCallback(async (reference: string) => {
    const details = await movementsService.getByReference(reference)
    setMovementDetails(details)
    setOpenDetails(true)
  }, [])

  const filteredRows = movements
    .filter((row) => !search || row.reference?.includes(search))
    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)

  const getMovementParty = (row: MovementRow): string => {
    if (row.partyName) {
      return row.partyName
    }
    if (row.supplierName) {
      return row.supplierName
    }
    if (row.customerName) {
      return row.customerName
    }
    return '__'
  }

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title="حركات المخازن" breadcrumb="سجل الحركات الجردية وإدارة الحركات المخزنية" />

      <SectionCard title="سجل الحركات" actions={
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => setOpenNew(true)}>تحويل بين المخازن</Button>
      }>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', mb: 2 }}>
          <SearchField placeholder="بحث بالمرجع" value={search} onChange={(e) => { setSearch(e.target.value); setPage(0) }} />
          <TextField select label="النوع" value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0) }}>
            {movementTypeFilterOptions.map((option) => (
              <MenuItem key={option.value || 'all'} value={option.value}>{option.label}</MenuItem>
            ))}
          </TextField>
          <TextField select label="المخزن" value={warehouseFilter} onChange={(e) => { setWarehouseFilter(e.target.value); setPage(0) }}>
            <MenuItem value="">الكل</MenuItem>
            {warehouses.map((w) => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <TextField select label="المادة" value={materialFilter} onChange={(e) => { setMaterialFilter(e.target.value); setPage(0) }}>
            <MenuItem value="">الكل</MenuItem>
            {materialOptions.map((m) => <MenuItem key={m.id} value={m.id}>{m.materialNumber} - {m.name}</MenuItem>)}
          </TextField>
          <DateFilterField
            label="من تاريخ"
            value={fromDate}
            onChange={(value) => { setFromDate(toInternalDate(value)); setPage(0) }}
          />
          <DateFilterField
            label="إلى تاريخ"
            value={toDate}
            onChange={(value) => { setToDate(toInternalDate(value)); setPage(0) }}
          />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <Button variant="outlined" onClick={() => { setTypeFilter(''); setWarehouseFilter(''); setMaterialFilter(''); setFromDate(''); setToDate(''); setSearch(''); }}>مسح الفلاتر</Button>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Table sx={{ minWidth: 1000, border: '1px solid #E2E8F0', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>التاريخ</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>المرجع</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>نوع الحركة</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>عدد البنود</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>المخزن</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>الجهة</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>ملاحظات</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#0F172A', textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.reference} hover sx={{ background: '#FFFFFF' }}>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#475569' }}>{formatDateDMY(row.date)}</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#0F172A', fontWeight: 600 }}>{row.reference}</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
                      <Box component="span" sx={{ display: 'inline-flex', px: 1.2, py: 0.6, borderRadius: 999, background: row.type === 'sale' ? 'rgba(254,226,226,.3)' : row.type === 'purchase' ? 'rgba(219,234,254,.5)' : row.type === 'production' || row.type === 'production_in' || row.type === 'production_out' ? 'rgba(236,252,203,.7)' : row.type === 'transfer' || row.type === 'transfer_in' || row.type === 'transfer_out' ? 'rgba(224,231,255,.7)' : 'rgba(242,211,255,.7)', color: '#0F172A', fontSize: 12, fontWeight: 700, textAlign: 'center' }}>
                        {getMovementTypeLabel(row.type, row.reference)}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#0F172A' }}>{row.itemCount ?? 0}</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#475569' }}>{row.warehouseSummary || '__'}</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#475569' }}>{getMovementParty({ ...row, partyName: row.partyName ?? undefined } as MovementRow)}</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0', color: '#475569' }}>{row.documentNotes?.trim() ? row.documentNotes : '__'}</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>
                      <Button size="small" variant="outlined" onClick={() => openMovementDetails(row.reference)}>عرض التفاصيل</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination component="div" count={movements.length} page={page} onPageChange={(_, newPage) => setPage(newPage)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }} />
        </Box>
      </SectionCard>

      <NewMovementDialog open={openNew} onClose={() => { setOpenNew(false); void loadMovements() }} warehouses={warehouses} materials={materialOptions} />
      <MovementDetailsDialog open={openDetails} onClose={() => setOpenDetails(false)} details={movementDetails} />
    </Box>
  )
}

function NewMovementDialog({ open, onClose, warehouses, materials }: { open: boolean; onClose: () => void; warehouses: WarehouseRecord[]; materials: MaterialRecord[] }) {
  const [toWarehouse, setToWarehouse] = useState<string | ''>('')
  const [fromWarehouse, setFromWarehouse] = useState<string | ''>('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<MovementLineItem[]>([{ materialId: '', quantity: '', unit: '', notes: '' }])
  const [saving, setSaving] = useState(false)

  const updateItem = (index: number, partial: Partial<MovementLineItem>) => {
    setItems((prev) => prev.map((item, idx) => idx === index ? { ...item, ...partial } : item))
  }

  const addLine = () => setItems((prev) => [...prev, { materialId: '', quantity: '', unit: '', notes: '' }])
  const removeLine = (index: number) => setItems((prev) => prev.filter((_, idx) => idx !== index))

  const handleMaterialChange = (index: number, materialId: string) => {
    const material = materials.find((m) => m.id === materialId)
    updateItem(index, { materialId, unit: material?.unit ?? '' })
  }

  async function submit() {
    if (!fromWarehouse) {
      return alert('اختر المخزن المصدر.')
    }
    if (!toWarehouse) {
      return alert('اختر المخزن الهدف.')
    }
    if (fromWarehouse === toWarehouse) {
      return alert('المخزن المصدر والهدف يجب أن يختلفا.')
    }
    if (!items.length) {
      return alert('يجب إضافة مادة واحدة على الأقل.')
    }

    const invalid = items.find(
      (item) => !item.materialId || item.quantity === '' || Number.isNaN(Number(item.quantity)) || Number(item.quantity) <= 0,
    )
    if (invalid) {
      return alert('تأكد من اختيار جميع المواد وإدخال كميات أكبر من صفر.')
    }

    const selectedMaterialIds = items.map((item) => item.materialId).filter(Boolean)
    if (new Set(selectedMaterialIds).size !== selectedMaterialIds.length) {
      return alert('لا يمكن إضافة نفس المادة أكثر من مرة في التحويل نفسه.')
    }

    const doc: StockMovementDocument = {
      type: 'transfer',
      date: new Date().toISOString(),
      fromWarehouseId: fromWarehouse,
      toWarehouseId: toWarehouse,
      notes: notes.trim(),
      createdBy: 'local-user',
      status: 'completed',
      items: items.map((item) => ({
        materialId: item.materialId,
        quantity: Number(item.quantity),
        unit: item.unit,
        notes: item.notes?.trim(),
      })),
    }

    try {
      setSaving(true)
      await movementsService.create(doc)
      onClose()
      setFromWarehouse('')
      setToWarehouse('')
      setNotes('')
      setItems([{ materialId: '', quantity: '', unit: '', notes: '' }])
    } catch (error) {
      console.error('CREATE TRANSFER FAILED', error)
      alert(getUserFriendlyErrorMessage(error, 'تعذر تنفيذ التحويل بين المخازن. يرجى المحاولة مرة أخرى.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <DialogTitle sx={{ paddingBottom: 0 }}>تحويل بين المخازن</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2, paddingTop: '20px !important' }}>
        <TextField
          label="رقم التحويل"
          value="يُنشأ تلقائياً"
          slotProps={{ input: { readOnly: true } }}
          fullWidth
        />

        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(2, minmax(220px, 1fr))' }}>
          <TextField
            select
            label="المخزن المصدر"
            value={fromWarehouse}
            onChange={(e) => setFromWarehouse(e.target.value)}
            fullWidth
            required
          >
            <MenuItem value="">اختر المخزن المصدر</MenuItem>
            {warehouses
              .filter((warehouse) => warehouse.id !== toWarehouse)
              .map((warehouse) => <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>)}
          </TextField>

          <TextField
            select
            label="المخزن الهدف"
            value={toWarehouse}
            onChange={(e) => setToWarehouse(e.target.value)}
            fullWidth
            required
          >
            <MenuItem value="">اختر المخزن الهدف</MenuItem>
            {warehouses
              .filter((warehouse) => warehouse.id !== fromWarehouse)
              .map((warehouse) => <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>)}
          </TextField>
        </Box>

        <TextField
          label="ملاحظات التحويل"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          minRows={2}
        />

        <SectionCard title="مواد التحويل">
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 850, border: '1px solid #E2E8F0', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC' }}>
                  <TableCell sx={{ width: '34%', textAlign: 'center', fontWeight: 700 }}>المادة</TableCell>
                  <TableCell sx={{ width: '14%', textAlign: 'center', fontWeight: 700 }}>الوحدة</TableCell>
                  <TableCell sx={{ width: '18%', textAlign: 'center', fontWeight: 700 }}>الكمية</TableCell>
                  <TableCell sx={{ width: '24%', textAlign: 'center', fontWeight: 700 }}>ملاحظات المادة</TableCell>
                  <TableCell sx={{ width: '10%', textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <TextField
                        select
                        value={item.materialId}
                        onChange={(e) => handleMaterialChange(index, e.target.value)}
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#FFFFFF',
                            '& fieldset': {
                              borderColor: '#94A3B8',
                              borderWidth: 1,
                            },
                            '&:hover fieldset': {
                              borderColor: '#64748B',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#2563EB',
                              borderWidth: 1.5,
                            },
                          },
                        }}
                      >
                        <MenuItem value="">اختر مادة</MenuItem>
                        {materials.map((material) => (
                          <MenuItem key={material.id} value={material.id}>{material.materialNumber} - {material.name}</MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={item.unit}
                        fullWidth
                        size="small"
                        slotProps={{ input: { readOnly: true } }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#F8FAFC',
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, { quantity: e.target.value === '' ? '' : Number(e.target.value) })}
                        fullWidth
                        size="small"
                        slotProps={{ htmlInput: { min: 0, step: 'any' } }}
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#FFFFFF',
                            '& fieldset': {
                              borderColor: '#94A3B8',
                              borderWidth: 1,
                            },
                            '&:hover fieldset': {
                              borderColor: '#64748B',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#2563EB',
                              borderWidth: 1.5,
                            },
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        value={item.notes ?? ''}
                        onChange={(e) => updateItem(index, { notes: e.target.value })}
                        fullWidth
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            backgroundColor: '#FFFFFF',
                            '& fieldset': {
                              borderColor: '#94A3B8',
                              borderWidth: 1,
                            },
                            '&:hover fieldset': {
                              borderColor: '#64748B',
                            },
                            '&.Mui-focused fieldset': {
                              borderColor: '#2563EB',
                              borderWidth: 1.5,
                            },
                          },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button color="error" size="small" onClick={() => removeLine(index)} disabled={items.length === 1}>إزالة</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
            <Button variant="outlined" onClick={addLine} startIcon={<FiPlus />}>إضافة مادة</Button>
          </Box>
        </SectionCard>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إلغاء</Button>
        <Button variant="contained" onClick={submit} disabled={saving}>
          {saving ? <CircularProgress size={20} /> : 'اعتماد التحويل'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function MovementDetailsDialog({ open, onClose, details }: { open: boolean; onClose: () => void; details: MovementDetails | null }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>تفاصيل الحركة</DialogTitle>
      <DialogContent sx={{ display: 'grid', gap: 2 }}>
        {!details ? (
          <CircularProgress />
        ) : (
          <>
            <Box>رقم المستند: {details.reference || '__'}</Box>
            <Box>نوع الحركة: {getMovementTypeLabel(details.type, details.reference)}</Box>
            <Box>التاريخ: {formatDateDMY(details.date) || '__'}</Box>
            <Box>من مخزن: {getMovementWarehouseLabel(details.fromWarehouseName)}</Box>
            <Box>إلى مخزن: {getMovementWarehouseLabel(details.toWarehouseName)}</Box>
            <Box>الجهة: {details.partyName || '__'}</Box>
            <Box>
              <Table sx={{ border: '1px solid #E2E8F0', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <TableHead>
                  <TableRow sx={{ background: '#F8FAFC' }}>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>المادة</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>المخزن</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>وارد</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>صادر</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>الوحدة</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>التكلفة</TableCell>
                    <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {details.items?.map((item: MovementDetailItem, index: number) => (
                    <TableRow key={index} sx={{ background: '#FFFFFF' }}>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.materialNumber ? `${item.materialNumber} - ${item.materialName ?? ''}` : item.materialName ?? '__'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.warehouseName || '__'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{Number(item.quantityIn ?? 0) > 0 ? formatDisplayNumber(item.quantityIn ?? 0, 2) : '__'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{Number(item.quantityOut ?? 0) > 0 ? formatDisplayNumber(item.quantityOut ?? 0, 2) : '__'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.unit || '__'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.cost !== null && item.cost !== undefined ? formatDisplayNumber(item.cost, 2) : '__'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', verticalAlign: 'middle', border: '1px solid #E2E8F0' }}>{item.notes?.trim() ? item.notes : '__'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>إغلاق</Button>
      </DialogActions>
    </Dialog>
  )
}