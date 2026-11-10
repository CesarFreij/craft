import { Outlet, Route, Routes, Navigate } from 'react-router-dom'
import { AppLayout } from '../layout/AppLayout'
import HomePage from '../pages/HomePage'
import { MaterialsPage } from '../pages/MaterialsPage'
import { InventoryPage } from '../pages/InventoryPage'
import { StockBalancesPage } from '../pages/StockBalancesPage'
import StockAdjustmentsPage from '../pages/StockAdjustmentsPage'
import MovementsPage from '../pages/MovementsPage'
import { PurchasesPage } from '../pages/PurchasesPage'
import { PurchaseReturnsPage } from '../pages/PurchaseReturnsPage'
import { ManufacturingPage } from '../pages/ManufacturingPage'
import { ProductionOrdersPage } from '../pages/ProductionOrdersPage'
import { SalesPage } from '../pages/SalesPage'
import { DelegatesPage } from '../pages/DelegatesPage'
import { SalesReturnsPage } from '../pages/SalesReturnsPage'
import { ReportsDashboardPage } from '../pages/reports/ReportsDashboardPage'
import { FinancialReportsPage } from '../pages/reports/FinancialReportsPage'
import { InventoryReportsPage } from '../pages/reports/InventoryReportsPage'
import { ManufacturingReportsPage } from '../pages/reports/ManufacturingReportsPage'
import { SalesPurchasesReportsPage } from '../pages/reports/SalesPurchasesReportsPage'
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
        <Route path="/inventory/warehouses" element={<Navigate to="/settings?section=warehouses" replace />} />
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
        <Route path="/delegates" element={<DelegatesPage />} />
        <Route path="/sales-returns" element={<SalesReturnsPage />} />
        <Route path="/reports" element={<Navigate to="/reports/dashboard" replace />} />
        <Route path="/reports/dashboard" element={<ReportsDashboardPage />} />
        <Route path="/reports/financial" element={<FinancialReportsPage />} />
        <Route path="/reports/inventory" element={<InventoryReportsPage />} />
        <Route path="/reports/manufacturing" element={<ManufacturingReportsPage />} />
        <Route path="/reports/sales-purchases" element={<SalesPurchasesReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/invoice-preview" element={<InvoicePrintPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
