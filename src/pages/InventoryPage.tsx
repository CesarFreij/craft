import { Box } from '@mui/material'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function InventoryPage() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/inventory/warehouses', { replace: true })
  }, [navigate])

  return <Box />
}
