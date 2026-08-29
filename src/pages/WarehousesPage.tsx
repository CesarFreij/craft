import { useCallback, useEffect, useState } from 'react'
import { Alert, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, IconButton, Tooltip, TablePagination } from '@mui/material'
import { FiEdit2, FiPlus, FiToggleLeft, FiToggleRight, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { useNotifications } from '../contexts/useNotifications'

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

export function WarehousesPage() {
  const notify = useNotifications()
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [open, setOpen] = useState(false)
  const [editingWarehouseId, setEditingWarehouseId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [warehouseToDelete, setWarehouseToDelete] = useState<WarehouseRecord | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [pageErrorMessage, setPageErrorMessage] = useState('')
  const [form, setForm] = useState({ code: '', name: '', location: '', notes: '' })
  const [search] = useState('')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const showPageError = useCallback((message: string) => {
    setPageErrorMessage(message)

    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
    })
  }, [])

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
        showPageError('لا يمكن تعطيل المخزن لأنه مرتبط بحركات أو أرصدة.')
        return
      }
      const nextStatus = w.status === 'active' ? 'disabled' : 'active'
      await inventoryService.toggleWarehouseStatus(w.id, nextStatus)
      setPageErrorMessage('')
      await load()
      if(nextStatus === 'active') 
        notify.success('تم تفعيل المخزن بنجاح.')
      else 
        notify.info('تم تعطيل المخزن بنجاح.')
    } catch (error) {
      console.error('TOGGLE WAREHOUSE STATUS FAILED', error)
      showPageError(getUserFriendlyErrorMessage(error, 'تعذر تغيير حالة المخزن. يرجى المحاولة مرة أخرى.'))
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
      notify.error('تم حذف المخزن بنجاح.')
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
        notify.info('تم تعديل المخزن بنجاح.')
      } else {
        await inventoryService.createWarehouse(payload)
        notify.success('تمت إضافة المخزن بنجاح.')
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
    <Box sx={craftPageGlassSx}>
      <PageHeader title="إضافة مخازن" breadcrumb="إدارة المستودعات" />
      {pageErrorMessage ? (
        <Alert severity="error" sx={{ ...craftErrorAlertSx, mb: 2 }}>
          {pageErrorMessage}
        </Alert>
      ) : null}


        <SectionCard title="قائمة المخازن" actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => { setForm({ code: '', name: '', location: '', notes: '' }); setEditingWarehouseId(null); setErrorMessage(''); setOpen(true) }}>إضافة مخزن</Button>
        }>
        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              width: '100%',
              borderCollapse: 'collapse',
              minWidth: 700,
              tableLayout: 'fixed',
              border: '1px solid rgba(255, 255, 255, 0.18)',
              '& th, & td': {
                border: '1px solid rgba(255, 255, 255, 0.18)',
              },
            }}
          >
            <Box component="thead" sx={{ background: 'rgba(255, 255, 255, 0.055)' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, width: '20%', fontWeight: 700, color: 'rgba(255, 255, 255, 0.94)' }}>الكود</Box>
                <Box component="th" sx={{ p: 2, width: '20%', fontWeight: 700, color: 'rgba(255, 255, 255, 0.94)' }}>الاسم</Box>
                <Box component="th" sx={{ p: 2, width: '20%', fontWeight: 700, color: 'rgba(255, 255, 255, 0.94)' }}>الموقع</Box>
                <Box component="th" sx={{ p: 2, width: '20%', fontWeight: 700, color: 'rgba(255, 255, 255, 0.94)' }}>الحالة</Box>
                <Box component="th" sx={{ p: 1.25, width: '20%', minWidth: 132, fontWeight: 700, color: 'rgba(255, 255, 255, 0.94)', whiteSpace: 'nowrap' }}>الإجراءات</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filteredWarehouses
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((w) => (
                  <Box component="tr" key={w.id} sx={{ background: 'rgba(255, 255, 255, 0.022)', '&:hover': { background: 'rgba(255, 255, 255, 0.055)' } }}>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, color: 'rgba(255, 255, 255, 0.88)', whiteSpace: 'nowrap' }}>{w.code}</Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, color: 'rgba(255, 255, 255, 0.88)', whiteSpace: 'nowrap' }}>{w.name}</Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, color: 'rgba(255, 255, 255, 0.88)' }}>{w.location || '—'}</Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      <Box component="span" sx={{ display: 'inline-flex', px: 1.2, py: 0.6, borderRadius: 999, background: w.status === 'active' ? 'rgba(34, 211, 238, 0.16)' : 'rgba(148, 163, 184, 0.12)', color: w.status === 'active' ? '#67E8F9' : '#C7D2E0', fontSize: 12, fontWeight: 700 }}>
                        {w.status === 'active' ? 'نشط' : 'معطل'}
                      </Box>
                    </Box>
                    <Box component="td" sx={{ p: 1.25, whiteSpace: 'nowrap' }}>
                      <Box sx={{ display: 'flex', gap: 0.35, alignItems: 'center', justifyContent: 'center' }}>
                        <Tooltip title={w.status === 'active' ? 'تعطيل' : 'تفعيل'}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleStatus(w)}
                            sx={{
                              color: w.status === 'active' ? '#67E8F9' : '#CBD5E1',
                              '&:hover': w.status === 'active' ? {
                                color: '#A5F3FC',
                                background: 'rgba(34, 211, 238, 0.12)',
                              } : {
                              color: '#CBD5E1',
                              '&:hover': {
                                color: '#C7D2E0',
                                background: 'rgba(148, 163, 184, 0.12))',
                              }},
                            }}
                          >
                            {w.status === 'active' ? <FiToggleLeft size={18} /> : <FiToggleRight size={18} />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل"><IconButton size="small" onClick={() => handleEditOpen(w)} sx={{color:"#60A5FA"}}><FiEdit2 size={16} /></IconButton></Tooltip>
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

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>{editingWarehouseId ? 'تعديل مخزن' : 'إضافة مخزن'}</DialogTitle>

        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {errorMessage ? <Alert severity="error" sx={craftErrorAlertSx}>{errorMessage}</Alert> : null}

          <TextField
            label="كود"
            fullWidth
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />

          <TextField
            label="اسم"
            fullWidth
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />

          <TextField
            label="الموقع"
            fullWidth
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <TextField
            label="ملاحظات"
            fullWidth
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveWarehouse}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={craftDialogSlotProps}
      >
        <DialogTitle>تأكيد حذف المخزن</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 2 }}>
          <Box>هل أنت متأكد من حذف المخزن نهائياً؟ لا يمكن التراجع عن هذا الإجراء.</Box>

          {warehouseToDelete ? (
            <Box
              sx={{
                display: 'grid',
                gap: 1,
                p: 2,
                borderRadius: '14px',
                background: 'rgba(255, 255, 255, 0.045)',
                border: '1px solid rgba(255, 255, 255, 0.14)',
              }}
            >
              <Box><strong>كود المخزن:</strong> {warehouseToDelete.code}</Box>
              <Box><strong>اسم المخزن:</strong> {warehouseToDelete.name}</Box>
            </Box>
          ) : null}

          {errorMessage ? <Alert severity="error" sx={craftErrorAlertSx}>{errorMessage}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleConfirmDelete}>حذف نهائي</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
