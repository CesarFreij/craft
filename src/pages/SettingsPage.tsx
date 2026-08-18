import { Box, FormControl, Grid, InputLabel, MenuItem, Paper, Select } from '@mui/material'
import type { SelectChangeEvent } from '@mui/material/Select'
import { SectionCard } from '../components/ui/SectionCard'
import { useThemeSettings } from '../contexts/ThemeContext'

export function SettingsPage() {
  const { mode, primaryColor, sidebarStyle, borderRadius, fontSize, setMode, setPrimaryColor, setSidebarStyle, setBorderRadius, setFontSize } = useThemeSettings()

  const handleChange = (setter: (value: any) => void) => (event: SelectChangeEvent) => setter(event.target.value)

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
          <SectionCard title="الوصول السريع" subtitle="روابط مفيدة للإدارة">
            <Box sx={{ minHeight: 240, display: 'grid', placeItems: 'center', color: '#64748B' }}>
              التحكم في السمات الآن متاح للتجربة المباشرة.
            </Box>
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  )
}
