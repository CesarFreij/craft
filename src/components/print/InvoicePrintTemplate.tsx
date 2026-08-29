import { Box, Typography } from '@mui/material'
import { InvoiceDetailsTable } from './InvoiceDetailsTable'
import { formatCurrencyValue } from '../../utils/displayFormatting'
import type { CompanyPrintSettings, InvoicePrintData } from '../../types/invoicePrint'

type InvoicePrintDataWithDiscount = InvoicePrintData & {
  discountType?: 'none' | 'percentage' | 'fixed'
  discountValue?: number
}

interface InvoicePrintTemplateProps {
  data: InvoicePrintDataWithDiscount
  settings: CompanyPrintSettings
}

function formatMoney(value: number | undefined): string {
  return formatCurrencyValue(value ?? 0, 'price')
}

function formatPercentage(value: number | undefined): string {
  const numericValue = Number(value ?? 0)
  if (!Number.isFinite(numericValue)) {
    return '0%'
  }

  const normalizedValue = Number.isInteger(numericValue)
    ? String(numericValue)
    : numericValue.toFixed(2).replace(/\.?0+$/, '')

  return `${normalizedValue}%`
}

export function InvoicePrintTemplate({ data, settings }: InvoicePrintTemplateProps) {
  const hasLogo = Boolean(settings.logoDataUrl?.trim())
  const companyName = settings.companyName?.trim() ?? ''
  const companyAddress = settings.address?.trim() ?? ''
  const companyPhone = settings.phone?.trim() ?? ''
  const companyEmail = settings.email?.trim() ?? ''
  const companyTaxNumber = settings.taxNumber?.trim() ?? ''
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
              width: 350,
              height: 200,
              objectFit: 'contain',
              display: 'block',
              position: 'absolute',
              right: '12mm',
              objectPosition: 'right',
            }}
          />
        ) : null}
      </Box>

      {/* رأس الفاتورة: اسم الشركة ثم عنوان الفاتورة ثم جميع البيانات */}
      <Box
        sx={{
          mb: 3,
          pb: 2,
          borderBottom: '1px solid rgba(15,23,42,0.12)',
        }}
      >
        {companyName ? (
          <Typography
            sx={{
              fontSize: 30,
              fontWeight: 800,
              lineHeight: 1.2,
              color: '#0F172A',
            }}
          >
            {companyName}
          </Typography>
        ) : null}

        <Typography
          sx={{
            fontSize: 25,
            fontWeight: 800,
            color: '#0F172A',
            mt: companyName ? 1 : 0,
          }}
        >
          {data.title}
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gap: 0.35,
            color: '#334155',
          }}
        >
          {companyAddress ? (
            <Typography sx={{ fontSize: 13, color: '#334155' }}>
              <b>العنوان:</b> {companyAddress}
            </Typography>
          ) : null}

          {companyPhone ? (
            <Typography sx={{ fontSize: 13, color: '#334155' }}>
              <b>الهاتف:</b> {companyPhone}
            </Typography>
          ) : null}

          {companyEmail ? (
            <Typography sx={{ fontSize: 13, color: '#334155' }}>
              <b>البريد الإلكتروني:</b>{' '}
              <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>
                {companyEmail}
              </Box>
            </Typography>
          ) : null}

          {companyTaxNumber ? (
            <Typography sx={{ fontSize: 13, color: '#334155' }}>
              <b>الرقم الضريبي:</b> {companyTaxNumber}
            </Typography>
          ) : null}

          <Typography sx={{ fontSize: 13, color: '#334155' }}>
            <b>رقم المستند:</b> {data.documentNumber || '—'}
          </Typography>

          <Typography sx={{ fontSize: 13, color: '#334155' }}>
            <b>التاريخ:</b> {data.date || '—'}
          </Typography>

          <Typography sx={{ fontSize: 13, color: '#334155' }}>
            <b>{data.partyLabel}:</b> {data.partyName || '—'}
          </Typography>

          {hasReference ? (
            <Typography sx={{ fontSize: 13, color: '#334155' }}>
              <b>{data.referenceLabel}:</b> {data.referenceValue}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* جدول التفاصيل */}
      <Box sx={{ width: '100%' }}>
        <InvoiceDetailsTable
          items={data.items}
          productionMode={Boolean(data.productionMode)}
        />
      </Box>

      {data.notes?.trim() ? (
        <Box
          className="invoice-document-notes"
          sx={{
            mt: 2,
            border: '1px solid rgba(15, 23, 42, 0.12)',
            borderRadius: 2,
            background: 'rgba(15, 23, 42, 0.02)',
            p: 1.5,
          }}
        >
          <Typography sx={{ fontWeight: 700, color: '#0F172A', mb: 0.5, fontSize: 12.5 }}>
            ملاحظات
          </Typography>
          <Typography sx={{ color: '#475569', fontSize: 12.5 }}>
            {data.notes}
          </Typography>
        </Box>
      ) : null}

      {/* الأسفل: الدفع + المجموع */}
      <Box
        className="invoice-summary"
        sx={{
          mt: 4,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-end',
          direction: 'ltr',
          gap: 3,
        }}
      >
        {/* المجموع */}
        <Box
          sx={{
            width: 280,
            minWidth: 250,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 0.75,
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              طريقة الدفع:
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
              }}
            >
              {data.paymentMethod || '—'}
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 0.75,
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              المجموع:
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                direction: 'ltr',
              }}
            >
              {formatMoney(data.subtotal)}
            </Typography>
          </Box>

          {data.discountType === 'percentage' ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                py: 0.75,
              }}
            >
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                نسبة الحسم:
              </Typography>

              <Typography
                sx={{
                  fontSize: 13,
                  direction: 'ltr',
                }}
              >
                {formatPercentage(data.discountValue)}
              </Typography>
            </Box>
          ) : null}

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              py: 0.75,
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              قيمة الحسم:
            </Typography>

            <Typography
              sx={{
                fontSize: 13,
                direction: 'ltr',
              }}
            >
              {formatMoney(data.discount)}
            </Typography>
          </Box>

          <Box
            sx={{
              mt: 1,
              pt: 1.5,
              borderTop: '1px solid rgba(15,23,42,0.15)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
              }}
            >
              الإجمالي النهائي:
            </Typography>

            <Typography
              sx={{
                fontSize: 15,
                fontWeight: 800,
                direction: 'ltr',
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
