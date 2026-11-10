import { FiHome, FiDatabase, FiBox, FiShoppingBag, FiPackage, FiFileText, FiBarChart2, FiSettings } from 'react-icons/fi'

// src/constants/navigation.ts

export const inventoryMenuItems = [
  { label: 'أرصدة المخازن', path: '/inventory/balances' },
  { label: 'تسوية جرد', path: '/inventory/adjustments' },
  { label: 'حركات المخازن', path: '/inventory/movements' },
]

export const purchasesMenuItems = [
  { label: 'فواتير المشتريات', path: '/purchases' },
  { label: 'مرتجعات المشتريات', path: '/purchase-returns' },
  { label: 'الموردين', path: '/suppliers' },
]

export const salesMenuItems = [
  { label: 'فواتير المبيعات', path: '/sales' },
  { label: 'مرتجعات المبيعات', path: '/sales-returns' },
  { label: 'العملاء', path: '/customers' },
  { label: 'المناديب', path: '/delegates' },
]

export const manufacturingMenuItems = [
  { label: 'أوامر الإنتاج', path: '/manufacturing-orders' },
  { label: 'نماذج التصنيع', path: '/manufacturing-recipes' },
]

export const reportsMenuItems = [
  { label: 'لوحة القيادة المالية', path: '/reports/dashboard' },
  { label: 'التقارير المالية', path: '/reports/financial' },
  { label: 'تقارير المخزون', path: '/reports/inventory' },
  { label: 'تقارير التصنيع', path: '/reports/manufacturing' },
  { label: 'حركة المبيعات والمشتريات', path: '/reports/sales-purchases' },
]

export const settingsMenuItems = [
  { label: 'بيانات الشركة', path: '/settings?section=company' },
  { label: 'إعدادات عامة', path: '/settings?section=general' },
  { label: 'المخازن', path: '/settings?section=warehouses' },
  { label: 'إدارة البيانات', path: '/settings?section=data' },
]

export const navItems = [
  { key: 'home', label: 'الرئيسية', path: '/', icon: FiHome },
  { key: 'materials', label: 'دليل المواد', path: '/materials', icon: FiDatabase },
  { key: 'inventory', label: 'المخازن', path: '/inventory/balances', icon: FiBox, submenu: inventoryMenuItems },
  { key: 'purchases', label: 'المشتريات والموردين', path: '/purchases', icon: FiShoppingBag, submenu: purchasesMenuItems },
  { key: 'sales', label: 'المبيعات والعملاء', path: '/sales', icon: FiFileText, submenu: salesMenuItems },
  { key: 'manufacturing', label: 'الإنتاج والتصنيع', path: '/manufacturing', icon: FiPackage, submenu: manufacturingMenuItems },
  { key: 'reports', label: 'التقارير التحليلية', path: '/reports/dashboard', icon: FiBarChart2, submenu: reportsMenuItems },
  { key: 'settings', label: 'الإعدادات', path: '/settings', icon: FiSettings, submenu: settingsMenuItems },
]
