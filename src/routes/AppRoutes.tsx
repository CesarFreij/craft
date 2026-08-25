import { Outlet, Route, Routes, Navigate } from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import HomePage from '../pages/HomePage'
import { MaterialsPage } from '../pages/MaterialsPage'
import { InventoryPage } from '../pages/InventoryPage'
import { WarehousesPage } from '../pages/WarehousesPage'
import { StockBalancesPage } from '../pages/StockBalancesPage'
import StockAdjustmentsPage from '../pages/StockAdjustmentsPage'
import MovementsPage from '../pages/MovementsPage'
import { PurchasesPage } from '../pages/PurchasesPage'
import { PurchaseReturnsPage } from '../pages/PurchaseReturnsPage'
import { ManufacturingPage } from '../pages/ManufacturingPage'
import { ProductionOrdersPage } from '../pages/ProductionOrdersPage'
import { SalesPage } from '../pages/SalesPage'
import { SalesReturnsPage } from '../pages/SalesReturnsPage'
import { ReportsPage } from '../pages/ReportsPage'
import { SettingsPage } from '../pages/SettingsPage'
import { ManufacturingRecipesPage } from '../pages/ManufacturingRecipesPage'
import InvoicePrintPage from '../pages/InvoicePrintPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AppLayout><Outlet /></AppLayout>}>
        <Route path="/" element={<HomePage />} />
        <Route path="/materials" element={<MaterialsPage />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/warehouses" element={<WarehousesPage />} />
        <Route path="/inventory/balances" element={<StockBalancesPage />} />
        <Route path="/inventory/adjustments" element={<StockAdjustmentsPage />} />
        <Route path="/inventory/movements" element={<MovementsPage />} />
        <Route path="/purchases" element={<PurchasesPage />} />
        <Route path="/suppliers" element={<PurchasesPage />} />
        <Route path="/purchase-returns" element={<PurchaseReturnsPage />} />
        <Route path="/manufacturing" element={<ManufacturingPage />} />
        <Route path="/manufacturing-recipes" element={<ManufacturingRecipesPage />} />
        <Route path="/manufacturing-orders" element={<ProductionOrdersPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/customers" element={<SalesPage />} />
        <Route path="/sales-returns" element={<SalesReturnsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/invoice-preview" element={<InvoicePrintPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
