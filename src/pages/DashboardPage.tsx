import { Box, Grid, Typography } from '@mui/material'
import { FiBox, FiDatabase, FiLayers, FiShoppingCart, FiShoppingBag, FiRefreshCcw } from 'react-icons/fi'
import { AnimatedButton } from '../components/ui/AnimatedButton'
import { DashboardCard } from '../components/ui/DashboardCard'
import { SectionCard } from '../components/ui/SectionCard'
import { StatisticCard } from '../components/ui/StatisticCard'

export function DashboardPage() {
  return (
    <Box>
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard
            title="عدد المواد"
            value="1,248"
            label="مجموع العناصر المسجلة في دليل المواد"
            gradient="linear-gradient(135deg, #1D4ED8, #06B6D4)"
            icon={<FiDatabase size={24} />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard
            title="عدد المخازن"
            value="18"
            label="المستودعات المفتوحة حالياً"
            gradient="linear-gradient(135deg, #2563EB, #0EA5E9)"
            icon={<FiBox size={24} />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard
            title="طلبات التصنيع"
            value="42"
            label="طلبات الإنتاج قيد الانتظار"
            gradient="linear-gradient(135deg, #06B6D4, #22D3EE)"
            icon={<FiLayers size={24} />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard
            title="فواتير المشتريات"
            value="152"
            label="الفواتير الصادرة خلال هذا الشهر"
            gradient="linear-gradient(135deg, #1D4ED8, #0EA5E9)"
            icon={<FiShoppingBag size={24} />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard
            title="فواتير المبيعات"
            value="98"
            label="الفواتير المكتملة في النظام"
            gradient="linear-gradient(135deg, #2563EB, #22D3EE)"
            icon={<FiShoppingCart size={24} />}
          />
        </Grid>
        <Grid item xs={12} md={6} lg={4}>
          <DashboardCard
            title="آخر مزامنة"
            value="قبل 4 دقائق"
            label="حالة تحديث البيانات الأخيرة"
            gradient="linear-gradient(135deg, #06B6D4, #1D4ED8)"
            icon={<FiRefreshCcw size={24} />}
          />
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} lg={7}>
          <SectionCard title="أنشطة حديثة" subtitle="أحدث التغييرات في النظام">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {[
                'تمت إضافة 12 عنصر جديد إلى المخزون',
                'تمت الموافقة على طلب تصنيع رقم 041',
                'تمت مراجعة فاتورة مشتريات المورد أ',
                'انخفض رصيد المادة B إلى مستوى التحذير',
              ].map((item) => (
                <Box key={item} sx={{ p: 2, borderRadius: 3, background: '#F8FAFC', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item}</Typography>
                </Box>
              ))}
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={5}>
          <SectionCard title="تنبيه انخفاض المخزون" subtitle="أصناف تحتاج لتزويد عاجل">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {['رأس برغي 10 مم', 'حشية مطاطية', 'لوح فولاذي', 'زيت تشحيم'].map((item) => (
                <Box key={item} sx={{ p: 2, borderRadius: 3, background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(37, 99, 235, 0.08))', border: '1px solid rgba(37, 99, 235, 0.12)' }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 14 }}>{item}</Typography>
                  <Typography sx={{ color: '#475569', fontSize: 13, mt: 0.5 }}>الرصيد 3 وحدات فقط</Typography>
                </Box>
              ))}
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="طلبات التصنيع المعلقة" subtitle="تشغيل الإنتاج القادم">
            <Box sx={{ display: 'grid', gap: 2 }}>
              {['طلب 041 - لوحة تحكم', 'طلب 042 - وحدة غيار', 'طلب 043 - حاوية تعبئة'].map((item) => (
                <Box key={item} sx={{ p: 2, borderRadius: 3, background: '#FFFFFF', border: '1px solid rgba(15, 23, 42, 0.06)' }}>
                  <Typography sx={{ fontWeight: 700 }}>{item}</Typography>
                  <Typography sx={{ color: '#64748B', fontSize: 13, mt: 0.5 }}>الموعد المتوقع: 24 أبريل</Typography>
                </Box>
              ))}
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="إجراءات سريعة" subtitle="أدوات الوصول المباشر">
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {['إنشاء فاتورة جديدة', 'طلب مورد جديد', 'بدء إنتاج', 'تصدير تقرير'].map((label) => (
                <AnimatedButton key={label} variant="contained" color="primary" fullWidth>{label}</AnimatedButton>
              ))}
            </Box>
          </SectionCard>
        </Grid>
        <Grid item xs={12} lg={4}>
          <SectionCard title="ملخص المخازن" subtitle="أداء السعة والتوافر">
            <StatisticCard title="المساحة المستخدمة" value="72%" subtitle="من إجمالي السعة" />
            <StatisticCard title="سعة الاستقبال" value="128" subtitle="طلبات جديدة ممكن استقبالها" />
          </SectionCard>
        </Grid>
      </Grid>
    </Box>
  )
}
