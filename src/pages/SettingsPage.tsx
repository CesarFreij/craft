import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { ChangeEvent } from 'react'
import {
  FiAlertTriangle,
  FiCreditCard,
  FiPlus,
  FiTrash2,
  FiUpload,
} from 'react-icons/fi'
import { useNotifications } from '../contexts/useNotifications'
import { PageHeader } from '../components/ui/PageHeader'
import { SectionCard } from '../components/ui/SectionCard'
import {
  loadCompanyPrintSettings,
  saveCompanyPrintSettings,
} from '../services/companyPrintSettingsService'
import {
  loadSettings,
  saveSettings,
  type AppSettings,
  type AutoBackupMode,
  type DefaultSalesPriceType,
} from '../services/settingsService'
import type { CompanyPrintSettings } from '../types/invoicePrint'

declare global {
  interface Window {
    craftDataManagementAPI?: {
      chooseBackupFolder: () => Promise<string>
      chooseBackupFile: () => Promise<string>
      createBackup: (
        targetDirectory?: string,
      ) => Promise<{ filePath?: string; fileName?: string; lastBackupAt?: string }>
      getAutoBackupSettings: () => Promise<{
        enabled: boolean
        mode: AutoBackupMode
        backupDirectory: string
        lastBackupAt: string
      }>
      setAutoBackupSettings: (settings: {
        enabled?: boolean
        mode?: AutoBackupMode
        backupDirectory?: string
        lastBackupAt?: string
      }) => Promise<{
        enabled: boolean
        mode: AutoBackupMode
        backupDirectory: string
        lastBackupAt: string
      }>
      restoreBackup: (
        backupFilePath: string,
      ) => Promise<{ dbFile?: string }>
      resetDatabase: (
        confirmationText: string,
      ) => Promise<{ dbFile?: string }>
    }
  }
}

type SettingsSection =
  | 'general'
  | 'company'
  | 'sales'
  | 'payments'
  | 'data'

const craftPageGlassSx = {
  '& .MuiPaper-root:not(.MuiAlert-root):not(.craft-danger-area):not(.craft-inner-panel)': {
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
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,.68)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#67E8F9',
  },
  '& .MuiSelect-icon': {
    color: 'rgba(255,255,255,.78)',
  },
  '& input[type="number"]': {
    colorScheme: 'dark',
  },
}

const innerPanelSx = {
  p: { xs: 2, md: 2.5 },
  display: 'grid',
  gap: 2,
  background: 'transparent !important',
  border: 'none',
  borderRadius: 0,
  boxShadow: 'none !important',
  backgroundImage: 'none !important',
}

const sectionDividerSx = {
  width: '100%',
  height: '1px',
  background: 'rgba(255,255,255,.09)',
}

const darkPopupPaperSx = {
  mt: 0.75,
  borderRadius: '12px',
  background: 'rgba(8,22,48,.97)',
  backdropFilter: 'blur(22px) saturate(125%)',
  WebkitBackdropFilter: 'blur(22px) saturate(125%)',
  border: '1px solid rgba(255,255,255,.14)',
  boxShadow: '0 20px 50px rgba(2,6,23,.38)',
  color: 'rgba(255,255,255,.92)',
  backgroundImage: 'none',
  '& .MuiMenuItem-root': {
    color: 'rgba(255,255,255,.88)',
    borderRadius: '8px',
    mx: 0.5,
    my: 0.25,
    '&:hover': {
      background: 'rgba(56,189,248,.10)',
    },
    '&.Mui-selected': {
      color: '#67E8F9',
      background: 'rgba(34,211,238,.13)',
    },
    '&.Mui-selected:hover': {
      background: 'rgba(34,211,238,.18)',
    },
  },
}

const darkDialogPaperSx = {
  borderRadius: '18px',
  background: 'rgba(8,22,48,.98)',
  backdropFilter: 'blur(24px) saturate(125%)',
  WebkitBackdropFilter: 'blur(24px) saturate(125%)',
  border: '1px solid rgba(255,255,255,.14)',
  boxShadow: '0 24px 70px rgba(2,6,23,.46)',
  color: 'rgba(255,255,255,.92)',
  backgroundImage: 'none',
  '& .MuiDialogTitle-root, & .MuiDialogContent-root': {
    color: 'rgba(255,255,255,.92)',
  },
}

const craftErrorAlertSx = {
  background: 'rgb(92 18 18 / 50%) !important',
  backgroundColor: 'rgb(92 18 18 / 50%) !important',
  color: '#FEE2E2 !important',
  border: '1px solid rgba(248, 113, 113, 0.58)',
  borderRadius: '14px',
  '& .MuiAlert-icon': {
    color: '#FCA5A5',
  },
  '& .MuiAlert-message': {
    color: '#FFFFFF',
    fontWeight: 700,
  },
}

