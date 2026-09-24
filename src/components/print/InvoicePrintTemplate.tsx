import { Box, Typography } from '@mui/material'

import { InvoiceDetailsTable } from './InvoiceDetailsTable'
import { formatCurrencyValue, formatDateDMY, formatNumberBySettings } from '../../utils/displayFormatting'
import type {
  CompanyPrintSettings,
  InvoicePrintData,
  InvoicePrintItem,
} from '../../types/invoicePrint'

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

function priceNum(value: number | undefined): string {
  return formatNumberBySettings(Number(value ?? 0), 'price')
}

function formatQuantity(value: number | undefined): string {
  return formatNumberBySettings(value ?? 0, 'quantity')
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

function ReferenceInvoiceTable({ items }: { items: InvoicePrintItem[] }) {
  return (
    <Box
      component="table"
      dir="rtl"
      sx={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        color: '#111827',
        '& th, & td': {
          border: '1px solid #BFC5CC',
          px: 0.75,
          py: 0.72,
          fontSize: 12.5,
          lineHeight: 1.35,
          verticalAlign: 'middle',
          textAlign: 'center',
        },
        '& th': {
          fontWeight: 800,
          background: '#FFFFFF',
          color: '#111827',
          whiteSpace: 'nowrap',
        },
        '& td': {
          fontWeight: 500,
          background: '#FFFFFF',
          textAlignLast: 'center',
        },
      }}
    >
      <Box component="colgroup">
        <Box component="col" sx={{ width: '7%' }} />
        <Box component="col" sx={{ width: '14%' }} />
        <Box component="col" sx={{ width: '36%' }} />
        <Box component="col" sx={{ width: '10%' }} />
        <Box component="col" sx={{ width: '16.5%' }} />
        <Box component="col" sx={{ width: '16.5%' }} />
      </Box>

      <Box component="thead">
        <Box component="tr">
          <Box component="th">الرقم</Box>
          <Box component="th">رقم المادة</Box>
          <Box component="th">الصنف</Box>
          <Box component="th">الكمية</Box>
          <Box component="th">سعر الوحدة</Box>
          <Box component="th">الصافي</Box>
        </Box>
      </Box>

      <Box component="tbody">
        {items.map((item, index) => {
          const lineTotal = Number(
            item.total ?? Number(item.quantity ?? 0) * Number(item.price ?? 0),
          )

          return (
            <Box component="tr" key={item.id ?? `${item.code ?? 'item'}-${index}`}>
              <Box component="td">{index + 1}</Box>

              <Box component="td">
                {item.code?.trim() || '—'}
              </Box>

              <Box
                component="td"
                sx={{
                  textAlign: 'right !important',
                  px: '8px !important',
                }}
              >
                {item.name || '—'}
              </Box>

              <Box component="td">{formatQuantity(item.quantity)}</Box>

              <Box component="td" sx={{ direction: 'ltr' }}>
                {priceNum(item.price)}
              </Box>

              <Box component="td" sx={{ direction: 'ltr' }}>
                {priceNum(lineTotal)}
              </Box>
            </Box>
          )
        })}
      </Box>
    </Box>
  )
}

function ValueRow({
  label,
  value,
  bold = false,
  bordered = true,
}: {
  label: string
  value: string
  bold?: boolean
  bordered?: boolean
}) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: '46% 54%',
        minHeight: 31,
        ...(bordered
          ? {
              border: '1px solid #C7CCD2',
              borderTop: 0,
            }
          : {}),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 0.75,
          fontSize: 12.5,
          fontWeight: bold ? 900 : 800,
          direction: 'ltr',
          textAlign: 'right',
        }}
      >
        {label}
      </Box>

      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          px: 0.75,
          fontSize: 12.5,
          fontWeight: bold ? 900 : 700,
          // justifyContent: 'right',
          fontVariantNumeric: 'tabular-nums',
          borderLeft: bordered ? '1px solid #C7CCD2' : 0,
        }}
      >
        {value}
      </Box>
    </Box>
  )
}

