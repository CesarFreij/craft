import { useEffect, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, TablePagination } from '@mui/material'
import { FiEdit2, FiPlus, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'

export function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [open, setOpen] = useState(false)
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [form, setForm] = useState({ code: '', name: '', location: '', notes: '' })
  const [search] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const load = async () => {
    const data = await inventoryService.listWarehouses()
    setWarehouses(data)
  }

  useEffect(() => {
    const init = async () => {
      const data = await inventoryService.listWarehouses()
      setWarehouses(data)
    }

    void init()
  }, [])

  const handleEditOpen = (w: WarehouseRecord) => {
    setForm({ code: w.code, name: w.name, location: w.location ?? '', notes: w.notes ?? '' })
    setEditingWarehouseId(w.id)
    setErrorMessage('')
    setOpen(true)
  }

  const handleToggleStatus = async (w: WarehouseRecord) => {
    try {
      const hasActivity = await inventoryService.hasWarehouseActivity(w.id)
      if (hasActivity) {
        alert('لا يمكن تعطيل المخزن لأنه مرتبط بحركات أو أرصدة.')
        return
      }
      const nextStatus = w.status === 'active' ? 'disabled' : 'active'
      await inventoryService.toggleWarehouseStatus(w.id, nextStatus)
      await load()
    } catch (error) {
      console.error('TOGGLE WAREHOUSE STATUS FAILED', error)
      alert(getUserFriendlyErrorMessage(error, 'تعذر تغيير حالة المخزن. يرجى المحاولة مرة أخرى.'))
    }
  }

  const handleDeleteClick = (warehouse: WarehouseRecord) => {
    setWarehouseToDelete(warehouse)
    setDeleteDialogOpen(true)
  }

  const handleConfirmDelete = async () => {
    if (!warehouseToDelete) {
      return
    }

    try {
      setErrorMessage('')
      await inventoryService.deleteWarehouse(warehouseToDelete.id)
      setDeleteDialogOpen(false)
      setWarehouseToDelete(null)
      await load()
    } catch (error) {
      console.error('DELETE WAREHOUSE FAILED', error)
      setErrorMessage(getUserFriendlyErrorMessage(error, 'تعذر حذف المخزن. يرجى المحاولة مرة أخرى.'))
    }
  }

  const handleSaveWarehouse = async () => {
    const code = form.code.trim()
    const name = form.name.trim()

    if (!code || !name) {
      setErrorMessage('كود المخزن والاسم مطلوبان.')
      return
    }

    try {
      setErrorMessage('')
      const payload = {
        code,
        name,
        location: form.location.trim(),
        notes: form.notes.trim(),
        status: 'active',
      }
      if (editingWarehouseId) {
        await inventoryService.updateWarehouse(editingWarehouseId, payload)
      } else {
        await inventoryService.createWarehouse(payload)
      }
      setOpen(false)
      setEditingWarehouseId(null)
      setForm({ code: '', name: '', location: '', notes: '' })
      await load()
    } catch (err) {
      console.error('SAVE WAREHOUSE FAILED', err)
      setErrorMessage(getUserFriendlyErrorMessage(err, 'تعذر حفظ المخزن. يرجى المحاولة مرة أخرى.'))
    }
  }

  const filteredWarehouses = warehouses.filter(w => w.code.toLowerCase().includes(search.toLowerCase()) || w.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title="إضافة مخازن" breadcrumb="إدارة المستودعات" />

      <SectionCard title="قائمة المخازن" actions={
        <Button variant="contained" startIcon={<FiPlus />} onClick={() => { setForm({ code: '', name: '', location: '', notes: '' }); setEditingWarehouseId(null); setErrorMessage(''); setOpen(true) }}>إضافة مخزن</Button>
      }>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <Box component="thead" sx={{ background: '#F8FAFC' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الكود</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الاسم</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الموقع</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الحالة</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الإجراءات</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredWarehouses
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((w) => (
                  <Box component="tr" key={w.id} sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.04)', background: '#fff' }}>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#0F172A', whiteSpace: 'nowrap' }}>{w.code}</Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#0F172A', whiteSpace: 'nowrap' }}>{w.name}</Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#475569' }}>{w.location || '—'}</Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      <Box component="span" sx={{ display: 'inline-flex', px: 1.2, py: 0.6, borderRadius: 999, background: w.status === 'active' ? 'rgba(14,165,233,.12)' : 'rgba(148,163,184,.12)', color: w.status === 'active' ? '#0369A1' : '#475569', fontSize: 12, fontWeight: 700 }}>
                        {w.status === 'active' ? 'نشط' : 'معطل'}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Tooltip title={w.status === 'active' ? 'تعطيل' : 'تفعيل'}>
                          <IconButton size="small" onClick={() => handleToggleStatus(w)} sx={{ color: w.status === 'active' ? '#22D3EE' : '#475569' }}>
                            {w.status === 'active' ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل"><IconButton size="small" onClick={() => handleEditOpen(w)} color="primary"><FiEdit2 size={16} /></IconButton></Tooltip>
                        <Tooltip title="حذف المخزن">
                          <IconButton size="small" onClick={() => handleDeleteClick(w)} color="error">
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, px: 1 }}>
          <TablePagination component="div" count={filteredWarehouses.length} page={page} onPageChange={(_, p) => setPage(p)} rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(0) }} />
        </Box>
      </SectionCard>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{editingWarehouseId ? 'تعديل مخزن' : 'إضافة مخزن'}</DialogTitle>
        <DialogContent>
          {errorMessage ? <Alert severity="error" sx={{ mb: 2 }}>{errorMessage}</Alert> : null}
          <TextField label="كود" fullWidth value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} sx={{ mt: 1 }} />
          <TextField label="اسم" fullWidth value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} sx={{ mt: 1 }} />
          <TextField label="الموقع" fullWidth value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} sx={{ mt: 1 }} />
          <TextField label="ملاحظات" fullWidth value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} sx={{ mt: 1 }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveWarehouse}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>حذف المخزن نهائياً</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <Box sx={{ color: '#111827' }}>
            هل أنت متأكد من حذف المخزن نهائياً؟
          </Box>
          {warehouseToDelete ? (
            <Box sx={{ display: 'grid', gap: 1 }}>
              <Box><strong>كود المخزن:</strong> {warehouseToDelete.code}</Box>
              <Box><strong>اسم المخزن:</strong> {warehouseToDelete.name}</Box>
            </Box>
          ) : null}
          <Box sx={{ color: '#B91C1C', fontSize: 13 }}>لا يمكن التراجع عن هذا الإجراء.</Box>
          {errorMessage ? <Alert severity="error">{errorMessage}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>حذف نهائي</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
