import { Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, useTheme } from '@mui/material'

interface DataTableProps {
  columns: string[]
  rows: string[][]
}

export function DataTable({ columns, rows }: DataTableProps) {
  const theme = useTheme()
  return (
    <TableContainer component={Box} sx={{ borderRadius: 3, boxShadow: 'none', border: '1px solid rgba(15, 23, 42, 0.08)' }}>
      <Table>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column} sx={{ fontWeight: 700, color: theme.palette.text.secondary, background: '#F8FAFC' }}>
                {column}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row, index) => (
            <TableRow key={index} sx={{ '&:nth-of-type(odd)': { background: '#fff' } }}>
              {row.map((cell, cellIndex) => (
                <TableCell key={`${index}-${cellIndex}`} sx={{ color: '#475569', py: 2 }}>
                  {cell}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
