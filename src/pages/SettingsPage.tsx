import { Box, Button, FormControl, Grid, InputLabel, MenuItem, Paper, Select, TextField, Typography } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { useRef, useState } from 'react'
import { SectionCard } from '../components/ui/SectionCard'
import { useThemeSettings } from '../contexts/ThemeContext'
import { loadCompanyPrintSettings, saveCompanyPrintSettings } from '../services/companyPrintSettingsService'
import type { CompanyPrintSettings } from '../types/invoicePrint'

export function SettingsPage() {
  const { mode, primaryColor, sidebarStyle, borderRadius, fontSize, setMode, setPrimaryColor, setSidebarStyle, setBorderRadius, setFontSize } = useThemeSettings()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [companySettings, setCompanySettings] = useState<CompanyPrintSettings>(() => loadCompanyPrintSettings())

  const handleChange = (setter: (value: any) => void) => (event: SelectChangeEvent) => setter(event.target.value)
  const handleCompanyFieldChange = (field: keyof CompanyPrintSettings) => (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setCompanySettings((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCompanySettings((current) => ({ ...current, logoDataUrl: reader.result as string }))
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const handleSaveCompanySettings = () => {
    const saved = saveCompanyPrintSettings(companySettings)
    setCompanySettings(saved)
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="السمات العامة" subtitle="تخصيص تجربة CRAFT">
            <Paper sx={{ p: 3, display: 'grid', gap: 2, background: '#F8FAFC', borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.06)' }}>
              <FormControl fullWidth>
                <InputLabel id="theme-mode-label">وضع السمة</InputLabel>
                <Select labelId="theme-mode-label" value={mode} label="وضع السمة" onChange={handleChange(setMode)}>
                  <MenuItem value="light">فاتح</MenuItem>
                  <MenuItem value="dark">داكن</MenuItem>
                  <MenuItem value="system">النظام</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="primary-color-label">اللون الأساسي</InputLabel>
                <Select labelId="primary-color-label" value={primaryColor} label="اللون الأساسي" onChange={handleChange(setPrimaryColor)}>
                  <MenuItem value="blue">أزرق ملكي</MenuItem>
                  <MenuItem value="cyan">فيجيتال</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="sidebar-style-label">نمط الشريط الجانبي</InputLabel>
                <Select labelId="sidebar-style-label" value={sidebarStyle} label="نمط الشريط الجانبي" onChange={handleChange(setSidebarStyle)}>
                  <MenuItem value="glass">زجاجي</MenuItem>
                  <MenuItem value="solid">صلب</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="border-radius-label">نمط الزوايا</InputLabel>
                <Select labelId="border-radius-label" value={borderRadius} label="نمط الزوايا" onChange={handleChange(setBorderRadius)}>
                  <MenuItem value="small">صغير</MenuItem>
                  <MenuItem value="medium">وسط</MenuItem>
                  <MenuItem value="large">كبير</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="font-size-label">حجم الخط</InputLabel>
                <Select labelId="font-size-label" value={fontSize} label="حجم الخط" onChange={handleChange(setFontSize)}>
                  <MenuItem value="small">صغير</MenuItem>
                  <MenuItem value="medium">وسط</MenuItem>
                  <MenuItem value="large">كبير</MenuItem>
                </Select>
              </FormControl>
            </Paper>
          </SectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <SectionCard title="إعدادات الشركة للطباعة" subtitle="حفظ شعار الشركة والبيانات المستخدمة في جميع الفواتير">
            <Paper sx={{ p: 3, display: 'grid', gap: 2, background: '#F8FAFC', borderRadius: 3, border: '1px solid rgba(15, 23, 42, 0.06)' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: 2,
                    overflow: 'hidden',
                    background: 'rgba(148, 163, 184, 0.12)',
                    border: '1px solid rgba(15, 23, 42, 0.12)',
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  {companySettings.logoDataUrl ? (
                    <Box component="img" src={companySettings.logoDataUrl} alt="شعار الشركة" sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Typography sx={{ fontSize: 12, color: '#64748B', fontWeight: 700 }}>الشعار</Typography>
                  )}
                </Box>
                <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>رفع شعار الشركة</Button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
              </Box>

              <TextField fullWidth label="اسم الشركة" value={companySettings.companyName} onChange={handleCompanyFieldChange('companyName')} />
              <TextField fullWidth label="عنوان الشركة" value={companySettings.address} onChange={handleCompanyFieldChange('address')} />
              <TextField fullWidth label="الهاتف" value={companySettings.phone} onChange={handleCompanyFieldChange('phone')} />
              <TextField fullWidth label="البريد الإلكتروني" value={companySettings.email} onChange={handleCompanyFieldChange('email')} />
              <TextField fullWidth label="الرقم الضريبي" value={companySettings.taxNumber ?? ''} onChange={handleCompanyFieldChange('taxNumber')} />

              <Button variant="contained" onClick={handleSaveCompanySettings} sx={{ justifySelf: 'flex-end' }}>حفظ إعدادات الطباعة</Button>
            </Paper>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  )
}
