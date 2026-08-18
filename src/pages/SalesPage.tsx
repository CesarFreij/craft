import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  InputAdornment,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { FiCalendar, FiCheckCircle, FiEdit2, FiEye, FiPlus, FiTrash2 } from 'react-icons/fi'
import { PageHeader } from '../components/ui/PageHeader'
import { SearchField } from '../components/ui/SearchField'
import { SectionCard } from '../components/ui/SectionCard'
import { inventoryService, type WarehouseRecord } from '../services/inventoryService'
import { materialsService, type MaterialRecord } from '../services/materialsService'
import {
  customersService,
  salesService,
  type CustomerRecord,
  type DiscountType,
  type PaymentStatus,
  type SalesInvoiceDetails,
  type SalesInvoiceListItem,
  type SalesInvoiceStatus,
} from '../services/purchasesService'
import { useLocation, useNavigate } from 'react-router-dom'
import { getUserFriendlyErrorMessage } from '../utils/errorMessages'
import { formatDateDMY, formatDisplayNumber, toInternalDate } from '../utils/displayFormatting'

type SaleLine = {
  key: string
  materialId: string
  unit: string
  quantity: number | ''
  unitPrice: number | ''
  notes: string
}

type CustomerForm = {
  id?: string
  code: string
  name: string
  phone: string
  address: string
  notes: string
  status: 'active' | 'inactive'
}

const paymentStatusLabel: Record<PaymentStatus, string> = {
  unpaid: 'غير مدفوع',
  partial: 'مدفوع جزئياً',
  paid: 'مدفوع بالكامل',
}

