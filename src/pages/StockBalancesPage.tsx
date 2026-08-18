import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, TextField, MenuItem, Typography } from '@mui/material'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { SearchField } from '../components/ui/SearchField'
import { inventoryService } from '../services/inventoryService'
import type { StockBalanceRecord, WarehouseRecord } from '../services/inventoryService'
import { formatDisplayNumber } from '../utils/displayFormatting'

export function StockBalancesPage() {
  const [balances, setBalances] = useState<StockBalanceRecord[]>([])
  const [warehouseFilter, setWarehouseFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])

  const load = useCallback(async () => {
    const data = await inventoryService.getBalancesByWarehouse(warehouseFilter)
    setBalances(data)
    const w = await inventoryService.listWarehouses()
    setWarehouses(w)
  }, [warehouseFilter])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load()
  }, [load])

  const filtered = balances.filter(b => b.name.toLowerCase().includes(searchTerm.toLowerCase()) || b.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  const totalStockValue = useMemo(() => filtered.reduce((sum, b) => sum + (b.stockValue ?? 0), 0), [filtered])

  return (
    <Box sx={{ p: 2 }}>
      <PageHeader title="أرصدة المخازن" breadcrumb="عرض رصيد كل مادة في المخازن الحالية" />

      <SectionCard title="تفاصيل الرصيد">
        <Box sx={{ display: 'flex', gap: 2, marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', width: '100%' }}>
          <TextField select label="المخزن" value={warehouseFilter ?? ''} onChange={(e) => setWarehouseFilter(e.target.value || null)} sx={{ minWidth: 220, flex: '1 1 240px' }}>
            <MenuItem value="">كل المخازن</MenuItem>
            {warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
          <SearchField placeholder="بحث بالكود أو الاسم" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} sx={{ minWidth: 240, flex: '1 1 320px' }} />
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Typography sx={{ fontWeight: 700, color: '#0F172A' }}>
            إجمالي قيمة المخزون: {formatDisplayNumber(totalStockValue, 2)}
          </Typography>
        </Box>
        <Box sx={{ overflowX: 'auto' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <Box component="thead" sx={{ background: '#F8FAFC' }}>
              <Box component="tr">
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>المخزن</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>رقم المادة</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>اسم المادة</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الوحدة</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>الرصيد</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>متوسط التكلفة</Box>
                <Box component="th" sx={{ p: 2, fontWeight: 700, color: '#0F172A' }}>قيمة الرصيد</Box>
              </Box>
            </Box>
            <Box component="tbody">
              {filtered.map((r) => (
                <Box component="tr" key={`${r.warehouseId}-${r.id}`} sx={{ borderTop: '1px solid rgba(15, 23, 42, 0.04)' }}>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#0F172A' }}>{r.warehouseName ?? '—'}</Box>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#0F172A' }}>{r.materialNumber}</Box>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#0F172A' }}>{r.name}</Box>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#475569' }}>{r.unit ?? ''}</Box>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, fontWeight: 700, color: '#0369A1' }}>{r.quantity}</Box>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, color: '#0F172A' }}>{formatDisplayNumber(r.averageCost, 2)}</Box>
                  <Box component="td" sx={{ textAlign: 'center', p: 2, fontWeight: 700, color: '#0F172A' }}>{formatDisplayNumber(r.stockValue, 2)}</Box>
                </Box>
              ))}
            </Box>
          </Box>
        </Box>
      </SectionCard>
    </Box>
  )
}