export function InvoicePrintTemplate({
  data,
  settings,
}: InvoicePrintTemplateProps) {
  const hasLogo = Boolean(settings.logoDataUrl?.trim())
  const companyName = settings.companyName?.trim() ?? ''
  const companyAddress = settings.address?.trim() ?? ''
  const companyPhone = settings.phone?.trim() ?? ''
  const companyEmail = settings.email?.trim() ?? ''
  const companyTaxNumber = settings.taxNumber?.trim() ?? ''
  const partyDisplay = [data.partyName?.trim(), (data.partyPhone || data.partyNumber)?.trim()]
    .filter(Boolean)
    .join(' / ') || '—'
  const referenceValue = data.referenceValue?.trim() ?? ''
  const hasReference = Boolean(
    data.referenceLabel?.trim() &&
    referenceValue &&
    referenceValue !== '—',
  )
  const isReturnDocument = String(data.documentType).includes('return')
  const isSalesOrPurchase =
    data.documentType === 'sales' || data.documentType === 'purchase'
  const additionalFees = Number(data.additionalFees ?? 0)
  const paidAmount = Number(data.paidAmount ?? 0)
  const paymentRows = (data.paymentMethod ?? '—')
    .split('\n')
    .map((line) => {
      const [method, amount] = line.split('\t')
      return {
        method: method?.trim() || '—',
        amount: amount?.trim() || '',
      }
    })
  const netAmountWithoutAdditionalFees =
    Number(data.total ?? 0) - additionalFees
  const remainingAmount = isSalesOrPurchase
    ? Math.max(0, netAmountWithoutAdditionalFees - paidAmount)
    : Number(
        data.remainingAmount ??
          Math.max(0, Number(data.total ?? 0) - paidAmount),
      )

  return (
    <Box
      dir="rtl"
      className="craft-print-visible"
      sx={{
        width: '100%',
        minHeight: '297mm',
        background: '#FFFFFF',
        color: '#111827',
        boxSizing: 'border-box',
        padding: '12mm 12mm 14mm',
        fontFamily: 'Tajawal, Tahoma, Arial, sans-serif',
        '@media print': {
          background: '#FFFFFF !important',
          boxShadow: 'none !important',
          border: 'none !important',
          padding: '12mm 12mm 14mm',
        },
        '@page': {
          size: 'A4',
          margin: 0,
        },
      }}
    >
      {/* أعلى الفاتورة: الشعار يسار وبيانات الشركة يمين */}
      <Box
        sx={{
          display: 'flex',
          direction: 'rtl',
          justifyContent: 'space-between',
          alignItems: 'stretch',
          gap: 4,
          mb: 1.6,
        }}
      >
        <Box
          sx={{
            width: 210,
            position: 'relative',
            alignSelf: 'stretch',
            flexShrink: 0,
          }}
        >
          {hasLogo ? (
            <Box
              component="img"
              src={settings.logoDataUrl}
              alt="شعار الشركة"
              sx={{
                display: 'block',
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                objectPosition: 'right center',
              }}
            />
          ) : null}
        </Box>

        <Box
          dir="rtl"
          sx={{
            flex: 1,
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: 20,
              lineHeight: 1.2,
              fontWeight: 900,
              color: '#111827',
              mb: 1,
            }}
          >
            {data.title || 'فاتورة'}
          </Typography>

          {companyName ? (
            <Typography
              sx={{
                fontSize: 18,
                lineHeight: 1.35,
                fontWeight: 900,
                color: '#111827',
                mb: 0.6,
              }}
            >
              {companyName}
            </Typography>
          ) : null}

          <Box sx={{ display: 'grid', gap: 0.35 }}>
            {companyAddress ? (
              <Typography
                sx={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: '#111827',
                  whiteSpace: 'pre-line',
                }}
              >
                {companyAddress}
              </Typography>
            ) : null}

            {companyPhone ? (
              <Typography sx={{ fontSize: 12.5, color: '#111827' }}>
                موبايل :{' '}
                <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>
                  {companyPhone}
                </Box>
              </Typography>
            ) : null}

            {companyEmail ? (
              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                <Box component="span" dir="ltr" sx={{ unicodeBidi: 'embed' }}>
                  {companyEmail}
                </Box>
              </Typography>
            ) : null}

            {companyTaxNumber ? (
              <Typography sx={{ fontSize: 12, color: '#475569' }}>
                الرقم الضريبي:{' '}
                <Box
                  component="span"
                  dir="ltr"
                  sx={{ unicodeBidi: 'isolate' }}
                >
                  {companyTaxNumber}
                </Box>
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>

      <Box
        sx={{
          borderTop: '1px solid #D4D7DB',
          pt: 1.7,
          mb: 2.1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          direction: 'rtl',
          columnGap: 6,
        }}
      >
        {/* معلومات الفاتورة - اليسار */}
        <Box
          dir="rtl"
          sx={{
            display: 'grid',
            gap: 0.55,
            alignContent: 'start',
            fontSize: 12.5,
          }}
        >
          <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1 }}>
            <Box sx={{ fontWeight: 800 }}>{isReturnDocument ? 'رقم المرتجع:' : 'فاتورة:'}</Box>
            <Box dir="rtl">
              {data.documentNumber || '—'}
            </Box>
          </Box>

          {isReturnDocument && hasReference ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1 }}>
              <Box sx={{ fontWeight: 800 }}>{data.referenceLabel}:</Box>
              <Box dir="rtl">{referenceValue}</Box>
            </Box>
          ) : null}

          <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1 }}>
            <Box sx={{ fontWeight: 800 }}>التاريخ:</Box>
            <Box dir="rtl">
              {formatDateDMY(data.date) || '—'}
            </Box>
          </Box>

          {data.documentType === 'sales' && (data.delegateNames ?? []).length > 0 ? (
            <Box sx={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 1 }}>
              <Box sx={{ fontWeight: 800 }}>المندوب:</Box>
              {(data.delegateNames ?? []).map((delegateName, index) => (
                <Box key={`${delegateName}-${index}`}>
                  {delegateName}
                </Box>
              ))}
            </Box>
          ) : null}

        </Box>

        {/* العميل / المورد - اليمين */}
        <Box
          dir="rtl"
          sx={{
            alignContent: 'start',
          }}
        >
          <Typography
            sx={{
              fontWeight: 800,
            }}
          >
            اسم {data.partyLabel}
          </Typography>

          <Typography
            sx={{
              fontSize: 13.5,
              color: '#111827',
            }}
          >
            {partyDisplay}
          </Typography>

          {hasReference && !isReturnDocument ? (
            <Typography sx={{ mt: 0.65, fontSize: 11.5, color: '#475569' }}>
              <b>{data.referenceLabel}:</b> {data.referenceValue}
            </Typography>
          ) : null}

        </Box>
      </Box>

      {/* جدول البنود */}
      <Box sx={{ width: '100%' }}>
        {data.productionMode ? (
          <InvoiceDetailsTable items={data.items} productionMode />
        ) : (
          <ReferenceInvoiceTable items={data.items} />
        )}
      </Box>

      {/* ملاحظات + إجماليات ودفع */}
      <Box
        className="invoice-summary"
        sx={{
          mt: 1.6,
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 310px',
          direction: 'ltr',
          gap: 5,
          alignItems: 'start',
        }}
      >
        <Box>
          {data.notes?.trim() ? (
            <Box
              className="invoice-document-notes"
              sx={{
                maxWidth: 430,
                pt: 0.7,
              }}
            >
              <Typography
                sx={{
                  fontWeight: 900,
                  color: '#111827',
                  mb: 0.5,
                  fontSize: 12.5,
                }}
              >
                ملاحظات:
              </Typography>

              <Typography
                sx={{
                  color: '#475569',
                  fontSize: 12,
                  lineHeight: 1.65,
                  whiteSpace: 'pre-line',
                }}
              >
                {data.notes}
              </Typography>
            </Box>
          ) : null}
        </Box>

        {/* الصندوق موجود يسار الصفحة مثل المرجع */}
        <Box dir="ltr" sx={{ direction: 'ltr' }}>
          <Box sx={{ borderTop: '1px solid #C7CCD2' }}>
            <Box sx={{ direction: 'ltr' }}>
            <ValueRow label="الإجمالي" value={formatMoney(data.subtotal)} />
