import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardPage } from '../pages/DashboardPage'
import { MaterialsPage } from '../pages/MaterialsPage'
import { InventoryPage } from '../pages/InventoryPage'
import { PurchasesPage } from '../pages/PurchasesPage'
import { ManufacturingPage } from '../pages/ManufacturingPage'
import { SalesPage } from '../pages/SalesPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage />} />
      <Route path="/materials" element={<MaterialsPage />} />
      <Route path="/inventory" element={<InventoryPage />} />
      <Route path="/purchases" element={<PurchasesPage />} />
      <Route path="/manufacturing" element={<ManufacturingPage />} />
      <Route path="/sales" element={<SalesPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