function currency(value: number): string {
  return formatDisplayNumber(value, 2)
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
            pattern: '[0-9\\/]*'
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

function flattenSellableMaterials(nodes: MaterialRecord[]): MaterialRecord[] {
  const result: MaterialRecord[] = []
  const walk = (items: MaterialRecord[]) => {
    for (const item of items) {
      if (item.type === 'sub' && !item.isNonStock && (item.status ?? 'active') !== 'deleted') {
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

function createEmptyLine(): SaleLine {
  return {
    key: crypto.randomUUID(),
    materialId: '',
    unit: '',
    quantity: '',
    unitPrice: '',
    notes: '',
  }
}

export function SalesPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [customers, setCustomers] = useState<CustomerRecord[]>([])
  const [activeCustomers, setActiveCustomers] = useState<CustomerRecord[]>([])
  const [activeWarehouses, setActiveWarehouses] = useState<WarehouseRecord[]>([])
  const [materialOptions, setMaterialOptions] = useState<MaterialRecord[]>([])
  const [invoices, setInvoices] = useState<SalesInvoiceListItem[]>([])

  const location = useLocation()
  const isCustomersPage = location.pathname === '/customers'
  const [search, setSearch] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [customerFilter, setCustomerFilter] = useState('')
  const [warehouseFilter, setWarehouseFilter] = useState('')

  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const [customerGuideOpen, setCustomerGuideOpen] = useState(false)
  const [customerFormOpen, setCustomerFormOpen] = useState(false)
  const [customerFormError, setCustomerFormError] = useState('')
  const [customerForm, setCustomerForm] = useState<CustomerForm>({
    code: '',
    name: '',
    phone: '',
    address: '',
    notes: '',
    status: 'active',
  })
  const [customerToDelete, setCustomerToDelete] = useState<CustomerRecord | null>(null)
  const [customerDeleteError, setCustomerDeleteError] = useState('')

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceFormError, setInvoiceFormError] = useState('')
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null)
  const [editingInvoiceStatus, setEditingInvoiceStatus] = useState<SalesInvoiceStatus | null>(null)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [invoiceDate, setInvoiceDate] = useState('')
  const [invoiceCustomerId, setInvoiceCustomerId] = useState('')
  const [invoiceWarehouseId, setInvoiceWarehouseId] = useState('')
  const [discountType, setDiscountType] = useState<DiscountType>('none')
  const [discountValue, setDiscountValue] = useState<number | ''>(0)
  const [invoiceNotes, setInvoiceNotes] = useState('')
  const [invoiceLines, setInvoiceLines] = useState<SaleLine[]>([createEmptyLine()])

  const navigate = useNavigate()

  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoiceDetails | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ type: 'deleteDraft' | 'deleteApprovedInvoice'; invoiceId: string; invoiceNumber: string } | null>(null)
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [paymentForm, setPaymentForm] = useState({ date: '', amount: '', notes: '' })
  const [paymentDeleteConfirm, setPaymentDeleteConfirm] = useState<{ paymentId: string; paymentDate: string; paymentAmount: number } | null>(null)

  const subtotal = useMemo(
    () => invoiceLines.reduce((sum, line) => {
      const quantity = typeof line.quantity === 'number' ? line.quantity : 0
      const unitPrice = typeof line.unitPrice === 'number' ? line.unitPrice : 0
      return sum + quantity * unitPrice
    }, 0),
    [invoiceLines]
  )

  const discountAmount = useMemo(() => {
    const value = typeof discountValue === 'number' ? discountValue : 0
    if (discountType === 'percentage') {
      return (subtotal * value) / 100
    }
    if (discountType === 'fixed') {
      return value
    }
    return 0
  }, [discountType, discountValue, subtotal])

  const netTotal = useMemo(() => subtotal - discountAmount, [subtotal, discountAmount])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [allCustomers, activeCustomersList, warehouses, materials] = await Promise.all([
        customersService.list(),
        customersService.listActive(),
        inventoryService.listWarehouses(),
        materialsService.listMaterials(),
      ])
      setCustomers(allCustomers)
      setActiveCustomers(activeCustomersList)
      setActiveWarehouses(warehouses.filter((warehouse) => warehouse.status === 'active'))
      setMaterialOptions(flattenSellableMaterials(materials))

      const list = await salesService.listInvoices({
        reference: search || undefined,
        fromDate: toInternalDate(fromDate) || undefined,
        toDate: toInternalDate(toDate) || undefined,
        customerId: customerFilter || undefined,
        warehouseId: warehouseFilter || undefined,
      })
      setInvoices(list)
    } catch (error) {
      console.error('LOAD SALES DATA FAILED', error)
    } finally {
      setLoading(false)
    }
  }, [search, fromDate, toDate, customerFilter, warehouseFilter])

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void loadData()
    }, 0)
    return () => window.clearTimeout(timerId)
  }, [loadData])

  const reloadInvoices = useCallback(async () => {
    const list = await salesService.listInvoices({
      reference: search || undefined,
      fromDate: toInternalDate(fromDate) || undefined,
      toDate: toInternalDate(toDate) || undefined,
      customerId: customerFilter || undefined,
      warehouseId: warehouseFilter || undefined,
    })
    setInvoices(list)
  }, [search, fromDate, toDate, customerFilter, warehouseFilter])

  const materialById = useMemo(() => new Map(materialOptions.map((item) => [item.id, item])), [materialOptions])

  const validateInvoiceForm = useCallback((): string | null => {
    if (!invoiceDate) return 'تاريخ الفاتورة مطلوب.'
    if (!invoiceCustomerId) return 'اختر العميل.'
    if (!invoiceWarehouseId) return 'اختر المخزن.'
    if (!invoiceLines.length) return 'أضف مادة واحدة على الأقل إلى الفاتورة.'

    const seen = new Set<string>()
    for (const line of invoiceLines) {
      if (!line.materialId || !materialById.has(line.materialId)) {
        return 'المادة غير موجودة في دليل المواد. أضف المادة أولاً من دليل المواد ثم أعد المحاولة.'
      }
      if (seen.has(line.materialId)) {
        return 'المادة مضافة مسبقاً إلى الفاتورة.'
      }
      seen.add(line.materialId)

      const quantity = typeof line.quantity === 'number' ? line.quantity : Number.NaN
      if (Number.isNaN(quantity) || quantity <= 0) {
        return 'يجب أن تكون كمية المادة أكبر من صفر.'
      }

      const unitPrice = typeof line.unitPrice === 'number' ? line.unitPrice : Number.NaN
      if (Number.isNaN(unitPrice) || unitPrice < 0) {
        return 'لا يمكن إدخال قيمة سالبة.'
      }
    }

    const discountNumericValue = typeof discountValue === 'number' ? discountValue : 0
    if (discountNumericValue < 0) {
      return 'لا يمكن إدخال قيمة سالبة.'
    }

    if (discountType === 'percentage' && discountNumericValue > 100) {
      return 'قيمة الحسم بالنسبة المئوية يجب أن تكون بين 0 و100.'
    }

    if (discountAmount > subtotal) {
      return 'قيمة الحسم لا يمكن أن تتجاوز إجمالي الفاتورة.'
    }

    return null
  }, [invoiceDate, invoiceCustomerId, invoiceWarehouseId, invoiceLines, materialById, discountValue, discountType, discountAmount, subtotal])

  const buildInvoicePayload = useCallback(() => {
    return {
      invoiceNumber,
      date: toInternalDate(invoiceDate),
      customerId: invoiceCustomerId,
      warehouseId: invoiceWarehouseId,
      discountType,
      discountValue: typeof discountValue === 'number' ? discountValue : 0,
      notes: invoiceNotes,
      items: invoiceLines.map((line) => ({
        materialId: line.materialId,
        unit: line.unit,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        notes: line.notes,
      })),
    }
  }, [invoiceNumber, invoiceDate, invoiceCustomerId, invoiceWarehouseId, discountType, discountValue, invoiceNotes, invoiceLines])

  const resetInvoiceForm = useCallback(async () => {
    const draftData = await salesService.getNextDraftData()
    setInvoiceNumber(draftData.invoiceNumber)
    setInvoiceDate(draftData.date)
    setInvoiceCustomerId('')
    setInvoiceWarehouseId('')
    setDiscountType('none')
    setDiscountValue(0)
    setInvoiceNotes('')
    setInvoiceLines([createEmptyLine()])
    setEditingInvoiceId(null)
    setEditingInvoiceStatus('draft')
    setInvoiceFormError('')
  }, [])

  const openCreateInvoiceDialog = useCallback(async () => {
    try {
      await resetInvoiceForm()
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('OPEN CREATE SALES INVOICE DIALOG FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر فتح شاشة الفاتورة.'))
    }
  }, [resetInvoiceForm])

  const openEditInvoiceDialog = useCallback(async (invoiceId: string) => {
    try {
      const invoice = await salesService.getInvoiceById(invoiceId)
      if (invoice.status !== 'draft' && invoice.status !== 'completed') {
        return
      }
      setEditingInvoiceId(invoice.id)
      setEditingInvoiceStatus(invoice.status)
      setInvoiceNumber(invoice.invoiceNumber)
      setInvoiceDate(invoice.date)
      setInvoiceCustomerId(invoice.customerId)
      setInvoiceWarehouseId(invoice.warehouseId)
      setDiscountType(invoice.discountType)
      setDiscountValue(invoice.discountValue)
      setInvoiceNotes(invoice.notes ?? '')
      setInvoiceLines(invoice.items.map((item) => ({
        key: item.id,
        materialId: item.materialId,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        notes: item.notes ?? '',
      })))
      setInvoiceFormError('')
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('OPEN EDIT SALES INVOICE DIALOG FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر فتح بيانات الفاتورة.'))
      setInvoiceDialogOpen(true)
    }
  }, [])

  const saveDraft = useCallback(async () => {
    const validationError = validateInvoiceForm()
    if (validationError) {
      setInvoiceFormError(validationError)
      return
    }

    try {
      setSaving(true)
      setInvoiceFormError('')
      const payload = buildInvoicePayload()
      if (editingInvoiceId) {
        if (editingInvoiceStatus === 'completed') {
          await salesService.updateApproved(editingInvoiceId, payload)
        } else {
          await salesService.updateDraft(editingInvoiceId, payload)
        }
      } else {
        await salesService.createDraft(payload)
      }
      setInvoiceDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('SAVE SALES DRAFT FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ مسودة الفاتورة. يرجى المحاولة مرة أخرى.'))
    } finally {
      setSaving(false)
    }
  }, [validateInvoiceForm, buildInvoicePayload, editingInvoiceId, editingInvoiceStatus, loadData])

  const completeDraft = useCallback(async () => {
    const validationError = validateInvoiceForm()
    if (validationError) {
      setInvoiceFormError(validationError)
      return
    }

    try {
      setSaving(true)
      setInvoiceFormError('')
      let targetInvoiceId = editingInvoiceId
      if (!targetInvoiceId) {
        const created = await salesService.createDraft(buildInvoicePayload())
        targetInvoiceId = created.id
        setEditingInvoiceId(created.id)
      } else {
        await salesService.updateDraft(targetInvoiceId, buildInvoicePayload())
      }
      await salesService.complete(targetInvoiceId)
      setInvoiceDialogOpen(false)
      await loadData()
    } catch (error) {
      console.error('APPROVE SALES FAILED', error)
      setInvoiceFormError(getUserFriendlyErrorMessage(error, 'تعذر اعتماد الفاتورة. يرجى مراجعة البيانات والمحاولة مرة أخرى.'))
    } finally {
      setSaving(false)
    }
  }, [validateInvoiceForm, editingInvoiceId, buildInvoicePayload, loadData])

  const deleteDraft = useCallback(async (invoiceId: string) => {
    try {
      await salesService.deleteDraft(invoiceId)
      await reloadInvoices()
    } catch (error) {
      console.error('DELETE SALES DRAFT FAILED', error)
    }
  }, [reloadInvoices])

  const deleteApprovedInvoice = useCallback(async (invoiceId: string) => {
    try {
      await salesService.deleteApproved(invoiceId)
      await reloadInvoices()
      if (detailsOpen && selectedInvoice?.id === invoiceId) {
        const refreshed = await salesService.getInvoiceById(invoiceId)
        setSelectedInvoice(refreshed)
      }
    } catch (error) {
      console.error('DELETE APPROVED SALES INVOICE FAILED', error)
    }
  }, [reloadInvoices, detailsOpen, selectedInvoice])

  const openPaymentDialog = useCallback(() => {
    if (!selectedInvoice) {
      return
    }
    setPaymentError('')
    setPaymentForm({
      date: toInternalDate(selectedInvoice.date || new Date().toISOString().slice(0, 10)),
      amount: '',
      notes: '',
    })
    setPaymentDialogOpen(true)
  }, [selectedInvoice])

  const submitPayment = useCallback(async () => {
    if (!selectedInvoice) return

    const amount = Number(paymentForm.amount)
    if (!paymentForm.date) {
      setPaymentError('تاريخ الدفعة مطلوب.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setPaymentError('قيمة الدفعة يجب أن تكون أكبر من صفر.')
      return
    }
    if (amount > selectedInvoice.remainingAmount + 0.000001) {
      setPaymentError('لا يمكن تسجيل دفعة تتجاوز المبلغ المتبقي على الفاتورة.')
      return
    }

    try {
      setPaymentError('')
      await salesService.addPayment(selectedInvoice.id, {
        date: toInternalDate(paymentForm.date),
        amount,
        notes: paymentForm.notes,
      })
      setPaymentDialogOpen(false)
      const refreshed = await salesService.getInvoiceById(selectedInvoice.id)
      setSelectedInvoice(refreshed)
      await reloadInvoices()
    } catch (error) {
      console.error('ADD SALES PAYMENT FAILED', error)
      setPaymentError(getUserFriendlyErrorMessage(error, 'تعذر تسجيل الدفعة.'))
    }
  }, [paymentForm, reloadInvoices, selectedInvoice])

  const deletePayment = useCallback(async (paymentId: string) => {
    try {
      await salesService.deletePayment(paymentId)
      if (selectedInvoice) {
        const refreshed = await salesService.getInvoiceById(selectedInvoice.id)
        setSelectedInvoice(refreshed)
      }
      await reloadInvoices()
      setPaymentDeleteConfirm(null)
    } catch (error) {
      console.error('DELETE SALES PAYMENT FAILED', error)
    }
  }, [reloadInvoices, selectedInvoice])

  const openDetails = useCallback(async (invoiceId: string) => {
    try {
      const details = await salesService.getInvoiceById(invoiceId)
      setSelectedInvoice(details)
      setDetailsOpen(true)
    } catch (error) {
      console.error('OPEN SALES DETAILS FAILED', error)
    }
  }, [])

  const openReturnDetails = useCallback(async (returnId: string) => {
    try {
      setDetailsOpen(false)
      navigate(`/sales-returns?returnId=${returnId}`)
    } catch (error) {
      console.error('OPEN SALES RETURN DETAILS FAILED', error)
    }
  }, [navigate])

  const filteredRows = useMemo(() => {
    return invoices.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
  }, [invoices, page, rowsPerPage])

  const paymentRows = useMemo(() => {
    if (!selectedInvoice?.payments?.length) return []
    let runningTotal = 0
    return [...selectedInvoice.payments]
      .sort((first, second) => new Date(first.date).getTime() - new Date(second.date).getTime())
      .map((payment) => {
        runningTotal += Number(payment.amount ?? 0)
        return {
          ...payment,
          remainingAfterThisPayment: Math.max(Number(selectedInvoice.netAfterReturns ?? selectedInvoice.netTotal ?? 0) - runningTotal, 0),
          netTotal: Number(selectedInvoice.netAfterReturns ?? selectedInvoice.netTotal ?? 0),
        }
      })
  }, [selectedInvoice])

  const selectedCustomer = activeCustomers.find((item) => item.id === invoiceCustomerId) ?? null
  const selectedWarehouse = activeWarehouses.find((item) => item.id === invoiceWarehouseId) ?? null

  const saveCustomer = useCallback(async () => {
    const code = customerForm.code.trim()
    const name = customerForm.name.trim()
    if (!code || !name) {
      setCustomerFormError('رقم العميل واسم العميل مطلوبان.')
      return
    }

    try {
      setCustomerFormError('')
      if (customerForm.id) {
        await customersService.update(customerForm.id, {
          ...customerForm,
          code,
          name,
          phone: customerForm.phone,
          address: customerForm.address,
          notes: customerForm.notes,
          status: customerForm.status,
        })
      } else {
        await customersService.create({
          code,
          name,
          phone: customerForm.phone,
          address: customerForm.address,
          notes: customerForm.notes,
          status: customerForm.status,
        })
      }
      setCustomerFormOpen(false)
      setCustomerForm({ code: '', name: '', phone: '', address: '', notes: '', status: 'active' })
      await loadData()
    } catch (error) {
      console.error('SAVE CUSTOMER FAILED', error)
      setCustomerFormError(getUserFriendlyErrorMessage(error, 'تعذر حفظ بيانات العميل.'))
    }
  }, [customerForm, loadData])

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader
        title={isCustomersPage ? 'العملاء' : 'المبيعات والعملاء'}
        breadcrumb={isCustomersPage ? 'إدارة العملاء' : 'إدارة العملاء وفواتير المبيعات'}
      />

      {isCustomersPage ? (
        <SectionCard title="قائمة العملاء" actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => setCustomerFormOpen(true)}>إضافة عميل</Button>
        }>
          <Box sx={{ overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                  <TableCell>رقم العميل</TableCell>
                  <TableCell>اسم العميل</TableCell>
                  <TableCell>الهاتف</TableCell>
                  <TableCell>العنوان</TableCell>
                  <TableCell>الحالة</TableCell>
                  <TableCell>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {customers.map((customer) => (
                  <TableRow key={customer.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell>{customer.code}</TableCell>
                    <TableCell>{customer.name}</TableCell>
                    <TableCell>{customer.phone || '__'}</TableCell>
                    <TableCell>{customer.address || '__'}</TableCell>
                    <TableCell>{customer.status === 'active' ? 'فعال' : 'غير فعال'}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <IconButton size="small" onClick={() => {
                          setCustomerForm({
                            id: customer.id,
                            code: customer.code,
                            name: customer.name,
                            phone: customer.phone ?? '',
                            address: customer.address ?? '',
                            notes: customer.notes ?? '',
                            status: customer.status ?? 'active',
                          })
                          setCustomerFormError('')
                          setCustomerFormOpen(true)
                        }} color="primary">
                          <FiEdit2 />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => {
                          setCustomerDeleteError('')
                          setCustomerToDelete(customer)
                        }}>
                          <FiTrash2 />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        </SectionCard>
        
      ) : (
        <SectionCard title="سجل فواتير المبيعات" actions={
          <Button variant="contained" startIcon={<FiPlus />} onClick={() => void openCreateInvoiceDialog()}>فاتورة بيع جديدة</Button>
        }>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', mb: 2 }}>
          <Tooltip title="بحث برقم الفاتورة أو اسم العميل" arrow>
            <Box>
              <SearchField
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(0)
                }}
              />
            </Box>
          </Tooltip>
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
          <TextField select label="العميل" value={customerFilter} onChange={(event) => { setCustomerFilter(event.target.value); setPage(0) }}>
            <MenuItem value="">الكل</MenuItem>
            {customers.map((customer) => (
              <MenuItem key={customer.id} value={customer.id}>{customer.code} - {customer.name}</MenuItem>
            ))}
          </TextField>
          <TextField select label="المخزن" value={warehouseFilter} onChange={(event) => { setWarehouseFilter(event.target.value); setPage(0) }}>
            <MenuItem value="">الكل</MenuItem>
            {activeWarehouses.map((warehouse) => (
              <MenuItem key={warehouse.id} value={warehouse.id}>{warehouse.name}</MenuItem>
            ))}
          </TextField>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setSearch('')
                setFromDate('')
                setToDate('')
                setCustomerFilter('')
                setWarehouseFilter('')
                setPage(0)
              }}
            >
              مسح الفلاتر
            </Button>
          </Box>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          {loading ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Table sx={{ minWidth: 1200 }}>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>التاريخ</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>رقم الفاتورة</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>العميل</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المخزن</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المدفوع</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المتبقي</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>حالة الدفع</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجراءات</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id} sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(row.date)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.invoiceNumber}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.customerName}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{row.warehouseName}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.subtotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.discountAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.paidAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(row.remainingAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{paymentStatusLabel[row.paymentStatus]}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Tooltip title="عرض">
                          <IconButton size="small" color="secondary" onClick={() => void openDetails(row.id)}>
                            <FiEye />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="تعديل الفاتورة">
                          <IconButton size="small" color="primary" onClick={() => void openEditInvoiceDialog(row.id)}>
                            <FiEdit2 />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="حذف الفاتورة">
                          <IconButton size="small" color="error" onClick={() => setConfirmAction({ type: 'deleteApprovedInvoice', invoiceId: row.id, invoiceNumber: row.invoiceNumber })}>
                            <FiTrash2 />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <TablePagination
            component="div"
            count={invoices.length}
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
      )}

      <Dialog open={Boolean(confirmAction)} onClose={() => setConfirmAction(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{confirmAction?.type === 'deleteDraft' ? 'تأكيد حذف المسودة' : 'تأكيد حذف الفاتورة'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>
            {confirmAction?.type === 'deleteDraft'
              ? `هل أنت متأكد من حذف فاتورة البيع رقم ${confirmAction.invoiceNumber}؟ لا يمكن التراجع عن الحذف.`
              : `هل أنت متأكد من حذف فاتورة البيع رقم ${confirmAction?.invoiceNumber ?? ''} بشكل نهائي؟ سيتم إزالة أثرها من المخزون والدفعات.`}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAction(null)}>إلغاء</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!confirmAction) return
              if (confirmAction.type === 'deleteDraft') {
                await deleteDraft(confirmAction.invoiceId)
              } else {
                await deleteApprovedInvoice(confirmAction.invoiceId)
              }
              setConfirmAction(null)
            }}
          >
            {confirmAction?.type === 'deleteDraft' ? 'حذف' : 'حذف نهائي'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={customerGuideOpen} onClose={() => setCustomerGuideOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>دليل العملاء</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Typography sx={{ fontWeight: 700 }}>قائمة العملاء</Typography>
            <Button
              variant="contained"
              startIcon={<FiPlus />}
              onClick={() => {
                setCustomerForm({ code: '', name: '', phone: '', address: '', notes: '', status: 'active' })
                setCustomerFormError('')
                setCustomerFormOpen(true)
              }}
            >
              إضافة عميل
            </Button>
          </Box>
          <Table>
            <TableHead>
              <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                <TableCell sx={{ textAlign: 'center' }}>رقم العميل</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>اسم العميل</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>الهاتف</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>العنوان</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>الرصيد المستحق</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>الحالة</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id} sx={{ textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center' }}>{customer.code}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{customer.name}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{customer.phone || '__'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{customer.address || '__'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(0)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{customer.status === 'active' ? 'فعال' : 'غير فعال'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="تعديل">
                        <IconButton size="small" color="primary" onClick={() => {
                          setCustomerForm({
                            id: customer.id,
                            code: customer.code,
                            name: customer.name,
                            phone: customer.phone ?? '',
                            address: customer.address ?? '',
                            notes: customer.notes ?? '',
                            status: customer.status ?? 'active',
                          })
                          setCustomerFormError('')
                          setCustomerFormOpen(true)
                        }}>
                          <FiEdit2 />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => {
                            setCustomerDeleteError('')
                            setCustomerToDelete(customer)
                          }}
                        >
                          <FiTrash2 />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerGuideOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(customerToDelete)} onClose={() => { setCustomerToDelete(null); setCustomerDeleteError('') }} maxWidth="sm" fullWidth>
        <DialogTitle>تأكيد حذف العميل</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {customerDeleteError ? <Alert severity="error">{customerDeleteError}</Alert> : null}
          <Typography>
            {customerToDelete ? `هل أنت متأكد من حذف العميل «${customerToDelete.name}» رقم ${customerToDelete.code}؟ لا يمكن التراجع عن الحذف.` : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCustomerToDelete(null); setCustomerDeleteError('') }}>تراجع</Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (!customerToDelete) return

              try {
                setCustomerDeleteError('')
                await customersService.delete(customerToDelete.id)
                setCustomerToDelete(null)
                await loadData()
              } catch (error) {
                console.error('DELETE CUSTOMER FAILED', error)
                setCustomerDeleteError(getUserFriendlyErrorMessage(error, 'تعذر حذف العميل. يرجى المحاولة مرة أخرى.'))
              }
            }}
          >
            حذف
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={customerFormOpen} onClose={() => setCustomerFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{customerForm.id ? 'تعديل عميل' : 'إضافة عميل'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {customerFormError ? <Alert severity="error">{customerFormError}</Alert> : null}
          <TextField label="رقم العميل" value={customerForm.code} onChange={(event) => setCustomerForm((prev) => ({ ...prev, code: event.target.value }))} required />
          <TextField label="اسم العميل" value={customerForm.name} onChange={(event) => setCustomerForm((prev) => ({ ...prev, name: event.target.value }))} required />
          <TextField label="الهاتف" value={customerForm.phone} onChange={(event) => setCustomerForm((prev) => ({ ...prev, phone: event.target.value }))} />
          <TextField label="العنوان" value={customerForm.address} onChange={(event) => setCustomerForm((prev) => ({ ...prev, address: event.target.value }))} />
          <TextField label="ملاحظات" value={customerForm.notes} onChange={(event) => setCustomerForm((prev) => ({ ...prev, notes: event.target.value }))} multiline minRows={2} />
          <TextField select label="الحالة" value={customerForm.status} onChange={(event) => setCustomerForm((prev) => ({ ...prev, status: event.target.value as 'active' | 'inactive' }))}>
            <MenuItem value="active">فعال</MenuItem>
            <MenuItem value="inactive">غير فعال</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerFormOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={() => void saveCustomer()}>حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={invoiceDialogOpen} onClose={() => {
        setInvoiceDialogOpen(false)
        setEditingInvoiceStatus(null)
        setEditingInvoiceId(null)
      }} fullWidth maxWidth="lg">
        <DialogTitle>{editingInvoiceId ? 'تعديل مسودة فاتورة بيع' : 'فاتورة بيع جديدة'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {invoiceFormError ? <Alert severity="error">{invoiceFormError}</Alert> : null}

          <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            <TextField label="رقم الفاتورة" value={invoiceNumber} slotProps={{ input: { readOnly: true } }} />
            <TextField
              label="التاريخ"
              type="text"
              value={invoiceDate ? formatDateDMY(invoiceDate) : ''}
              onChange={(event) => setInvoiceDate(event.target.value)}
              placeholder="DD/MM/YYYY"
              slotProps={{ 
                htmlInput: { 
                  inputMode: 'numeric', 
                  pattern: '[0-9\\/]*'
                },
                inputLabel: { shrink: true }
              }}
              required
            />
            <Autocomplete
              options={activeCustomers}
              getOptionLabel={(option) => `${option.code} - ${option.name}`}
              value={selectedCustomer}
              onChange={(_, value) => setInvoiceCustomerId(value?.id ?? '')}
              renderInput={(params) => <TextField {...params} label="العميل" required />}
            />
            <Autocomplete
              options={activeWarehouses}
              getOptionLabel={(option) => option.name}
              value={selectedWarehouse}
              onChange={(_, value) => setInvoiceWarehouseId(value?.id ?? '')}
              renderInput={(params) => <TextField {...params} label="المخزن" required />}
            />
          </Box>

          <TextField label="ملاحظات" value={invoiceNotes} onChange={(event) => setInvoiceNotes(event.target.value)} multiline minRows={2} />

          <SectionCard title="مواد الفاتورة">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {invoiceLines.map((line) => {
                const material = materialById.get(line.materialId) ?? null
                const lineTotal = (typeof line.quantity === 'number' ? line.quantity : 0) * (typeof line.unitPrice === 'number' ? line.unitPrice : 0)

                return (
                  <Box key={line.key} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.08)' }}>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', alignItems: 'center' }}>
                      <Autocomplete
                        options={materialOptions}
                        value={material}
                        getOptionLabel={(option) => option?.name ?? ''}
                        onChange={(_, value) => {
                          if (!value) {
                            setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, materialId: '', unit: '', unitPrice: '', quantity: item.quantity || '' } : item))
                            return
                          }

                          if (invoiceLines.some((current) => current.key !== line.key && current.materialId === value.id)) {
                            setInvoiceFormError('المادة مضافة مسبقاً إلى الفاتورة.')
                            return
                          }

                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? {
                            ...item,
                            materialId: value.id,
                            unit: value.unit ?? '',
                            unitPrice: Number(value.price1 ?? 0),
                            quantity: typeof item.quantity === 'number' && item.quantity > 0 ? item.quantity : 1,
                          } : item))
                          setInvoiceFormError('')
                        }}
                        renderInput={(params) => <TextField {...params} label="المادة" required />}
                      />
                      <TextField label="الوحدة" value={line.unit} slotProps={{ input: { readOnly: true } }} />
                      <TextField
                        label="الكمية"
                        type="number"
                        value={line.quantity}
                        onChange={(event) => {
                          const raw = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, quantity: raw === '' ? '' : Number(raw) } : item))
                        }}
                        slotProps={{ htmlInput: { min: 0.000001 } }}
                        required
                      />
                      <TextField
                        label="سعر البيع"
                        type="number"
                        value={line.unitPrice}
                        onChange={(event) => {
                          const raw = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, unitPrice: raw === '' ? '' : Number(raw) } : item))
                        }}
                        slotProps={{ htmlInput: { min: 0 } }}
                        required
                      />
                      <TextField label="الإجمالي" value={currency(lineTotal)} slotProps={{ input: { readOnly: true } }} />
                    </Box>
                    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: '1fr auto', mt: 2 }}>
                      <TextField
                        label="ملاحظات"
                        value={line.notes}
                        onChange={(event) => {
                          const value = event.target.value
                          setInvoiceLines((prev) => prev.map((item) => item.key === line.key ? { ...item, notes: value } : item))
                        }}
                        fullWidth
                      />
                      <Button color="error" onClick={() => setInvoiceLines((prev) => prev.filter((item) => item.key !== line.key))} disabled={invoiceLines.length === 1}>
                        حذف السطر
                      </Button>
                    </Box>
                  </Box>
                )
              })}

              <Button variant="outlined" startIcon={<FiPlus />} onClick={() => setInvoiceLines((prev) => [...prev, createEmptyLine()])}>
                إضافة مادة
              </Button>
            </Box>
          </SectionCard>

          <SectionCard title="الحسم والإجماليات">
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
              <TextField select label="نوع الحسم" value={discountType} onChange={(event) => setDiscountType(event.target.value as DiscountType)}>
                <MenuItem value="none">بدون حسم</MenuItem>
                <MenuItem value="percentage">نسبة مئوية</MenuItem>
                <MenuItem value="fixed">مبلغ ثابت</MenuItem>
              </TextField>
              <TextField
                label="قيمة الحسم"
                type="number"
                value={discountValue}
                onChange={(event) => {
                  const raw = event.target.value
                  setDiscountValue(raw === '' ? '' : Number(raw))
                }}
                slotProps={{ htmlInput: { min: 0, max: discountType === 'percentage' ? 100 : undefined } }}
              />
            </Box>
            <Table sx={{ mt: 2, width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}>
              <TableHead>
                <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي قبل الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                  <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي النهائي</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow sx={{ textAlignLast: 'center' }}>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(subtotal)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(discountAmount)}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>{currency(netTotal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </SectionCard>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setInvoiceDialogOpen(false)}>إلغاء</Button>
          {editingInvoiceId && editingInvoiceStatus === 'completed' ? (
            <Button variant="contained" onClick={() => void saveDraft()} disabled={saving}>{saving ? <CircularProgress size={18} /> : 'حفظ التعديلات'}</Button>
          ) : (
            <Button variant="contained" startIcon={<FiCheckCircle />} onClick={() => void completeDraft()} disabled={saving}>
              {saving ? <CircularProgress size={18} /> : 'اعتماد الفاتورة'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={detailsOpen} onClose={() => setDetailsOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle>تفاصيل فاتورة البيع</DialogTitle>
        <DialogContent>
          {!selectedInvoice ? (
            <Box sx={{ display: 'grid', placeItems: 'center', p: 4 }}><CircularProgress /></Box>
          ) : (
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                <Box>رقم الفاتورة: <strong>{selectedInvoice.invoiceNumber}</strong></Box>
                <Box>التاريخ: <strong>{formatDateDMY(selectedInvoice.date)}</strong></Box>
                <Box>العميل: <strong>{selectedInvoice.customerName}</strong></Box>
                <Box>المخزن: <strong>{selectedInvoice.warehouseName}</strong></Box>
                <Box>حالة الدفع: <strong>{paymentStatusLabel[selectedInvoice.paymentStatus]}</strong></Box>
              </Box>

              <Table>
                <TableHead>
                  <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>المادة</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الوحدة</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الكمية</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>سعر البيع</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>الإجمالي</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>ملاحظات</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {selectedInvoice.items.map((item) => (
                    <TableRow key={item.id} sx={{ textAlignLast: 'center' }}>
                      <TableCell sx={{ textAlign: 'center' }}>{item.materialNumber} - {item.materialName}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{item.unit}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{item.quantity}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{currency(item.unitPrice)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{currency(item.lineTotal)}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>{item.notes?.trim() ? item.notes : '__'}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>ملاحظات الفاتورة</TableCell>
                    <TableCell colSpan={5} sx={{ textAlign: 'center' }}>{selectedInvoice.notes?.trim() ? selectedInvoice.notes : '__'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              <Table sx={{ width: '100%', minWidth: 620, '& td, & th': { textAlign: 'center' } }}>
                <TableHead>
                  <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الإجمالي قبل الحسم</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الحسم</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي النهائي</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>مرتجعات البيع</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>الصافي بعد المرتجعات</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المدفوع</TableCell>
                    <TableCell sx={{ textAlign: 'center', fontWeight: 700 }}>المتبقي</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow sx={{ textAlignLast: 'center' }}>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.subtotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.discountAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.salesReturnTotal ?? 0)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.netAfterReturns ?? selectedInvoice.netTotal)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.paidAmount)}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>{currency(selectedInvoice.remainingAmount)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>

              {selectedInvoice.customerCredit > 0 ? (
                <Box sx={{ fontWeight: 700, color: 'success.main' }}>
                  رصيد لصالح العميل: {currency(selectedInvoice.customerCredit)}
                </Box>
              ) : null}

              {selectedInvoice.returns && selectedInvoice.returns.length > 0 ? (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Typography sx={{ fontWeight: 700 }}>مرتجعات البيع</Typography>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: '#F8FAFC' }}>
                        <TableCell>رقم المرتجع</TableCell>
                        <TableCell>التاريخ</TableCell>
                        <TableCell>إجمالي المرتجع</TableCell>
                        <TableCell>عرض التفاصيل</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {selectedInvoice.returns.map((returnItem) => (
                        <TableRow key={returnItem.id}>
                          <TableCell>{returnItem.returnNumber}</TableCell>
                          <TableCell>{formatDateDMY(returnItem.date)}</TableCell>
                          <TableCell>{currency(returnItem.netTotal)}</TableCell>
                          <TableCell>
                            <Button size="small" onClick={() => openReturnDetails(returnItem.id)}>
                              تفاصيل
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              ) : null}

              <Box sx={{ display: 'flex', gap: 1 }}>
              {selectedInvoice.status === 'completed' ? (
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, marginLeft: 'auto' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setDetailsOpen(false)
                      navigate(`/sales-returns?invoiceId=${selectedInvoice.id}`)
                    }}
                  >
                    إنشاء مرتجع بيع
                  </Button>
                </Box>
              ) : null}
              <Tooltip
                title={
                  selectedInvoice.paymentStatus === 'paid' || selectedInvoice.remainingAmount <= 0
                    ? 'الفاتورة مدفوعة بالكامل'
                    : ''
                }
                arrow
              >
                <Box
                  component="span"
                  sx={{
                    display: 'inline-flex',
                    cursor:
                      selectedInvoice.paymentStatus === 'paid' || selectedInvoice.remainingAmount <= 0
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  <Button
                    variant="contained"
                    startIcon={<FiCheckCircle />}
                    onClick={openPaymentDialog}
                    disabled={
                      selectedInvoice.paymentStatus === 'paid' ||
                      selectedInvoice.remainingAmount <= 0
                    }
                    sx={{
                      background: '#66bb6a',
                      '&:hover': {
                        background: '#66bb6a',
                      },
                      '&.Mui-disabled': {
                        backgroundColor: 'success.main',
                        color: 'common.white',
                        opacity: 0.8,
                        boxShadow: 'none',
                      },
                    }}
                  >
                    تسجيل دفعة
                  </Button>
                </Box>
              </Tooltip>
              </Box>
              <SectionCard title="سجل الدفعات">
                {selectedInvoice.payments.length === 0 ? (
                  <Typography>لا توجد دفعات مسجلة.</Typography>
                ) : (
                  <Table>
                    <TableHead>
                      <TableRow sx={{ background: '#F8FAFC', textAlignLast: 'center' }}>
                        <TableCell sx={{ textAlign: 'center' }}>التاريخ</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>المبلغ</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>ملاحظات</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>الإجراءات</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentRows.map((payment) => (
                        <TableRow key={payment.id} sx={{ textAlignLast: 'center' }}>
                          <TableCell sx={{ textAlign: 'center' }}>{formatDateDMY(payment.date)}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{currency(payment.amount)}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>{payment.notes || '__'}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <IconButton size="small" color="error" onClick={() => setPaymentDeleteConfirm({ paymentId: payment.id, paymentDate: payment.date, paymentAmount: Number(payment.amount ?? 0) })}>
                              <FiTrash2 />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </SectionCard>
            </Box>
            )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>إغلاق</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={paymentDialogOpen} onClose={() => setPaymentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>تسجيل دفعة</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: '12px !important' }}>
          {paymentError ? <Alert severity="error">{paymentError}</Alert> : null}
          <TextField
            label="التاريخ"
            type="text"
            value={paymentForm.date ? formatDateDMY(paymentForm.date) : ''}
            onChange={(event) => setPaymentForm((prev) => ({ ...prev, date: event.target.value }))}
            placeholder="DD/MM/YYYY"
            slotProps={{ 
              htmlInput: { 
                inputMode: 'numeric', 
                pattern: '[0-9\\/]*'
              },
              inputLabel: { shrink: true }
            }}
            required
          />
          <TextField label="المبلغ" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm((prev) => ({ ...prev, amount: event.target.value }))} required />
          <TextField label="ملاحظات" value={paymentForm.notes} onChange={(event) => setPaymentForm((prev) => ({ ...prev, notes: event.target.value }))} multiline minRows={2} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" startIcon={<FiCheckCircle />} onClick={() => void submitPayment()}>حفظ الدفعة</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(paymentDeleteConfirm)} onClose={() => setPaymentDeleteConfirm(null)} maxWidth="sm" fullWidth>
        <DialogTitle>حذف دفعة</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography>هل أنت متأكد من حذف الدفعة بتاريخ {paymentDeleteConfirm ? formatDateDMY(paymentDeleteConfirm.paymentDate) : ''} بمبلغ {paymentDeleteConfirm ? currency(paymentDeleteConfirm.paymentAmount) : ''}؟</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPaymentDeleteConfirm(null)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={async () => {
            if (paymentDeleteConfirm) {
              await deletePayment(paymentDeleteConfirm.paymentId)
            }
            setPaymentDeleteConfirm(null)
          }}>حذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
