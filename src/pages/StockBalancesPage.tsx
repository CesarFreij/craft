import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, TextField, MenuItem, Typography, TablePagination } from '@mui/material'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import { SearchField } from '../components/ui/SearchField'
import { inventoryService } from '../services/inventoryService'
import type { StockBalanceRecord, WarehouseRecord } from '../services/inventoryService'
import { formatCurrencyValue, formatNumberBySettings } from '../utils/displayFormatting'

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
  '& .MuiMenuItem-root': {
    color: 'rgba(255, 255, 255, 0.88)',
    borderRadius: '8px',
    mx: 0.5,
    my: 0.25,
    '&:hover': {
      background: 'rgba(56, 189, 248, 0.10)',
    },
    '&.Mui-selected': {
      color: '#67E8F9',
      background: 'rgba(34, 211, 238, 0.13)',
    },
    '&.Mui-selected:hover': {
      background: 'rgba(34, 211, 238, 0.18)',
    },
  },
}

const craftPageGlassSx = {
  '& .MuiPaper-root': {
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

  '& table': {
    width: '100%',
    borderCollapse: 'collapse',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    background: 'transparent',
  },

  '& table thead': {
    background: 'rgba(255, 255, 255, 0.055)',
  },

  '& table tbody tr': {
    background: 'rgba(255, 255, 255, 0.022)',
  },

  '& table tbody tr:hover': {
    background: 'rgba(255, 255, 255, 0.055)',
  },

  '& table th': {
    color: 'rgba(255, 255, 255, 0.94)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    fontWeight: 700,
  },

  '& table td': {
    color: 'rgba(255, 255, 255, 0.88)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
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

export function StockBalancesPage() {
  const [balances, setBalances] = useState<StockBalanceRecord[]>([])
  const [warehouseFilter, setWarehouseFilter] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [warehouses, setWarehouses] = useState<WarehouseRecord[]>([])
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

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

  const filtered = balances.filter(
    (b) =>
      b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.materialNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const totalStockValue = useMemo(
    () => filtered.reduce((sum, b) => sum + (b.stockValue ?? 0), 0),
    [filtered],
  )

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader title="أرصدة المخازن" breadcrumb="عرض رصيد كل مادة في المخازن الحالية" />

      <SectionCard title="تفاصيل الرصيد">
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <TextField
            select
            label="المخزن"
            value={warehouseFilter ?? ''}
            onChange={(e) => {
              setWarehouseFilter(e.target.value || null)
              setPage(0)
            }}
            sx={{ minWidth: 220, flex: '1 1 240px' }}
            slotProps={{
              select: {
                MenuProps: {
                  slotProps: {
                    paper: {
                      sx: darkPopupPaperSx,
                    },
                  },
                },
              },
            }}
          >
            <MenuItem value="">كل المخازن</MenuItem>
            {warehouses.map((w) => (
              <MenuItem key={w.id} value={w.id}>
                {w.name}
              </MenuItem>
            ))}
          </TextField>

          <SearchField
            placeholder="البحث برقم أو اسم المادة"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setPage(0)
            }}
            sx={{ minWidth: 240, flex: '1 1 320px' }}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
          <Typography
            sx={{
              fontWeight: 700,
              color: 'rgba(255, 255, 255, 0.94)',
            }}
          >
            إجمالي قيمة المخزون: {formatCurrencyValue(totalStockValue, 'price')}
          </Typography>
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Box
            component="table"
            sx={{
              minWidth: 800,
              tableLayout: 'fixed',
            }}
          >
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ p: 2 }}>المخزن</Box>
                <Box component="th" sx={{ p: 2 }}>رقم المادة</Box>
                <Box component="th" sx={{ p: 2 }}>اسم المادة</Box>
                <Box component="th" sx={{ p: 2 }}>الوحدة</Box>
                <Box component="th" sx={{ p: 2 }}>الرصيد</Box>
                <Box component="th" sx={{ p: 2 }}>متوسط التكلفة</Box>
                <Box component="th" sx={{ p: 2 }}>قيمة الرصيد</Box>
              </Box>
            </Box>

            <Box component="tbody">
              {filtered
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((r) => (
                  <Box component="tr" key={`${r.warehouseId}-${r.id}`}>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      {r.warehouseName ?? '—'}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      {r.materialNumber}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      {r.name}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      {r.unit ?? ''}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, fontWeight: 700 }}>
                      {formatNumberBySettings(r.quantity, 'quantity')}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2 }}>
                      {formatCurrencyValue(r.averageCost, 'average')}
                    </Box>
                    <Box component="td" sx={{ textAlign: 'center', p: 2, fontWeight: 700 }}>
                      {formatCurrencyValue(r.stockValue, 'price')}
                    </Box>
                  </Box>
                ))}
            </Box>
          </Box>
        </Box>

        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(Number(e.target.value))
            setPage(0)
          }}
        />
      </SectionCard>
    </Box>
  )
}
