import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import {
  salesService,
  type SalesInvoiceDetails,
  type SalesInvoiceListItem,
  type SalesReturnRecord,
} from '../services/purchasesService'
import { formatDateDMY, formatDisplayNumber, toInternalDate } from '../utils/displayFormatting'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'

type ReturnLineForm = {
  key: string
  materialId: string
  materialName: string
  unit: string
  unitPrice: number
  availableQuantity: number
  quantity: number
}

function currency(value: number): string {
  return formatDisplayNumber(value, 2)
}

export function SalesReturnsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [returns, setReturns] = useState<Array<{ id: string; returnNumber: string; date: string; customerId: string; customerName: string; warehouseId: string; warehouseName: string; salesInvoiceId: string; salesInvoiceNumber: string; netTotal: number; status: string }>>([])
  const [invoices, setInvoices] = useState<SalesInvoiceListItem[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDetails | null>(null)
  const [returnDate, setReturnDate] = useState('')
  const [returnNotes, setReturnNotes] = useState('')
  const [returnLines, setReturnLines] = useState<ReturnLineForm[]>([])
  const [returnError, setReturnError] = useState('')
  const [saving, setSaving] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedReturn, setSelectedReturn] = useState<SalesReturnRecord | null>(null)
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [invoiceList, returnList] = await Promise.all([
        salesService.listInvoices(),
        salesService.listReturns(),
      ])
      setInvoices(invoiceList)
      setReturns(returnList)
    } catch (error) {
      console.error('LOAD SALES RETURNS FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر تحميل بيانات مرتجعات البيع.'))
    } finally {
      setLoading(false)
    }
  }, [])

  const resetDialog = useCallback(() => {
    setDialogOpen(false)
    setSelectedInvoiceId('')
    setSelectedInvoice(null)
    setReturnDate('')
    setReturnNotes('')
    setReturnLines([])
    setReturnError('')
  }, [])

  const openCreateDialog = useCallback(async (invoiceId?: string) => {
    setReturnError('')
    setDialogOpen(true)
    setReturnDate(new Date().toISOString().slice(0, 10))
    setReturnNotes('')

    if (!invoiceId) {
      setSelectedInvoiceId('')
      setSelectedInvoice(null)
      setReturnLines([])
      return
    }

    try {
      const invoice = await salesService.getInvoiceById(invoiceId)
      const returnList = await salesService.listReturns()
      const alreadyReturned = new Map<string, number>()

      for (const returnSummary of returnList.filter((item) => item.salesInvoiceId === invoiceId)) {
        const details = await salesService.getReturnById(returnSummary.id)
        for (const detailItem of details.items) {
          alreadyReturned.set(detailItem.materialId, (alreadyReturned.get(detailItem.materialId) ?? 0) + detailItem.quantity)
        }
      }

      const lines = invoice.items
        .map((item) => {
          const used = alreadyReturned.get(item.materialId) ?? 0
          const availableQuantity = Math.max(item.quantity - used, 0)
          if (availableQuantity <= 0) return null

          return {
            key: item.id || `${item.materialId}-${item.materialNumber}`,
            materialId: item.materialId,
            materialName: item.materialName,
            unit: item.unit,
            unitPrice: item.unitPrice,
            availableQuantity,
            quantity: availableQuantity,
          }
        })
        .filter((item): item is ReturnLineForm => Boolean(item))

      setSelectedInvoiceId(invoice.id)
      setSelectedInvoice(invoice)
      setReturnLines(lines)
    } catch (error) {
      console.error('OPEN CREATE SALES RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر فتح نموذج مرتجع البيع.'))
    }
  }, [])

  const openReturnDetails = useCallback(async (returnId: string) => {
    try {
      const details = await salesService.getReturnById(returnId)
      setSelectedReturn(details)
      setDetailsOpen(true)
    } catch (error) {
      console.error('OPEN SALES RETURN DETAILS FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر فتح تفاصيل مرتجع البيع.'))
    }
  }, [])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [loadData])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const params = new URLSearchParams(location.search)
      const invoiceId = params.get('invoiceId')
      const returnId = params.get('returnId')

      if (returnId) {
        void openReturnDetails(returnId)
        return
      }

      if (invoiceId) {
        void openCreateDialog(invoiceId)
      }
    }, 0)

    return () => window.clearTimeout(timerId)
  }, [location.search, openCreateDialog, openReturnDetails])

  const handleDelete = useCallback(async (returnId: string) => {
    try {
      await salesService.deleteReturn(returnId)
      await loadData()
    } catch (error) {
      console.error('DELETE SALES RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر حذف مرتجع البيع.'))
    }
  }, [loadData])

  const confirmSaveReturn = useCallback(async () => {
    if (!selectedInvoiceId) {
      setReturnError('يجب اختيار فاتورة بيع أصلية أولاً.')
      return
    }

    const payloadItems = returnLines
      .filter((line) => Number(line.quantity) > 0 && Number(line.quantity) <= line.availableQuantity)
      .map((line) => ({
        materialId: line.materialId,
        quantity: Number(line.quantity),
        unit: line.unit,
        unitPrice: Number(line.unitPrice),
      }))

    if (payloadItems.length === 0) {
      setReturnError('يجب إدخال كمية إرجاع صحيحة للمواد.')
      return
    }

    try {
      setSaving(true)
      setReturnError('')
      await salesService.createReturn({
        date: toInternalDate(returnDate || new Date().toISOString().slice(0, 10)),
        customerId: selectedInvoice?.customerId ?? '',
        warehouseId: selectedInvoice?.warehouseId ?? '',
        salesInvoiceId: selectedInvoiceId,
        notes: returnNotes,
        items: payloadItems,
      })
      await loadData()
      resetDialog()
      navigate('/sales-returns')
    } catch (error) {
      console.error('SAVE SALES RETURN FAILED', error)
      setReturnError(getUserFriendlyErrorMessage(error, 'تعذر حفظ مرتجع البيع.'))
    } finally {
      setSaving(false)
      setSaveConfirmOpen(false)
    }
  }, [loadData, navigate, resetDialog, returnDate, returnLines, returnNotes, selectedInvoice, selectedInvoiceId])

  const selectedInvoiceOption = useMemo(
    () => invoices.find((invoice) => invoice.id === selectedInvoiceId) ?? null,
    [invoices, selectedInvoiceId],
  )

  return (
    <Box>
      <PageHeader
        title="سجل مرتجعات البيع"
        breadcrumb="المبيعات / مرتجعات البيع"
      />

      <SectionCard 
        title="سجل المرتجعات" subtitle="مرتجعات البيع المرتبطة بالفواتير الأصلية فقط"
        actions={
            <Button variant="contained" startIcon={<FiPlus />} onClick={() => void openCreateDialog() }>
            مرتجع جديد
            </Button>
        }
    >
        {loading ? (
          <Box sx={{ display: 'grid', placeItems: 'center', p: 3 }}><CircularProgress /></Box>
        ) : (
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC' }}>
                  <TableCell>رقم المرتجع</TableCell>
                  <TableCell>التاريخ</TableCell>
                  <TableCell>العميل</TableCell>
                  <TableCell>الفاتورة الأصلية</TableCell>
                  <TableCell>المخزن</TableCell>
                  <TableCell>إجمالي المرتجع</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography sx={{ color: 'text.secondary', py: 2 }}>لا توجد مرتجعات بيع مسجلة حالياً.</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  returns.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.returnNumber}</TableCell>
                      <TableCell>{formatDateDMY(item.date)}</TableCell>
                      <TableCell>{item.customerName}</TableCell>
                      <TableCell>{item.salesInvoiceNumber}</TableCell>
                      <TableCell>{item.warehouseName}</TableCell>
                      <TableCell>{currency(item.netTotal)}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          <IconButton size="small" color="secondary" onClick={() => void openReturnDetails(item.id)}>
                            <FiEye />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => setDeleteConfirmId(item.id)}>
                            <FiTrash2 />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionCard>

      <Dialog open={dialogOpen} onClose={() => resetDialog()} maxWidth="lg" fullWidth>
        <DialogTitle>إنشاء مرتجع بيع</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {returnError ? <Alert severity="error">{returnError}</Alert> : null}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
            <Autocomplete
              options={invoices}
              value={selectedInvoiceOption}
              getOptionLabel={(option) => `${option.invoiceNumber} - ${option.customerName}`}
              onChange={(_, value) => {
                if (!value) {
                  setSelectedInvoiceId('')
                  setSelectedInvoice(null)
                  setReturnLines([])
                  return
                }
                void openCreateDialog(value.id)
              }}
              renderInput={(params) => <TextField {...params} label="الفاتورة الأصلية" required />}
            />
            <TextField
              label="التاريخ"
              type="date"
              value={returnDate}
              onChange={(event) => setReturnDate(event.target.value)}
              slotProps={{
                    inputLabel: { shrink: true },
                }}
            />
          </Box>

          {selectedInvoice ? (
            <Box sx={{ display: 'grid', gap: 1.5 }}>
              <Typography><strong>العميل:</strong> {selectedInvoice.customerName}</Typography>
              <Typography><strong>المخزن:</strong> {selectedInvoice.warehouseName}</Typography>
            </Box>
          ) : null}

          {returnLines.length > 0 ? (
            <Table>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC' }}>
                  <TableCell>المادة</TableCell>
                  <TableCell>الوحدة</TableCell>
                  <TableCell>الكمية المتبقية للإرجاع</TableCell>
                  <TableCell>سعر الوحدة</TableCell>
                  <TableCell>كمية المرتجع</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {returnLines.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell>{line.materialName}</TableCell>
                    <TableCell>{line.unit}</TableCell>
                    <TableCell>{line.availableQuantity}</TableCell>
                    <TableCell>{currency(line.unitPrice)}</TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={line.quantity}
                        onChange={(event) => {
                          const rawValue = Number(event.target.value)
                          setReturnLines((prev) => prev.map((item) => item.key === line.key
                            ? {
                                ...item,
                                quantity: Number.isFinite(rawValue) ? Math.min(Math.max(rawValue, 0), item.availableQuantity) : 0,
                              }
                            : item,
                          ))
                        }}
                        slotProps={{
                        htmlInput: {
                            min: 0,
                            max: line.availableQuantity,
                            step: 1,
                        },
                        }}
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Typography sx={{ color: 'text.secondary' }}>يرجى اختيار فاتورة أصلية لعرض المواد المتاحة للإرجاع.</Typography>
          )}

          <TextField
            label="ملاحظات"
            value={returnNotes}
            onChange={(event) => setReturnNotes(event.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setSaveConfirmOpen(true)} disabled={saving || !selectedInvoiceId}>
            {saving ? 'جارٍ الحفظ...' : 'حفظ المرتجع'}
          </Button>
          <Button onClick={() => resetDialog()}>إلغاء</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={saveConfirmOpen} onClose={() => setSaveConfirmOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد حفظ مرتجع البيع</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>هل أنت متأكد من اعتماد مرتجع البيع؟ سيتم تحديث المخزون بناءً على الكميات المرتجعة.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveConfirmOpen(false)}>تراجع</Button>
          <Button variant="contained" onClick={() => void confirmSaveReturn()}>تأكيد وحفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(deleteConfirmId)} onClose={() => setDeleteConfirmId(null)} maxWidth="sm" fullWidth>
        <DialogTitle>حذف مرتجع البيع</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>هل أنت متأكد من حذف مرتجع البيع؟ سيتم عكس أثره على المخزون.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmId(null)}>تراجع</Button>
          <Button variant="contained" color="error" onClick={async () => {
            if (!deleteConfirmId) return
            await handleDelete(deleteConfirmId)
            setDeleteConfirmId(null)
          }}>حذف</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>تفاصيل مرتجع البيع</DialogTitle>
        <DialogContent>
          {!selectedReturn ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <Box>رقم المرتجع: <strong>{selectedReturn.returnNumber}</strong></Box>
                <Box>التاريخ: <strong>{formatDateDMY(selectedReturn.date)}</strong></Box>
                <Box>العميل: <strong>{selectedReturn.customerName}</strong></Box>
                <Box>رقم الفاتورة الأصلية: <strong>{selectedReturn.salesInvoiceNumber}</strong></Box>
                <Box>المخزن: <strong>{selectedReturn.warehouseName}</strong></Box>
              </Box>

              <Table>
                <TableHead>
                  <TableRow sx={{ background: '#F8FAFC' }}>
                    <TableCell>المادة</TableCell>
                    <TableCell>الوحدة</TableCell>
                    <TableCell>الكمية المرتجعة</TableCell>
                    <TableCell>سعر الوحدة</TableCell>
                    <TableCell>الإجمالي</TableCell>
                    <TableCell>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedReturn.items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.materialNumber} - {item.materialName}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell>{item.quantity}</TableCell>
                      <TableCell>{currency(item.unitPrice)}</TableCell>
                      <TableCell>{currency(item.lineTotal)}</TableCell>
                      <TableCell>{item.notes?.trim() ? item.notes : '__'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>ملاحظات المرتجع</TableCell>
                    <TableCell colSpan={5} sx={{ textAlign: 'center' }}>{selectedReturn.notes?.trim() ? selectedReturn.notes : '__'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, flexWrap: 'wrap', mt: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>إجمالي المرتجع: {currency(selectedReturn.netTotal)}</Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