const textFieldSx = {
  '& .MuiInputBase-root': {
    background: 'rgba(255,255,255,.07)',
    color: 'rgba(255,255,255,.92)',
    borderRadius: '14px',
  },
  '& .MuiInputBase-input': {
    color: 'rgba(255,255,255,.92)',
    WebkitTextFillColor: 'rgba(255,255,255,.92)',
  },
  '& .MuiInputLabel-root': {
    color: 'rgba(255,255,255,.72)',
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#67E8F9',
  },
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,.18)',
  },
  '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(103,232,249,.55)',
  },
  '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: '#67E8F9',
    borderWidth: 1.5,
  },
  '& input[type="number"]': {
    colorScheme: 'dark',
  },
  '& input[type="number"]::-webkit-inner-spin-button, & input[type="number"]::-webkit-outer-spin-button':
    {
      opacity: 0.88,
      cursor: 'pointer',
    },
}

const selectSx = {
  ...textFieldSx,
  '& .MuiSelect-icon': {
    color: 'rgba(255,255,255,.78)',
  },
  '& .MuiSelect-select': {
    color: 'rgba(255,255,255,.92)',
  },
}

const primaryButtonSx = {
  minHeight: 42,
  px: 2.2,
  color: '#FFFFFF !important',
  fontWeight: 800,
  boxShadow: 'none',
  '&:hover': {
    boxShadow: 'none',
  },
}

const neutralButtonSx = {
  minHeight: 42,
  color: '#E2E8F0',
  borderColor: 'rgba(255,255,255,.22)',
  '&:hover': {
    color: '#FFFFFF',
    borderColor: '#67E8F9',
    background: 'rgba(103,232,249,.08)',
  },
}

const dangerColor = 'rgba(127, 29, 29, 0.44)'

const selectMenuProps = {
  slotProps: {
    paper: {
      sx: darkPopupPaperSx,
    },
  },
}

const sectionTitles: Record<SettingsSection, string> = {
  general: 'عام',
  company: 'بيانات الشركة',
  sales: 'المبيعات',
  payments: 'طرق الدفع',
  data: 'إدارة البيانات',
}

function normalizeSettingsSection(value: string | null): SettingsSection {
  if (value === 'company' || value === 'sales' || value === 'payments' || value === 'data') {
    return value
  }
  return 'general'
}

function formatBackupDate(value: string) {
  if (!value) return 'لم يتم إنشاء نسخة من هذه الصفحة بعد'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'غير متوفر'

  return date.toLocaleString('ar')
}

