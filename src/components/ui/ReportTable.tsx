import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from '@mui/material'

export type ReportTableColumn = {
  key: string
  label: string
  align?: 'left' | 'center' | 'right'
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode
}

interface ReportTableProps {
  columns: ReportTableColumn[]
  rows: Record<string, unknown>[]
  totalCount: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onRowsPerPageChange: (pageSize: number) => void
  loading?: boolean
}

const craftReportTableSx = {
  borderRadius: '18px',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,.18)',
  background: 'rgba(248,250,252,.055)',
  backdropFilter: 'blur(20px) saturate(115%)',
  WebkitBackdropFilter: 'blur(20px) saturate(115%)',

  '& .MuiTable-root': {
    background: 'transparent',
    borderCollapse: 'collapse',
  },

  '& .MuiTableHead-root .MuiTableRow-root': {
    background: 'rgba(255,255,255,.075)',
  },

  '& .MuiTableBody-root .MuiTableRow-root': {
    background: 'rgba(255,255,255,.018)',
  },

  '& .MuiTableBody-root .MuiTableRow-root:hover': {
    background: 'rgba(56,189,248,.075)',
  },

  '& .MuiTableCell-root': {
    color: 'rgba(255,255,255,.88)',
    border: '1px solid rgba(255,255,255,.16)',
    whiteSpace: 'nowrap',
  },

  '& .MuiTableHead-root .MuiTableCell-root': {
    color: 'rgba(255,255,255,.96)',
    fontWeight: 800,
  },
}

export function ReportTable({
  columns,
  rows,
  totalCount,
  page,
  pageSize,
  onPageChange,
  onRowsPerPageChange,
  loading,
}: ReportTableProps) {
  return (
    <Box>
      <TableContainer sx={craftReportTableSx}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  align={column.align ?? 'center'}
                  sx={{ py: 1.6 }}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 5 }}
                >
                  جاري تحميل البيانات...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  align="center"
                  sx={{ py: 5 }}
                >
                  لا توجد بيانات ضمن الفلاتر المحددة.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow
                  key={`${row.id ?? row.reference ?? index}`}
                  hover
                >
                  {columns.map((column) => {
                    const value = row[column.key]

                    return (
                      <TableCell
                        key={`${column.key}-${index}`}
                        align={column.align ?? 'center'}
                        sx={{ py: 1.4 }}
                      >
                        {column.render
                          ? column.render(value, row)
                          : value == null
                            ? '—'
                            : String(value)}
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, value) => onPageChange(value)}
        onRowsPerPageChange={(event) =>
          onRowsPerPageChange(Number(event.target.value))
        }
        labelRowsPerPage="عدد الصفوف"
        rowsPerPageOptions={[10, 25, 50, 100]}
        sx={{
          color: 'rgba(255,255,255,.96)',
          '& .MuiTablePagination-selectLabel,& .MuiTablePagination-displayedRows': {
            color: 'rgba(255,255,255,.92)',
            fontWeight: 700,
          },
          '& .MuiIconButton-root': {
            color: 'rgba(255,255,255,.95)',
          },
        }}
      />
    </Box>
  )
}
