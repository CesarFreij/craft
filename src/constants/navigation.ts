import { FiHome, FiDatabase, FiBox, FiShoppingBag, FiPackage, FiFileText, FiBarChart2, FiSettings } from 'react-icons/fi'

// src/constants/navigation.ts

export const inventoryMenuItems = [
  { label: 'المخازن', path: '/inventory/warehouses' },
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
  { label: 'نماذج التصنيع', path: '/manufacturing-recipes' },
  { label: 'أوامر الإنتاج', path: '/manufacturing-orders' },
]

export const reportsMenuItems = [
  { label: 'أرصدة المخزون', path: '/reports?type=stock_balances' },
  { label: 'المشتريات', path: '/reports?type=purchases' },
  { label: 'المبيعات', path: '/reports?type=sales' },
  { label: 'حركات المخزون', path: '/reports?type=movements' },
  { label: 'تسويات الجرد', path: '/reports?type=inventory_adjustments' },
  { label: 'الإنتاج', path: '/reports?type=production' },
  { label: 'تكلفة الإنتاج', path: '/reports?type=production_cost' },
]

export const settingsMenuItems = [
  { label: 'بيانات الشركة', path: '/settings?section=company' },
  { label: 'حجم الخط', path: '/settings?section=display' },
  { label: 'العملة والأرقام', path: '/settings?section=numbers' },
  { label: 'أسماء البيع', path: '/settings?section=sales' },
  { label: 'طرق الدفع', path: '/settings?section=payments' },
  { label: 'إدارة البيانات', path: '/settings?section=data' },
]

export const navItems = [
  { key: 'home', label: 'الرئيسية', path: '/', icon: FiHome },
  { key: 'materials', label: 'دليل المواد', path: '/materials', icon: FiDatabase },
  { key: 'inventory', label: 'المخازن', path: '/inventory/warehouses', icon: FiBox, submenu: inventoryMenuItems },
  { key: 'purchases', label: 'المشتريات والموردين', path: '/purchases', icon: FiShoppingBag, submenu: purchasesMenuItems },
  { key: 'sales', label: 'المبيعات والعملاء', path: '/sales', icon: FiFileText, submenu: salesMenuItems },
  { key: 'manufacturing', label: 'الإنتاج والتصنيع', path: '/manufacturing', icon: FiPackage, submenu: manufacturingMenuItems },
  { key: 'reports', label: 'التقارير', path: '/reports', icon: FiBarChart2, submenu: reportsMenuItems },
  { key: 'settings', label: 'الإعدادات', path: '/settings', icon: FiSettings, submenu: settingsMenuItems },
]
