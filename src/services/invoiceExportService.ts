import { formatCurrencyValue, formatNumberBySettings } from '../utils/displayFormatting'
import type { CompanyPrintSettings, InvoicePrintData } from '../types/invoicePrint'

declare global {
  interface Window {
    craftExportAPI?: {
      exportInvoicePdf(payload: {
        invoiceData: InvoicePrintData
        settings: CompanyPrintSettings
        fileName?: string
      }): Promise<string>
    }
  }
}

function getExportAPI() {
  if (!window.craftExportAPI) {
    throw new Error('craftExportAPI is not available. Check preload or IPC setup.')
  }

  return window.craftExportAPI
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderItems(data: InvoicePrintData): string {
  const headers = data.productionMode
    ? ['المادة', 'الكمية المخططة', 'الكمية المصروفة', 'التكلفة']
    : ['#', 'رقم المادة', 'اسم المادة', 'الوحدة', 'الكمية', 'السعر', 'الإجمالي']

  const rows = data.items.length === 0
    ? `<tr><td colspan="${data.productionMode ? 4 : 7}" style="padding:16px;text-align:center;color:#64748b;">لا توجد عناصر.</td></tr>`
    : data.items.map((item, index) => {
        if (data.productionMode) {
          return `
            <tr>
              <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${escapeHtml(item.name)}</td>
              <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${formatNumberBySettings(item.plannedQuantity ?? 0, 'quantity')}</td>
              <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${formatNumberBySettings(item.actualQuantity ?? 0, 'quantity')}</td>
              <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${formatCurrencyValue(item.cost ?? item.total ?? 0, 'price')}</td>
            </tr>
          `
        }

        return `
          <tr>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${index + 1}</td>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${escapeHtml(item.code || '—')}</td>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:right;">${escapeHtml(item.name)}</td>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${escapeHtml(item.unit || '—')}</td>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${formatNumberBySettings(item.quantity ?? 0, 'quantity')}</td>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${formatCurrencyValue(item.price ?? 0, 'price')}</td>
            <td style="border:1px solid rgba(15,23,42,0.12);padding:10px;text-align:center;">${formatCurrencyValue(item.total ?? 0, 'price')}</td>
          </tr>
        `
      }).join('')

  return `
    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:rgba(15,23,42,0.04);">
          ${headers.map((header) => `<th style="border:1px solid rgba(15,23,42,0.12);padding:10px 8px;text-align:center;font-weight:700;color:#0f172a;">${header}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `
}

export function buildInvoiceExportHtml(data: InvoicePrintData, settings: CompanyPrintSettings): string {
  const hasLogo = Boolean(settings.logoDataUrl && settings.logoDataUrl.trim())
  const notesBlock = data.notes && data.notes.trim()
    ? `<div style="border:1px solid rgba(15,23,42,0.12);border-radius:10px;background:rgba(15,23,42,0.02);padding:16px;">
        <div style="font-weight:700;color:#0f172a;margin-bottom:6px;">ملاحظات</div>
        <div style="color:#475569;font-size:13px;">${escapeHtml(data.notes)}</div>
      </div>`
    : ''

  const referenceBlock = data.referenceLabel && data.referenceValue
    ? `<div><strong>${escapeHtml(data.referenceLabel)}:</strong> ${escapeHtml(String(data.referenceValue))}</div>`
    : ''

  return `
    <!doctype html>
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(data.title)}</title>
        <style>
          @page {
            size: A4;
            margin: 12mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            color: #0f172a;
            font-family: Tahoma, Arial, sans-serif;
            direction: rtl;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .page {
            width: 100%;
            min-height: 100%;
            box-sizing: border-box;
            background: #fff;
            padding: 20px 22px;
          }
          .brand-row {
            display: flex;
            flex-direction: row;
            direction: ltr;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-bottom: 18px;
          }
          .logo {
            width: 96px;
            height: 96px;
            overflow: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            background: transparent;
            border: none;
          }
          .logo img {
            width: 100%;
            height: 100%;
            object-fit: contain;
          }
          .company {
            flex: 1;
            direction: rtl;
            text-align: right;
            min-width: 0;
          }
          .company-name {
            font-size: 28px;
            font-weight: 800;
            color: #0f172a;
            line-height: 1.2;
            margin: 0;
          }
          .company-address {
            font-size: 14px;
            color: #475569;
            margin-top: 6px;
          }
          .company-meta {
            display: flex;
            justify-content: flex-start;
            flex-wrap: wrap;
            gap: 12px;
            margin-top: 8px;
            font-size: 13px;
            color: #475569;
          }
          .document-section {
            direction: rtl;
            display: flex;
            justify-content: flex-start;
            padding: 0 0 18px;
            margin-bottom: 18px;
            border-bottom: 1px solid rgba(15,23,42,0.12);
          }
          .doc-box {
            width: 340px;
            max-width: 100%;
            direction: rtl;
            text-align: right;
            padding: 0;
            margin: 0;
            border: none;
            border-radius: 0;
            background: transparent;
          }
          .doc-title {
            font-size: 25px;
            font-weight: 800;
            color: #0f172a;
            text-align: right;
            margin: 0 0 10px;
          }
          .doc-meta {
            display: grid;
            gap: 6px;
            font-size: 13px;
            color: #334155;
            text-align: right;
          }
          .content {
            display: grid;
            gap: 18px;
          }
          .summary {
            display: flex;
            direction: ltr;
            justify-content: space-between;
            align-items: flex-start;
            gap: 24px;
            margin-top: 18px;
          }
          .payment-area {
            direction: rtl;
            text-align: right;
            width: 260px;
            max-width: 100%;
            padding-top: 4px;
          }
          .payment-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
            margin-bottom: 6px;
          }
          .payment-value {
            font-size: 13px;
            color: #475569;
          }
          .notes-area {
            direction: rtl;
            text-align: right;
            margin-top: 14px;
          }
          .totals {
            direction: rtl;
            min-width: 280px;
            width: 280px;
            border: none;
            border-radius: 0;
            background: transparent;
            padding: 0;
          }
          .totals-row {
            display: flex;
            justify-content: space-between;
            gap: 24px;
            padding: 6px 0;
            color: #334155;
          }
          .totals-row.total {
            border-top: 1px solid rgba(15,23,42,0.14);
            padding-top: 12px;
            margin-top: 5px;
            color: #0f172a;
            font-weight: 800;
          }
          .totals-row span:first-child {
            font-weight: 700;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="brand-row">
            <div class="logo">
              ${hasLogo ? `<img src="${settings.logoDataUrl}" alt="شعار الشركة" />` : '<div style="font-weight:700;color:#94a3b8;font-size:12px;">شعار الشركة</div>'}
            </div>

            <div class="company">
              <p class="company-name">${escapeHtml(settings.companyName || 'اسم الشركة')}</p>
              <div class="company-address">${escapeHtml(settings.address || 'عنوان الشركة')}</div>
              <div class="company-meta">
                ${settings.phone ? `<div>${escapeHtml(settings.phone)}</div>` : ''}
                ${settings.email ? `<div>${escapeHtml(settings.email)}</div>` : ''}
                ${settings.taxNumber ? `<div>الرقم الضريبي: ${escapeHtml(settings.taxNumber)}</div>` : ''}
              </div>
            </div>
          </div>

          <div class="document-section">
            <div class="doc-box">
              <p class="doc-title">${escapeHtml(data.title)}</p>
              <div class="doc-meta">
                <div><strong>رقم المستند:</strong> ${escapeHtml(data.documentNumber || '—')}</div>
                <div><strong>التاريخ:</strong> ${escapeHtml(data.date || '—')}</div>
                <div><strong>${escapeHtml(data.partyLabel)}:</strong> ${escapeHtml(data.partyName || '—')}</div>
                ${referenceBlock}
              </div>
            </div>
          </div>

          <div class="content">
            ${renderItems(data)}
            <div class="summary">
              <div class="payment-area">
                <div class="payment-title">طريقة الدفع</div>
                <div class="payment-value">${escapeHtml(data.paymentMethod || '—')}</div>
                ${notesBlock ? `<div class="notes-area">${notesBlock}</div>` : ''}
              </div>

              <div class="totals">
                <div class="totals-row"><span>المجموع:</span><span>${formatCurrencyValue(data.subtotal, 'price')}</span></div>
                <div class="totals-row"><span>الخصم:</span><span>${formatCurrencyValue(data.discount, 'price')}</span></div>
                <div class="totals-row total"><span>الإجمالي النهائي:</span><span>${formatCurrencyValue(data.total, 'price')}</span></div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `
}

export function buildInvoiceCsv(data: InvoicePrintData): string {
  const headers = data.productionMode ? ['المادة', 'الكمية المخططة', 'الكمية المصروفة', 'التكلفة'] : ['الرقم', 'رقم المادة', 'اسم المادة', 'الوحدة', 'الكمية', 'السعر', 'الإجمالي']
  const rows = data.items.map((item, index) => {
    if (data.productionMode) {
      return [item.name, formatNumberBySettings(item.plannedQuantity ?? 0, 'quantity'), formatNumberBySettings(item.actualQuantity ?? 0, 'quantity'), formatCurrencyValue(item.cost ?? item.total ?? 0, 'price')].join(',')
    }

    return [index + 1, item.code ?? '', item.name, item.unit, formatNumberBySettings(item.quantity ?? 0, 'quantity'), formatCurrencyValue(item.price ?? 0, 'price'), formatCurrencyValue(item.total ?? 0, 'price')].join(',')
  })

  const summary = `\n"المجموع","${formatCurrencyValue(data.subtotal, 'price')}"\n"الخصم","${formatCurrencyValue(data.discount, 'price')}"\n"الإجمالي النهائي","${formatCurrencyValue(data.total, 'price')}"`
  return `"${data.title}","${data.documentNumber}"\n"التاريخ","${data.date}"\n"${data.partyLabel}","${data.partyName}"\n${headers.join(',')}\n${rows.join('\n')}${summary}`
}

export async function exportInvoicePdf(data: InvoicePrintData, settings: CompanyPrintSettings): Promise<string> {
  const fileName = `${(data.documentNumber || 'invoice').replace(/[^a-zA-Z0-9\-_]+/g, '_')}.pdf`
  return getExportAPI().exportInvoicePdf({ invoiceData: data, settings, fileName })
}

export function downloadInvoiceCsv(data: InvoicePrintData): void {
  const csvContent = buildInvoiceCsv(data)
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${data.documentNumber || 'document'}.csv`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
