import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material'

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

export function ReportTable({ columns, rows, totalCount, page, pageSize, onPageChange, onRowsPerPageChange, loading }: ReportTableProps) {
  return (
    <Box>
      <TableContainer sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F8FAFC' }}>
              {columns.map((column) => (
                <TableCell key={column.key} align={column.align ?? 'center'} sx={{ fontWeight: 700, backgroundColor: '#F8FAFC' }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 5, color: '#64748B' }}>
                  جاري تحميل البيانات...
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 5, color: '#64748B' }}>
                  لا توجد بيانات ضمن الفلاتر المحددة.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, index) => (
                <TableRow key={`${row.id ?? index}`} hover>
                  {columns.map((column) => {
                    const value = row[column.key]
                    return (
                      <TableCell key={`${column.key}-${index}`} align={column.align ?? 'center'} sx={{ py: 1.5 }}>
                        {column.render
                            ? column.render(value, row)
                            : value == null
                            ? '-'
                            : typeof value === 'string' || typeof value === 'number'
                            ? value
                            : typeof value === 'boolean'
                                ? value ? 'نعم' : 'لا'
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
        className="report-page-pagination"
        count={totalCount}
        page={page}
        rowsPerPage={pageSize}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
        labelRowsPerPage="عدد الصفوف"
        rowsPerPageOptions={[10, 25, 50, 100]}
      />
    </Box>
  )
}
