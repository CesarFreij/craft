import { Box, Typography } from '@mui/material'
import type { CompanyPrintSettings } from '../../types/invoicePrint'

interface InvoiceHeaderProps {
  settings: CompanyPrintSettings
  title: string
  documentNumber: string
  documentDate: string
  partyLabel: string
  partyName: string
  referenceLabel?: string
  referenceValue?: string
}

export function InvoiceHeader({
  settings,
  title,
  documentNumber,
  documentDate,
  partyLabel,
  partyName,
  referenceLabel,
  referenceValue,
}: InvoiceHeaderProps) {
  const hasLogo = Boolean(settings.logoDataUrl?.trim())

  return (
    <Box
      dir="rtl"
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        pb: 2,
        mb: 2,
        borderBottom: '1px solid rgba(15,23,42,0.12)',
      }}
    >

      {/* الشعار - يمين */}
      <Box
        sx={{
          width: 130,
          height: 130,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasLogo ? (
          <Box
            component="img"
            src={settings.logoDataUrl}
            alt="شعار الشركة"
            sx={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
            }}
          />
        ) : (
          <Typography sx={{fontSize:12,color:'#64748b'}}>
            شعار الشركة
          </Typography>
        )}
      </Box>


      {/* بيانات الشركة */}
      <Box
        sx={{
          flex: 1,
          textAlign: 'right',
          pt: 0.5,
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.1,
            color:'#0f172a',
          }}
        >
          {settings.companyName || 'اسم الشركة'}
        </Typography>


        <Typography
          sx={{
            mt: 0.8,
            fontSize:14,
            color:'#475569',
          }}
        >
          {settings.address || 'عنوان الشركة'}
        </Typography>


        <Box
          sx={{
            display:'flex',
            gap:2,
            flexWrap:'wrap',
            mt:0.8,
            fontSize:13,
            color:'#475569'
          }}
        >
          {settings.phone && <span>{settings.phone}</span>}
          {settings.email && <span>{settings.email}</span>}
          {settings.taxNumber &&
            <span>الرقم الضريبي: {settings.taxNumber}</span>
          }
        </Box>
      </Box>


      {/* معلومات الفاتورة - يسار */}
      <Box
        sx={{
          width:240,
          flexShrink:0,
          textAlign:'right',
          pt:1,
        }}
      >

        <Typography
          sx={{
            fontSize:24,
            fontWeight:800,
            mb:1,
            color:'#0f172a'
          }}
        >
          {title}
        </Typography>


        <Box sx={{fontSize:13,color:'#334155',display:'grid',gap:.5}}>
          <div>
            <b>رقم المستند:</b> {documentNumber || '—'}
          </div>

          <div>
            <b>التاريخ:</b> {documentDate || '—'}
          </div>

          <div>
            <b>{partyLabel}:</b> {partyName || '—'}
          </div>


          {referenceLabel && referenceValue &&
            <div>
              <b>{referenceLabel}:</b> {referenceValue}
            </div>
          }

        </Box>

      </Box>

    </Box>
  )
}