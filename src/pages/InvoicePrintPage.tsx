import { Box, Button, CircularProgress, IconButton, Stack } from '@mui/material'
import { useEffect, useRef, useState, type WheelEvent } from 'react'
import { FiX } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import { InvoicePrintTemplate } from '../components/print/InvoicePrintTemplate'
import { DelegateStatementPrintTemplate, type DelegateStatementPrintData } from '../components/print/DelegateStatementPrintTemplate'
import { CustomerStatementPrintTemplate } from '../components/print/CustomerStatementPrintTemplate'
import { SupplierStatementPrintTemplate } from '../components/print/SupplierStatementPrintTemplate'
import type { AccountStatementPrintData } from '../types/accountStatement'
import type { CompanyPrintSettings, InvoicePrintData } from '../types/invoicePrint'
import { useNotifications } from '../contexts/useNotifications'

type PrintableData = InvoicePrintData | DelegateStatementPrintData | AccountStatementPrintData

declare global {
  interface Window {
    invoicePrintAPI?: {
      onInvoiceData: (
        callback: (payload: {
          invoiceData: PrintableData
          settings: CompanyPrintSettings
        }) => void,
      ) => void
      offInvoiceData: () => void
      notifyReady: () => void
    }
    craftExportAPI?: {
      exportInvoicePdf: (payload: {
        invoiceData: PrintableData
        settings: CompanyPrintSettings
        fileName?: string
      }) => Promise<string>
    }
  }
}

const MM_TO_PX = 96 / 25.4
const A4_WIDTH_PX = 210 * MM_TO_PX
const A4_HEIGHT_PX = 297 * MM_TO_PX

const MIN_PREVIEW_SCALE = 0.35
const MAX_PREVIEW_SCALE = 1.6
const PREVIEW_SCALE_STEP = 0.08