</Box>
            {Number(data.discount ?? 0) !== 0 ? (
              <ValueRow
              label={
                data.discountType === 'percentage'
                ? `خصم (${formatPercentage(data.discountValue)})`
                : 'خصم'
              }
              value={`${formatMoney(data.discount)}`}
              />
            ) : null}

            {!isSalesOrPurchase && additionalFees !== 0 ? (
              <ValueRow
                label="رسوم إضافية"
                value={formatMoney(additionalFees)}
              />
            ) : null}
          </Box>

          <Box
            sx={{
              borderTop: '1px dashed #B7BBC0',
              mt: 1.25,
              pt: 1.15,
            }}
          >
            <Box sx={{ borderTop: '1px solid #C7CCD2' }}>
              <ValueRow
                label="الصافي"
                value={formatMoney(netAmountWithoutAdditionalFees)}
                bold
              />
            </Box>
          </Box>

          <Box sx={{ mt: 1.55 }}>
            {paidAmount > 0 ? (
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 900,
                  color: '#111827',
                  mb: 0.8,
                }}
              >
                طريقة الدفع:
              </Typography>
            ) : null}

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: '46% 54%',
                rowGap: 0.7,
                fontSize: 12.5,
              }}
            >
              {paidAmount > 0
                ? paymentRows.map((payment, index) => (
                    <Box
                      key={`${payment.method}-${index}`}
                      sx={{ display: 'contents' }}
                    >
                      <Box sx={{ fontWeight: 900 }}>
                        {payment.method}:
                      </Box>
                      <Box
                        dir="rtl"
                        sx={{
                          fontWeight: 900,
                          justifyContent: 'end',
                          // textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        {payment.amount || formatMoney(paidAmount)}
                      </Box>
                    </Box>
                  ))
                : null}

              <Box sx={{ fontWeight: 900 }}>القيمة المدفوعة :</Box>
              <Box
                dir="rtl"
                sx={{
                  fontWeight: 900,
                  justifyContent: 'end',
                  // textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(paidAmount)}
              </Box>

              <Box sx={{ fontWeight: 900 }}>القيمة المستحقة :</Box>
              <Box
                dir="rtl"
                sx={{
                  fontWeight: 900,
                  justifyContent: 'end',
                  // textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {formatMoney(remainingAmount)}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
