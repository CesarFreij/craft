import { Box, Typography } from '@mui/material'
import { InvoiceDetailsTable } from './InvoiceDetailsTable'
import type { CompanyPrintSettings, InvoicePrintData } from '../../types/invoicePrint'

interface InvoicePrintTemplateProps {
  data: InvoicePrintData
  settings: CompanyPrintSettings
}

function formatMoney(value: number | undefined): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function InvoicePrintTemplate({ data, settings }: InvoicePrintTemplateProps) {
  const hasLogo = Boolean(settings.logoDataUrl?.trim())
  const hasReference = Boolean(data.referenceLabel && data.referenceValue)

  return (
    <Box
      dir="rtl"
      className="craft-print-visible"
      sx={{
        width: '100%',
        minHeight: '297mm',
        background: '#fff',
        color: '#0F172A',
        boxSizing: 'border-box',
        padding: '10mm 12mm',
        fontFamily: 'Tahoma, Arial, sans-serif',

        '@media print': {
          background: '#fff !important',
          boxShadow: 'none !important',
          border: 'none !important',
          padding: '10mm 12mm',
        },

        '@page': {
          size: 'A4',
          margin: 0,
        },
      }}
    >

      {/* الشعار مستقل */}
      <Box
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'flex-start',
          mb: 1,
        }}
      >
        {hasLogo ? (
          <Box
            component="img"
            src={settings.logoDataUrl}
            alt="شعار الشركة"
            sx={{
              width: 210,
              height: 210,
              objectFit: 'contain',
              display: 'block',
              position: 'absolute',
              right: '12mm'
            }}
          />
        ) : null}
      </Box>


      {/* معلومات الشركة مستقلة تحت الشعار */}
      <Box
        sx={{
          mb: 3,
          textAlign: 'left',
        }}
      >

        <Typography
          sx={{
            fontSize: 30,
            fontWeight: 800,
            lineHeight: 1.2,
            color: '#0F172A',
          }}
        >
          {settings.companyName || 'اسم الشركة'}
        </Typography>


        {settings.address && (
          <Typography
            sx={{
              mt: 0.5,
              fontSize: 14,
              color: '#475569',
            }}
          >
            {settings.address}
          </Typography>
        )}


        <Box
          sx={{
            mt: 1,
            display: 'flex',
            gap: 2,
            flexWrap: 'wrap',
            fontSize: 13,
            color: '#475569',
          }}
        >

          {settings.phone && (
            <Typography sx={{ fontSize: 13 }}>
              {settings.phone}
            </Typography>
          )}

          {settings.email && (
            <Typography
              sx={{ direction:'ltr', fontSize: 13 }}
            >
              {settings.email}
            </Typography>
          )}

          {settings.taxNumber && (
            <Typography sx={{ fontSize: 13 }}>
              الرقم الضريبي: {settings.taxNumber}
            </Typography>
          )}

        </Box>

      </Box>


      {/* معلومات الفاتورة */}
      <Box
        sx={{
          borderBottom:'1px solid rgba(15,23,42,0.12)',
          pb:2,
          mb:3,
          display:'flex',
          justifyContent:'space-between',
          alignItems:'flex-start',
        }}
      >

        <Box>

          <Typography
            sx={{
              fontSize:25,
              fontWeight:800,
              mb:1,
            }}
          >
            {data.title}
          </Typography>


          <Typography sx={{ fontSize: 13 }}>
            <b>رقم المستند:</b> {data.documentNumber || '—'}
          </Typography>


          <Typography sx={{ fontSize: 13 }}>
            <b>التاريخ:</b> {data.date || '—'}
          </Typography>


          <Typography sx={{ fontSize: 13 }}>
            <b>{data.partyLabel}:</b> {data.partyName || '—'}
          </Typography>


          {hasReference && (
            <Typography sx={{ fontSize: 13 }}>
              <b>{data.referenceLabel}:</b> {data.referenceValue}
            </Typography>
          )}


          {data.warehouseName && (
            <Typography sx={{ fontSize: 13 }}>
              <b>المخزن:</b> {data.warehouseName}
            </Typography>
          )}

        </Box>

      </Box>
            {/* جدول التفاصيل */}
      <Box sx={{ width:'100%' }}>
        <InvoiceDetailsTable
          items={data.items}
          productionMode={Boolean(data.productionMode)}
        />
      </Box>


      {/* الأسفل: الدفع + المجموع */}
      <Box
        sx={{
          mt:4,
          display:'flex',
          justifyContent:'flex-end',
          alignItems:'flex-end',
          direction:'ltr',
          gap:3,
        }}
      >


        {/* الملاحظات وطريقة الدفع */}



        {/* المجموع */}
        <Box
          sx={{
            width:280,
            minWidth:250,
          }}
        >


          <Box
            sx={{
              display:'flex',
              justifyContent:'space-between',
              py:0.75,
            }}
          >

            <Typography
              sx={{
                fontSize:13,
                fontWeight:700,
              }}
            >
              طريقة الدفع:
            </Typography>

            <Typography
              sx={{
                fontSize:13,
              }}
            >
              لاحقاً
            </Typography>

          </Box>


          <Box
            sx={{
              display:'flex',
              justifyContent:'space-between',
              py:0.75,
            }}
          >

            <Typography
              sx={{
                fontSize:13,
                fontWeight:700,
              }}
            >
              المجموع:
            </Typography>


            <Typography
              sx={{
                fontSize:13,
                direction:'ltr',
              }}
            >
              {formatMoney(data.subtotal)}
            </Typography>

          </Box>



          <Box
            sx={{
              display:'flex',
              justifyContent:'space-between',
              py:0.75,
            }}
          >

            <Typography
              sx={{
                fontSize:13,
                fontWeight:700,
              }}
            >
              الخصم:
            </Typography>


            <Typography
              sx={{
                fontSize:13,
                direction:'ltr',
              }}
            >
              {formatMoney(data.discount)}
            </Typography>

          </Box>



          <Box
            sx={{
              mt:1,
              pt:1.5,
              borderTop:'1px solid rgba(15,23,42,0.15)',
              display:'flex',
              justifyContent:'space-between',
            }}
          >

            <Typography
              sx={{
                fontSize:15,
                fontWeight:800,
              }}
            >
              الإجمالي النهائي:
            </Typography>


            <Typography
              sx={{
                fontSize:15,
                fontWeight:800,
                direction:'ltr',
              }}
            >
              {formatMoney(data.total)}
            </Typography>


          </Box>


        </Box>


      </Box>


    </Box>
  )
}