export function SettingsPage() {
  const [searchParams] = useSearchParams()
  const activeSection = normalizeSettingsSection(searchParams.get('section'))
  const { success, error: notifyError, info } = useNotifications()

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [companySettings, setCompanySettings] =
    useState<CompanyPrintSettings>(() => loadCompanyPrintSettings())
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())
  const [newPaymentMethod, setNewPaymentMethod] = useState('')
  const [backupFilePath, setBackupFilePath] = useState('')
  const [backupCreateConfirmOpen, setBackupCreateConfirmOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [resetWarningOpen, setResetWarningOpen] = useState(false)
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [resetConfirmationText, setResetConfirmationText] = useState('')

  useEffect(() => {
    const api = window.craftDataManagementAPI
    if (!api?.getAutoBackupSettings || !api.setAutoBackupSettings) {
      return
    }

    let active = true

    const loadAutoBackupSettings = async () => {
      try {
        const localSettings = loadSettings()
        const autoBackupSettings = await api.getAutoBackupSettings()
        const backupDirectory =
          autoBackupSettings.backupDirectory || localSettings.backupDirectory

        let syncedSettings = autoBackupSettings
        if (
          backupDirectory &&
          backupDirectory !== autoBackupSettings.backupDirectory
        ) {
          syncedSettings = await api.setAutoBackupSettings({
            ...autoBackupSettings,
            backupDirectory,
          })
        }

        if (!active) return

        const saved = saveSettings({
          ...localSettings,
          backupDirectory: syncedSettings.backupDirectory,
          autoBackupOnExit: syncedSettings.enabled,
          autoBackupMode: syncedSettings.mode,
          lastBackupAt:
            syncedSettings.lastBackupAt || localSettings.lastBackupAt,
        })
        setSettings(saved)
      } catch (error) {
        console.error('LOAD AUTO BACKUP SETTINGS FAILED', error)
      }
    }

    void loadAutoBackupSettings()

    return () => {
      active = false
    }
  }, [])

  const updateSettingsDraft = (patch: Partial<AppSettings>) => {
    setSettings((current) => ({
      ...current,
      ...patch,
    }))
  }

  const saveGeneralSettings = () => {
    const saved = saveSettings({
      ...loadSettings(),
      currencyName: settings.currencyName,
      currencySymbol: settings.currencySymbol,
      quantityDecimals: settings.quantityDecimals,
      priceDecimals: settings.priceDecimals,
      averageDecimals: settings.averageDecimals,
    })

    setSettings((current) => ({
      ...current,
      currencyName: saved.currencyName,
      currencySymbol: saved.currencySymbol,
      quantityDecimals: saved.quantityDecimals,
      priceDecimals: saved.priceDecimals,
      averageDecimals: saved.averageDecimals,
    }))
    success('تم حفظ الإعدادات العامة بنجاح.')
  }

  const saveSalesSettings = () => {
    const saved = saveSettings({
      ...loadSettings(),
      defaultSalesPriceType: settings.defaultSalesPriceType,
      salesPrice1Name: settings.salesPrice1Name,
      salesPrice2Name: settings.salesPrice2Name,
      salesPrice3Name: settings.salesPrice3Name,
    })

    setSettings((current) => ({
      ...current,
      defaultSalesPriceType: saved.defaultSalesPriceType,
      salesPrice1Name: saved.salesPrice1Name,
      salesPrice2Name: saved.salesPrice2Name,
      salesPrice3Name: saved.salesPrice3Name,
    }))
    success('تم حفظ إعدادات المبيعات بنجاح.')
  }

  const savePaymentSettings = () => {
    const saved = saveSettings({
      ...loadSettings(),
      paymentMethods: settings.paymentMethods,
    })

    setSettings((current) => ({
      ...current,
      paymentMethods: saved.paymentMethods,
    }))
    success('تم حفظ طرق الدفع بنجاح.')
  }

  const handleCompanyFieldChange =
    (field: keyof CompanyPrintSettings) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setCompanySettings((current) => ({
        ...current,
        [field]: event.target.value,
      }))
    }

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanySettings((current) => ({
          ...current,
          logoDataUrl: reader.result as string,
        }))
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleSaveCompanySettings = () => {
    const saved = saveCompanyPrintSettings(companySettings)
    setCompanySettings(saved)
    success('تم حفظ بيانات الشركة بنجاح.')
  }

  const addPaymentMethod = () => {
    const value = newPaymentMethod.trim()
    if (!value) return

    if (settings.paymentMethods.includes(value)) {
      info('طريقة الدفع موجودة مسبقاً.')
      return
    }

    updateSettingsDraft({
      paymentMethods: [...settings.paymentMethods, value],
    })
    setNewPaymentMethod('')
  }

  const removePaymentMethod = (method: string) => {
    if (settings.paymentMethods.length <= 1) {
      notifyError('يجب الإبقاء على طريقة دفع واحدة على الأقل.')
      return
    }

    updateSettingsDraft({
      paymentMethods: settings.paymentMethods.filter(
        (item) => item !== method,
      ),
    })
  }

  const persistAutoBackupSettings = async ({
    enabled,
    mode,
    backupDirectory,
  }: {
    enabled: boolean
    mode: AutoBackupMode
    backupDirectory: string
  }) => {
    const api = window.craftDataManagementAPI
    if (!api?.setAutoBackupSettings) {
      throw new Error('واجهة إعدادات النسخ التلقائي غير متاحة.')
    }

    const persisted = await api.setAutoBackupSettings({
      enabled,
      mode,
      backupDirectory,
    })

    const saved = saveSettings({
      ...loadSettings(),
      backupDirectory: persisted.backupDirectory,
      autoBackupOnExit: persisted.enabled,
      autoBackupMode: persisted.mode,
      lastBackupAt: persisted.lastBackupAt || settings.lastBackupAt,
    })
    setSettings(saved)

    return saved
  }

  const handleAutoBackupEnabledChange = async (enabled: boolean) => {
    if (enabled && !settings.backupDirectory) {
      notifyError('اختر مجلد النسخ الاحتياطي أولاً قبل تفعيل النسخ عند الخروج.')
      return
    }

    try {
      await persistAutoBackupSettings({
        enabled,
        mode: settings.autoBackupMode,
        backupDirectory: settings.backupDirectory,
      })
    } catch (error) {
      notifyError(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ إعداد النسخ التلقائي.',
      )
    }
  }

  const handleAutoBackupModeChange = async (
    event: SelectChangeEvent,
  ) => {
    const mode = event.target.value as AutoBackupMode

    try {
      await persistAutoBackupSettings({
        enabled: settings.autoBackupOnExit,
        mode,
        backupDirectory: settings.backupDirectory,
      })
    } catch (error) {
      notifyError(
        error instanceof Error
          ? error.message
          : 'تعذر حفظ طريقة النسخ التلقائي.',
      )
    }
  }

  const handleChooseBackupFolder = async () => {
    const api = window.craftDataManagementAPI
    if (!api) {
      notifyError('واجهة النسخ الاحتياطي غير متاحة.')
      return
    }

    try {
      const folder = await api.chooseBackupFolder()
      if (!folder) return

      await persistAutoBackupSettings({
        enabled: settings.autoBackupOnExit,
        mode: settings.autoBackupMode,
        backupDirectory: folder,
      })

      success('تم حفظ مجلد النسخ الاحتياطي بنجاح.')
    } catch (error) {
      notifyError(
        error instanceof Error
          ? error.message
          : 'تعذر اختيار مجلد النسخ الاحتياطي.',
      )
    }
  }

  const performCreateBackup = async () => {
    const api = window.craftDataManagementAPI
    if (!api) {
      notifyError('واجهة النسخ الاحتياطي غير متاحة.')
      return
    }

    try {
      setBackupCreateConfirmOpen(false)
      const result = await api.createBackup(
        settings.backupDirectory || undefined,
      )
      const lastBackupAt =
        result?.lastBackupAt || new Date().toISOString()

      const savedAfterBackup = saveSettings({
        ...loadSettings(),
        backupDirectory: settings.backupDirectory,
        lastBackupAt,
      })
      setSettings((current) => ({
        ...current,
        backupDirectory: savedAfterBackup.backupDirectory,
        lastBackupAt: savedAfterBackup.lastBackupAt,
      }))

      success(
        result?.fileName
          ? `تم إنشاء النسخة الاحتياطية بنجاح: ${result.fileName}`
          : 'تم إنشاء النسخة الاحتياطية بنجاح.',
      )
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : 'فشل إنشاء النسخة الاحتياطية.',
      )
    }
  }

  const handleChooseBackupFile = async () => {
    const api = window.craftDataManagementAPI
    if (!api) {
      notifyError('واجهة استعادة النسخة الاحتياطية غير متاحة.')
      return
    }

    try {
      const file = await api.chooseBackupFile()
      if (!file) return

      setBackupFilePath(file)
      info('تم اختيار ملف النسخة الاحتياطية.')
    } catch (error) {
      notifyError(
        error instanceof Error
          ? error.message
          : 'تعذر اختيار ملف النسخة الاحتياطية.',
      )
    }
  }

  const performRestoreBackup = async () => {
    const api = window.craftDataManagementAPI
    if (!api || !backupFilePath) return

    try {
      await api.restoreBackup(backupFilePath)
      setRestoreDialogOpen(false)
      success('تمت استعادة النسخة الاحتياطية بنجاح.')
    } catch (error) {
      setRestoreDialogOpen(false)
      notifyError(
        error instanceof Error ? error.message : 'فشل استعادة النسخة الاحتياطية.',
      )
    }
  }

  const requestRestoreBackup = () => {
    if (!backupFilePath) {
      notifyError('اختر ملف النسخة الاحتياطية أولاً.')
      return
    }

    setRestoreDialogOpen(true)
  }

  const performResetDatabase = async () => {
    const api = window.craftDataManagementAPI
    if (!api) return

    const confirmationText = resetConfirmationText.trim()
    if (confirmationText !== 'RESET DATABASE') {
      notifyError('كلمة التأكيد غير صحيحة. لم يتم حذف أي بيانات.')
      return
    }

    try {
      await api.resetDatabase(confirmationText)
      setResetConfirmOpen(false)
      setResetConfirmationText('')
      success('تم تصفير قاعدة البيانات بنجاح.')
    } catch (error) {
      notifyError(
        error instanceof Error ? error.message : 'فشل تصفير قاعدة البيانات.',
      )
    }
  }

  const renderCompanySection = () => (
    <SectionCard
      title="بيانات الشركة"
      subtitle="الشعار والبيانات المستخدمة في الفواتير والتصدير"
    >
      <Paper className="craft-inner-panel" elevation={0} sx={innerPanelSx}>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
          }}
        >
          <Box
            sx={{
              width: 92,
              height: 92,
              borderRadius: '16px',
              overflow: 'hidden',
              background: 'rgba(255,255,255,.055)',
              border: '1px solid rgba(255,255,255,.12)',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            {companySettings.logoDataUrl ? (
              <Box
                component="img"
                src={companySettings.logoDataUrl}
                alt="شعار الشركة"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  p: 0.7,
                }}
              />
            ) : (
              <Typography
                sx={{
                  fontSize: 12,
                  color: 'rgba(255,255,255,.55)',
                  fontWeight: 700,
                }}
              >
                الشعار
              </Typography>
            )}
          </Box>

          <Box>
            <Button
              variant="outlined"
              startIcon={<FiUpload />}
              onClick={() => fileInputRef.current?.click()}
              sx={[neutralButtonSx, {borderRadius: '24px',}]}
            >
              رفع شعار الشركة
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleLogoUpload}
            />
          </Box>
        </Box>

        <Box sx={sectionDividerSx} />

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: 'repeat(2, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <TextField
            sx={textFieldSx}
            fullWidth
            label="اسم الشركة"
            value={companySettings.companyName}
            onChange={handleCompanyFieldChange('companyName')}
          />
          <TextField
            sx={textFieldSx}
            fullWidth
            label="العنوان"
            value={companySettings.address}
            onChange={handleCompanyFieldChange('address')}
          />
          <TextField
            sx={textFieldSx}
            fullWidth
            label="الهاتف"
            value={companySettings.phone}
            onChange={handleCompanyFieldChange('phone')}
          />
          <TextField
            sx={textFieldSx}
            fullWidth
            label="البريد الإلكتروني"
            value={companySettings.email}
            onChange={handleCompanyFieldChange('email')}
          />
          <TextField
            sx={textFieldSx}
            fullWidth
            label="الرقم الضريبي"
            value={companySettings.taxNumber ?? ''}
            onChange={handleCompanyFieldChange('taxNumber')}
          />
        </Box>

      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={handleSaveCompanySettings}
          sx={[primaryButtonSx, {borderRadius: '24px',}]}
        >
          حفظ بيانات الشركة
        </Button>
      </Box>
    </SectionCard>
  )

  const renderNumbersSection = () => (
    <SectionCard
      title="العملة والأرقام"
      subtitle="العملة وعدد المنازل العشرية المستخدمة في العرض"
    >
      <Paper className="craft-inner-panel" elevation={0} sx={innerPanelSx}>
        <Box>
          <Typography
            sx={{
              mb: 1.5,
              fontWeight: 850,
              color: 'rgba(255,255,255,.90)',
            }}
          >
            العملة
          </Typography>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(2, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              sx={textFieldSx}
              fullWidth
              label="اسم العملة"
              value={settings.currencyName}
              onChange={(event) =>
                updateSettingsDraft({
                  currencyName: event.target.value,
                })
              }
            />
            <TextField
              sx={textFieldSx}
              fullWidth
              label="رمز العملة"
              value={settings.currencySymbol}
              onChange={(event) =>
                updateSettingsDraft({
                  currencySymbol: event.target.value,
                })
              }
            />
          </Box>
        </Box>

        <Box sx={sectionDividerSx} />

        <Box>
          <Typography
            sx={{
              mb: 1.5,
              fontWeight: 850,
              color: 'rgba(255,255,255,.90)',
            }}
          >
            المنازل العشرية
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              sx={textFieldSx}
              fullWidth
              label="الكميات"
              type="number"
              value={settings.quantityDecimals}
              onChange={(event) =>
                updateSettingsDraft({
                  quantityDecimals: Number(event.target.value) || 0,
                })
              }
              slotProps={{
                htmlInput: {
                  min: 0,
                  max: 6,
                  step: 1,
                },
              }}
            />

            <TextField
              sx={textFieldSx}
              fullWidth
              label="الأسعار"
              type="number"
              value={settings.priceDecimals}
              onChange={(event) =>
                updateSettingsDraft({
                  priceDecimals: Number(event.target.value) || 0,
                })
              }
              slotProps={{
                htmlInput: {
                  min: 0,
                  max: 6,
                  step: 1,
                },
              }}
            />

            <TextField
              sx={textFieldSx}
              fullWidth
              label="المتوسط"
              type="number"
              value={settings.averageDecimals}
              onChange={(event) =>
                updateSettingsDraft({
                  averageDecimals: Number(event.target.value) || 0,
                })
              }
              slotProps={{
                htmlInput: {
                  min: 0,
                  max: 6,
                  step: 1,
                },
              }}
            />
          </Box>
        </Box>

      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={saveGeneralSettings}
          sx={[primaryButtonSx, {borderRadius: '24px',}]}
        >
          حفظ إعدادات العملة والأرقام 
        </Button>
      </Box>
    </SectionCard>
  )

  const renderSalesSection = () => (
    <SectionCard
      title="المبيعات"
      subtitle="السعر الافتراضي وأسماء أسعار البيع"
    >
      <Paper className="craft-inner-panel" elevation={0} sx={innerPanelSx}>
        <FormControl fullWidth>
          <InputLabel id="sales-price-default-label">
            السعر الافتراضي للمبيعات
          </InputLabel>
          <Select
            labelId="sales-price-default-label"
            value={settings.defaultSalesPriceType}
            label="السعر الافتراضي للمبيعات"
            MenuProps={selectMenuProps}
            onChange={(event: SelectChangeEvent) =>
              updateSettingsDraft({
                defaultSalesPriceType:
                  event.target.value as DefaultSalesPriceType,
              })
            }
            sx={selectSx}
          >
            <MenuItem value="average">المتوسط</MenuItem>
            <MenuItem value="price1">{settings.salesPrice1Name}</MenuItem>
            <MenuItem value="price2">{settings.salesPrice2Name}</MenuItem>
            <MenuItem value="price3">{settings.salesPrice3Name}</MenuItem>
          </Select>
        </FormControl>

        <Box sx={sectionDividerSx} />

        <Box>
          <Typography sx={{ fontWeight: 850, mb: 0.5, fontSize: 16 }}>
            أسماء أسعار البيع
          </Typography>
          <Typography
            sx={{
              color: 'rgba(255,255,255,.58)',
              fontSize: 12.5,
              lineHeight: 1.8,
              mb: 1.5,
            }}
          >
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                md: 'repeat(3, minmax(0, 1fr))',
              },
              gap: 2,
            }}
          >
            <TextField
              fullWidth
              label="اسم سعر البيع الأول"
              value={settings.salesPrice1Name}
              onChange={(event) =>
                updateSettingsDraft({ salesPrice1Name: event.target.value })
              }
              sx={textFieldSx}
            />
            <TextField
              fullWidth
              label="اسم سعر البيع الثاني"
              value={settings.salesPrice2Name}
              onChange={(event) =>
                updateSettingsDraft({ salesPrice2Name: event.target.value })
              }
              sx={textFieldSx}
            />
            <TextField
              fullWidth
              label="اسم سعر البيع الثالث"
              value={settings.salesPrice3Name}
              onChange={(event) =>
                updateSettingsDraft({ salesPrice3Name: event.target.value })
              }
              sx={textFieldSx}
            />
          </Box>
        </Box>

      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={saveSalesSettings}
          sx={[primaryButtonSx, {borderRadius: '24px',}]}
        >
          حفظ إعدادات المبيعات
        </Button>
      </Box>
    </SectionCard>
  )

  const renderPaymentsSection = () => (
    <SectionCard
      title="طرق الدفع"
      subtitle="إضافة وإزالة طرق الدفع التي تظهر للمستخدم"
    >
      <Paper className="craft-inner-panel" elevation={0} sx={innerPanelSx}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          sx={{ alignItems: 'stretch' }}
        >
          <TextField
            sx={{ ...textFieldSx, flex: 1 }}
            fullWidth
            label="طريقة دفع جديدة"
            value={newPaymentMethod}
            onChange={(event) => setNewPaymentMethod(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                addPaymentMethod()
              }
            }}
          />

          <Button
            variant="contained"
            startIcon={<FiPlus />}
            onClick={addPaymentMethod}
            sx={{
              ...primaryButtonSx,
              minWidth: 130,
            }}
          >
            إضافة
          </Button>
        </Stack>

        <Box sx={sectionDividerSx} />

        <Box
          sx={{
            display: 'grid',
            gap: 1,
          }}
        >
          {settings.paymentMethods.map((method) => (
            <Box
              key={method}
              sx={{
                minHeight: 48,
                px: 1.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                borderRadius: '12px',
                background: 'rgba(255,255,255,.035)',
                border: '1px solid rgba(255,255,255,.08)',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  minWidth: 0,
                }}
              >
                <FiCreditCard color="#67E8F9" />
                <Typography
                  sx={{
                    fontWeight: 750,
                    color: 'rgba(255,255,255,.88)',
                  }}
                >
                  {method}
                </Typography>
              </Box>

              <Button
                size="small"
                startIcon={<FiTrash2 />}
                onClick={() => removePaymentMethod(method)}
                disabled={settings.paymentMethods.length <= 1}
                sx={{
                  color: '#FCA5A5',
                  minWidth: 0,
                  '&.Mui-disabled': {
                    color: 'rgba(255,255,255,.28)',
                  },
                }}
              >
                حذف
              </Button>
            </Box>
          ))}
        </Box>

      </Paper>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={savePaymentSettings}
          sx={[primaryButtonSx, {borderRadius: '24px',}]}
        >
          حفظ طرق الدفع
        </Button>
      </Box>
    </SectionCard>
  )

  const renderDataSection = () => (
    <SectionCard
      title="النسخ الاحتياطي وإدارة البيانات"
      subtitle="إنشاء نسخة، استعادة البيانات، أو تصفير قاعدة البيانات"
    >
      <Box sx={{ display: 'grid', gap: 2 }}>
        <Paper className="craft-inner-panel" elevation={0} sx={innerPanelSx}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              flexWrap: 'wrap',
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontWeight: 850,
                  color: 'rgba(255,255,255,.92)',
                }}
              >
                النسخ الاحتياطي
              </Typography>
              <Typography
                sx={{
                  mt: 0.35,
                  fontSize: 12,
                  color: 'rgba(255,255,255,.54)',
                }}
              >
                آخر نسخة: {formatBackupDate(settings.lastBackupAt)}
              </Typography>
            </Box>

          </Box>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: 'stretch' }}
          >
            <TextField
              sx={{ ...textFieldSx, flex: 1 }}
              fullWidth
              label="مجلد النسخ الاحتياطي"
              value={settings.backupDirectory}
              onClick={handleChooseBackupFolder}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
            />
            <Button
              variant="outlined"
              onClick={() => setBackupCreateConfirmOpen(true)}
              sx={primaryButtonSx}
            >
              إنشاء نسخة الآن
            </Button>
          </Stack>

          <Box sx={sectionDividerSx} />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
              },
              gap: 2,
              alignItems: 'center',
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={settings.autoBackupOnExit}
                  onChange={(_, checked) =>
                    void handleAutoBackupEnabledChange(checked)
                  }
                />
              }
              label="إنشاء نسخة احتياطية تلقائياً عند إغلاق البرنامج"
              sx={{
                m: 0,
                '& .MuiFormControlLabel-label': {
                  fontWeight: 750,
                  color: 'rgba(255,255,255,.88)',
                },
              }}
            />

            <FormControl
              fullWidth
              disabled={!settings.autoBackupOnExit}
              sx={selectSx}
            >
              <InputLabel id="auto-backup-mode-label">
                طريقة النسخ التلقائي
              </InputLabel>
              <Select
                labelId="auto-backup-mode-label"
                value={settings.autoBackupMode}
                label="طريقة النسخ التلقائي"
                MenuProps={selectMenuProps}
                onChange={handleAutoBackupModeChange}
              >
                <MenuItem value="new">إنشاء نسخة جديدة عند كل خروج</MenuItem>
                <MenuItem value="replace">استبدال آخر نسخة تلقائية</MenuItem>
              </Select>
            </FormControl>
            <Typography
              sx={{
                fontSize: 12,
                lineHeight: 1.8,
                color: 'rgba(255,255,255,.54)',
              }}
            >
              عند اختيار الاستبدال يتم تحديث ملف النسخ التلقائي فقط، ولا يتم
              حذف أو استبدال أي نسخة احتياطية أنشأها المستخدم يدوياً.
            </Typography>
          </Box>

          <Box sx={sectionDividerSx} />
          <Typography
            sx={{
              fontWeight: 850,
              color: 'rgba(255,255,255,.92)',
            }}
          >
            استعادة نسخة احتياطية
          </Typography>

          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            sx={{ alignItems: 'stretch' }}
          >
            <TextField
              sx={{ ...textFieldSx, flex: 1 }}
              fullWidth
              label="ملف النسخة الاحتياطية"
              value={backupFilePath}
              onClick={handleChooseBackupFile}
              slotProps={{
                input: {
                  readOnly: true,
                },
              }}
            />

            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={requestRestoreBackup}
                sx={{
                  ...neutralButtonSx,
                  color: '#FDE68A',
                  borderColor: 'rgba(251,191,36,.42)',
                  '&:hover': {
                    color: '#FEF3C7',
                    borderColor: '#FBBF24',
                    background: 'rgba(251,191,36,.08)',
                  },
                }}
              >
                استعادة النسخة
              </Button>
            </Box>
          </Stack>

        </Paper>

        <Paper
          className="craft-danger-area"
          elevation={0}
          sx={{
            ...innerPanelSx,
            background: dangerColor,
            border: 'none',
            borderRadius: '18px'
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 1.25,
            }}
          >
            <FiAlertTriangle
              size={20}
              color="#FFFFFF"
              style={{ flexShrink: 0, marginTop: 2 }}
            />
            <Box>
              <Typography
                sx={{
                  fontWeight: 900,
                  color: '#FEE2E2',
                }}
              >
                منطقة خطرة
              </Typography>
              <Typography
                sx={{
                  mt: 0.4,
                  color: 'rgba(255,255,255,.80)',
                  fontSize: 12.5,
                  lineHeight: 1.8,
                }}
              >
                تصفير قاعدة البيانات يحذف بيانات التشغيل. العملية
                محمية بتحذيرين وتأكيد كتابي.
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              startIcon={<FiTrash2 />}
              onClick={() => setResetWarningOpen(true)}
              sx={{
                minHeight: 42,
                color: '#FFFFFF !important',
                background: dangerColor,
                border: '1px solid rgba(255,255,255,.16)',
                boxShadow: 'none',
                fontWeight: 850,
                '&:hover': {
                  background: dangerColor,
                  boxShadow: 'none',
                },
              }}
            >
              تصفير قاعدة البيانات
            </Button>
          </Box>
        </Paper>
      </Box>
    </SectionCard>
  )

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'company':
        return renderCompanySection()
      case 'sales':
        return renderSalesSection()
      case 'payments':
        return renderPaymentsSection()
      case 'data':
        return renderDataSection()
      case 'general':
      default:
        return (
          <Stack spacing={2}>
            {renderNumbersSection()}
          </Stack>
        )
    }
  }

  return (
    <Box sx={craftPageGlassSx}>
      <PageHeader
        title="الإعدادات"
        breadcrumb={`الإعدادات / ${sectionTitles[activeSection]}`}
      />

      {renderActiveSection()}

      <Dialog
        open={backupCreateConfirmOpen}
        onClose={() => setBackupCreateConfirmOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: darkDialogPaperSx,
          },
        }}
      >
        <DialogTitle>تأكيد إنشاء نسخة احتياطية</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Typography sx={{ color: 'rgba(255,255,255,.74)', lineHeight: 1.8 }}>
            سيتم إنشاء نسخة احتياطية من قاعدة البيانات في المجلد المحدد. هل تريد المتابعة؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setBackupCreateConfirmOpen(false)}
            sx={{ color: '#CBD5E1' }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void performCreateBackup()
            }}
            sx={primaryButtonSx}
          >
            إنشاء النسخة
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={restoreDialogOpen}
        onClose={() => setRestoreDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: darkDialogPaperSx,
          },
        }}
      >
        <DialogTitle>تأكيد استعادة النسخة الاحتياطية</DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Alert severity="warning" sx={{ borderRadius: '14px', mb: 1.5 }}>
            سيتم استبدال بيانات قاعدة البيانات الحالية بمحتوى النسخة
            المختارة.
          </Alert>
          <Typography sx={{ color: 'rgba(255,255,255,.72)' }}>
            هل تريد المتابعة؟
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRestoreDialogOpen(false)}
            sx={{ color: '#CBD5E1' }}
          >
            تراجع
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void performRestoreBackup()
            }}
            sx={{
              ...primaryButtonSx,
              background: '#D97706',
              '&:hover': {
                background: '#B45309',
              },
            }}
          >
            استعادة
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetWarningOpen}
        onClose={() => setResetWarningOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: darkDialogPaperSx,
          },
        }}
      >
        <DialogTitle sx={{ color: '#FEE2E2 !important' }}>
          تحذير: تصفير قاعدة البيانات
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Alert severity="error" sx={craftErrorAlertSx}>
            سيتم حذف بيانات التشغيل نهائياً. لا تعتمد على التراجع بعد
            تنفيذ العملية.
          </Alert>
          <Typography
            sx={{
              mt: 1.5,
              color: 'rgba(255,255,255,.70)',
              lineHeight: 1.8,
            }}
          >
            إذا كنت تريد المتابعة إلى التأكيد النهائي اضغط «متابعة».
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setResetWarningOpen(false)}
            sx={{ color: '#CBD5E1' }}
          >
            إلغاء
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setResetWarningOpen(false)
              setResetConfirmationText('')
              setResetConfirmOpen(true)
            }}
            sx={{
              color: '#FCA5A5',
              borderColor: 'rgba(248,113,113,.48)',
            }}
          >
            متابعة
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={resetConfirmOpen}
        onClose={() => {
          setResetConfirmOpen(false)
          setResetConfirmationText('')
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: darkDialogPaperSx,
          },
        }}
      >
        <DialogTitle sx={{ color: '#FEE2E2 !important' }}>
          التأكيد النهائي
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <Typography
            sx={{
              mb: 1.5,
              color: 'rgba(255,255,255,.72)',
              lineHeight: 1.8,
            }}
          >
            اكتب العبارة التالية تماماً للسماح بالتنفيذ:
          </Typography>

          <Box
            sx={{
              mb: 1.5,
              p: 1.2,
              borderRadius: '10px',
              background: dangerColor,
              border: 'none',
              color: '#FFFFFF',
              direction: 'ltr',
              textAlign: 'center',
              fontWeight: 900,
              letterSpacing: 0.8,
            }}
          >
            RESET DATABASE
          </Box>

          <TextField
            fullWidth
            autoFocus
            label="عبارة التأكيد"
            value={resetConfirmationText}
            onChange={(event) =>
              setResetConfirmationText(event.target.value)
            }
            sx={textFieldSx}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setResetConfirmOpen(false)
              setResetConfirmationText('')
            }}
            sx={{ color: '#CBD5E1' }}
          >
            تراجع
          </Button>
          <Button
            variant="contained"
            disabled={
              resetConfirmationText.trim() !== 'RESET DATABASE'
            }
            onClick={() => {
              void performResetDatabase()
            }}
            sx={{
              minHeight: 42,
              color: '#FFFFFF !important',
              background: dangerColor,
              fontWeight: 850,
              '&:hover': {
                background: dangerColor,
              },
              '&.Mui-disabled': {
                color: 'rgba(255,255,255,.38) !important',
                background: dangerColor,
              },
            }}
          >
            حذف جميع البيانات
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