export default function InvoicePrintPage() {
  const notify = useNotifications()
  const location = useLocation()
  const navigate = useNavigate()

  const [payload, setPayload] = useState<{
    invoiceData: PrintableData
    settings: CompanyPrintSettings
  } | null>(
    (location.state as {
      invoiceData: PrintableData
      settings: CompanyPrintSettings
    } | null) ?? null,
  )

  const [manualScale, setManualScale] = useState<number | null>(1.2)
  const [totalPages, setTotalPages] = useState(1)
  const paperRef = useRef<HTMLDivElement>(null)

  const previewScale = manualScale ?? 1.2
  const isPdfMode = new URLSearchParams(location.search).get('mode') === 'pdf'

  useEffect(() => {
    const paperElement = paperRef.current
    if (!paperElement) {
      return
    }

    const updatePageCount = () => {
      setTotalPages(
        Math.max(1, Math.ceil((paperElement.scrollHeight - 50) / A4_HEIGHT_PX)),
      )
    }

    updatePageCount()
    const observer = new ResizeObserver(updatePageCount)
    observer.observe(paperElement)

    return () => observer.disconnect()
  }, [payload])

  useEffect(() => {
    if (!payload && window.invoicePrintAPI) {
      const handleData = (nextPayload: {
        invoiceData: PrintableData
        settings: CompanyPrintSettings
      }) => {
        setPayload(nextPayload)
      }

      window.invoicePrintAPI.onInvoiceData(handleData)

      return () => {
        window.invoicePrintAPI?.offInvoiceData()
      }
    }

    return undefined
  }, [payload])

  useEffect(() => {
    if (!payload) {
      return
    }

    const ready = async () => {
      await document.fonts.ready
      await Promise.all(
        [400, 500, 700, 800, 900].map((weight) =>
          document.fonts.load(`${weight} 16px Tajawal`),
        ),
      )

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.invoicePrintAPI?.notifyReady()
        })
      })
    }

    void ready()
  }, [payload])

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) {
      return
    }

    event.preventDefault()

    const direction = event.deltaY < 0 ? 1 : -1
    const currentScale = manualScale ?? 1.2

    const nextScale = Math.min(
      MAX_PREVIEW_SCALE,
      Math.max(
        MIN_PREVIEW_SCALE,
        currentScale + direction * PREVIEW_SCALE_STEP,
      ),
    )

    setManualScale(Number(nextScale.toFixed(3)))
  }

  const handleResetZoom = () => {
    setManualScale(1.2)
  }

  const handleSavePdf = async () => {
    if (!payload) {
      return
    }

    let fileBaseName = payload.invoiceData.documentNumber || 'invoice'
    
    if (payload.invoiceData.printKind === 'delegate-statement') {
      fileBaseName = `delegate-statement-${payload.invoiceData.documentNumber || 'report'}`
    } else if (payload.invoiceData.printKind === 'supplier-statement' || payload.invoiceData.printKind === 'customer-statement') {
      fileBaseName = `account-statement-${payload.invoiceData.documentNumber || 'report'}`
    }
    
    const fileName = `${fileBaseName.replace(/[^a-zA-Z0-9\-_]+/g, '_')}.pdf`

    try {
      await window.craftExportAPI?.exportInvoicePdf({
        invoiceData: payload.invoiceData,
        settings: payload.settings,
        fileName,
      })
      notify.success('تم حفظ ملف PDF بنجاح.')
    } catch (error) {
      if (!(error instanceof Error && error.message.includes('Cancelled'))) {
        console.error('PDF EXPORT FAILED', error)
      }
    }
  }

  if (!payload) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0B1636',
        }}
      >
        <CircularProgress size={28} sx={{ color: '#67E8F9' }} />
      </Box>
    )
  }

  const pageData = payload.invoiceData
  const printableContent = pageData.printKind === 'delegate-statement' ? (
    <DelegateStatementPrintTemplate
      data={pageData as DelegateStatementPrintData}
      settings={payload.settings}
    />
  ) : pageData.printKind === 'supplier-statement' ? (
    <SupplierStatementPrintTemplate
      data={pageData as AccountStatementPrintData}
      settings={payload.settings}
    />
  ) : pageData.printKind === 'customer-statement' ? (
    <CustomerStatementPrintTemplate
      data={pageData as AccountStatementPrintData}
      settings={payload.settings}
    />
  ) : (
    <InvoicePrintTemplate
      data={pageData as InvoicePrintData}
      settings={payload.settings}
    />
  )

  const paper = (
    <Box
      ref={paperRef}
      className="invoice-a4"
      sx={{
        width: '210mm',
        minHeight: isPdfMode ? 'auto' : '297mm',
        height: isPdfMode ? 'auto' : 'max-content',
        paddingBottom: isPdfMode ? '12mm' : '20mm',
        position: 'relative',
        background: '#FFFFFF',
        color: '#111827',
        boxSizing: 'border-box',
        borderRadius: isPdfMode ? 0 : '8px',
        boxShadow: isPdfMode ? 'none' : '0 24px 70px rgba(0, 0, 0, 0.34)',
        overflow: 'visible',
        '& .craft-print-visible': {
          minHeight: '0 !important',
          height: 'auto !important',
          overflow: 'visible !important',
          boxSizing: 'border-box !important',
        },
        '& table': {
          pageBreakInside: 'auto',
          breakInside: 'auto',
        },
        '& tr': {
          pageBreakInside: 'avoid',
          pageBreakAfter: 'auto',
          breakInside: 'avoid',
        },
        '& thead': {
          display: 'table-header-group',
        },
        '& tfoot': {
          display: 'table-footer-group',
        },
        '& .prevent-break': {
          pageBreakInside: 'avoid',
          breakInside: 'avoid',
        },
        '@page': {
          size: 'A4 portrait',
          margin: '10mm',
        },
        '@media print': {
          width: '190mm',
          height: 'auto !important',
          minHeight: '0 !important',
          margin: 0,
          padding: 0,
          paddingBottom: '12mm !important',
          borderRadius: 0,
          boxShadow: 'none',
          overflow: 'visible !important',
          transform: 'none !important',
          zoom: '1 !important',
          pageBreakAfter: 'auto',
        },
      }}
    >
      {printableContent}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 0,
          pointerEvents: 'none',
          zIndex: 100,
          overflow: 'visible',
        }}
      >
        {Array.from({ length: totalPages }, (_, index) => (
          <Box
            key={`page-number-${index + 1}`}
            aria-hidden="true"
            sx={{
              position: 'absolute',
              top: isPdfMode
                ? `calc(${(index + 1) * 277}mm - 7mm)`
                : `calc(${(index + 1) * 297}mm - 15mm)`,
              left: 0,
              right: 0,
              height: 'auto',
              lineHeight: 1,
              textAlign: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: '#64748B',
              direction: 'ltr',
              pointerEvents: 'none',
              '@media print': {
                top: `calc(${(index + 1) * 277}mm - 7mm) !important`,
                height: 'auto !important',
              },
            }}
          >
            {index + 1}/{totalPages}
          </Box>
        ))}
      </Box>
    </Box>
  )

  const printGlobalStyles = (
    <style>{`
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      @media print {
        html, body, #root, .invoice-preview-background, .invoice-pdf-document, .invoice-a4 {
          background: #FFFFFF !important;
          background-color: #FFFFFF !important;
          background-image: none !important;
          box-shadow: none !important;
          height: auto !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        html::before, html::after, body::before, body::after, #root::before, #root::after {
          display: none !important;
          content: none !important;
          background: none !important;
        }
        .invoice-a4 {
          padding-bottom: 12mm !important;
          min-height: 0 !important;
          height: auto !important;
        }
      }
    `}</style>
  )

  if (isPdfMode) {
    return (
      <>
        {printGlobalStyles}
        <Box
          className="invoice-pdf-document"
          sx={{
            width: '190mm',
            height: 'auto',
            minHeight: 0,
            background: '#FFFFFF !important',
            backgroundImage: 'none !important',
            p: 0,
            m: 0,
            '@media print': {
              width: '190mm',
              height: 'auto !important',
              minHeight: '0 !important',
              background: '#FFFFFF !important',
              backgroundImage: 'none !important',
              m: 0,
              p: 0,
            },
          }}
        >
          {paper}
        </Box>
      </>
    )
  }

  return (
    <>
      {printGlobalStyles}
      <Box
        className="invoice-preview-background"
        onWheel={handlePreviewWheel}
        sx={{
          width: '100vw',
          height: '100vh',
          background: '#0B1636',
          position: 'relative',
          overflow: 'auto',
          boxSizing: 'border-box',
          '@media print': {
            background: '#FFFFFF !important',
            margin: '0 !important',
            padding: '0 !important',
            width: '100% !important',
            height: '100% !important',
            overflow: 'visible !important',
          },
        }}
      >
      <Stack
        direction="row"
        spacing={1.5}
        className="invoice-preview-toolbar"
        sx={{
          position: 'fixed',
          top: 24,
          left: 16,
          zIndex: 10,
          alignItems: 'center',
        }}
      >
        <IconButton
          aria-label="إغلاق"
          onClick={() => navigate(-1)}
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            color: '#E2E8F0',
            '&:hover': {
              borderColor: '#67E8F9',
              color: '#67E8F9',
              background: 'rgba(103, 232, 249, 0.06)',
            },
          }}
        >
          <FiX size={30} />
        </IconButton>
        <Button
          variant="contained"
          onClick={() => {
            void handleSavePdf()
          }}
          sx={{
            minWidth: 104,
            height: 40,
            borderRadius: '12px',
            fontWeight: 800,
            background:
              'linear-gradient(135deg, #0891B2 0%, #0EA5E9 100%)',
            color: '#FFFFFF',
            boxShadow: '0 10px 28px rgba(14, 165, 233, 0.24)',
            '&:hover': {
              background:
                'linear-gradient(135deg, #0E7490 0%, #0284C7 100%)',
              boxShadow: '0 12px 32px rgba(14, 165, 233, 0.30)',
            },
          }}
        >
          حفظ PDF
        </Button>

        <Button
          variant="outlined"
          onClick={handleResetZoom}
          sx={{
            minWidth: 92,
            height: 40,
            borderRadius: '12px',
            fontWeight: 700,
            color: '#E2E8F0',
            borderColor: 'rgba(226, 232, 240, 0.28)',
            '&:hover': {
              borderColor: '#67E8F9',
              color: '#67E8F9',
              background: 'rgba(103, 232, 249, 0.06)',
            },
          }}
        >
          ملاءمة {Math.round(previewScale * 100)}%
        </Button>

      </Stack>

      <Box
        className="invoice-preview-paper-wrapper"
        sx={{
          width: `${A4_WIDTH_PX}px`,
          minHeight: '297mm',
          zoom: previewScale,
          mx: 'auto',
          my: '12px',
          '@media print': {
            width: '190mm',
              minHeight: 0,
            zoom: '1 !important',
            transform: 'none !important',
          },
        }}
      >
        {paper}
      </Box>
      </Box>
    </>
  )
}