import { Box, Button, CircularProgress, Stack } from '@mui/material'
import { useEffect, useMemo, useState, type WheelEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { InvoicePrintTemplate } from '../components/print/InvoicePrintTemplate'
import type { CompanyPrintSettings, InvoicePrintData, InvoicePrintItem } from '../types/invoicePrint'

declare global {
  interface Window {
    invoicePrintAPI?: {
      onInvoiceData: (
        callback: (payload: {
          invoiceData: InvoicePrintData
          settings: CompanyPrintSettings
        }) => void,
      ) => void
      offInvoiceData: () => void
      notifyReady: () => void
    }
    craftExportAPI?: {
      exportInvoicePdf: (payload: {
        invoiceData: InvoicePrintData
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
const PAGE_GAP_PX = 18

// Conservative capacities so each visual sheet remains inside a real A4 page.
// The first page reserves space for the logo/company/document information.
// Continuation pages contain only the table header + rows.
// The final continuation page also reserves space for totals/payment/notes.
const FIRST_PAGE_ROWS = 11
const CONTINUATION_PAGE_ROWS = 21
const LAST_PAGE_ROWS = 17
const LAST_PAGE_ROWS_WITH_NOTES = 14

interface InvoicePageChunk {
  items: InvoicePrintItem[]
  isFirst: boolean
  isLast: boolean
}

function buildPageChunks(data: InvoicePrintData): InvoicePageChunk[] {
  const items = data.items ?? []

  if (items.length <= FIRST_PAGE_ROWS) {
    return [
      {
        items,
        isFirst: true,
        isLast: true,
      },
    ]
  }

  const firstItems = items.slice(0, FIRST_PAGE_ROWS)
  const remainingItems = items.slice(FIRST_PAGE_ROWS)

  const finalPageCapacity = data.notes?.trim()
    ? LAST_PAGE_ROWS_WITH_NOTES
    : LAST_PAGE_ROWS

  let continuationPageCount = 1

  while (
    remainingItems.length >
    (continuationPageCount - 1) * CONTINUATION_PAGE_ROWS + finalPageCapacity
  ) {
    continuationPageCount += 1
  }

  const baseSize = Math.floor(remainingItems.length / continuationPageCount)
  const extra = remainingItems.length % continuationPageCount
  const pageSizes = Array.from(
    { length: continuationPageCount },
    (_, index) => baseSize + (index < extra ? 1 : 0),
  )

  // Keep the last page small enough for totals/payment/notes.
  const lastIndex = pageSizes.length - 1
  let overflowFromLast = Math.max(0, pageSizes[lastIndex] - finalPageCapacity)

  if (overflowFromLast > 0) {
    for (let index = 0; index < lastIndex && overflowFromLast > 0; index += 1) {
      const availableRoom = CONTINUATION_PAGE_ROWS - pageSizes[index]
      const moveCount = Math.min(availableRoom, overflowFromLast)

      pageSizes[index] += moveCount
      pageSizes[lastIndex] -= moveCount
      overflowFromLast -= moveCount
    }
  }

  const chunks: InvoicePageChunk[] = [
    {
      items: firstItems,
      isFirst: true,
      isLast: false,
    },
  ]

  let offset = 0

  pageSizes.forEach((pageSize, index) => {
    chunks.push({
      items: remainingItems.slice(offset, offset + pageSize),
      isFirst: false,
      isLast: index === pageSizes.length - 1,
    })

    offset += pageSize
  })

  return chunks
}

export default function InvoicePrintPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const [payload, setPayload] = useState<{
    invoiceData: InvoicePrintData
    settings: CompanyPrintSettings
  } | null>(
    (location.state as {
      invoiceData: InvoicePrintData
      settings: CompanyPrintSettings
    } | null) ?? null,
  )

  const [fitScale, setFitScale] = useState(1)
  const [manualScale, setManualScale] = useState<number | null>(null)

  const previewScale = manualScale ?? fitScale
  const isPdfMode = new URLSearchParams(location.search).get('mode') === 'pdf'

  const pageChunks = useMemo(
    () => (payload ? buildPageChunks(payload.invoiceData) : []),
    [payload],
  )

  const pageCount = pageChunks.length || 1
  const isMultiPage = pageCount > 1

  useEffect(() => {
    if (!payload && window.invoicePrintAPI) {
      const handleData = (nextPayload: {
        invoiceData: InvoicePrintData
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

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.invoicePrintAPI?.notifyReady()
        })
      })
    }

    void ready()
  }, [payload, pageCount])

  useEffect(() => {
    if (isPdfMode) {
      return undefined
    }

    const updateFitScale = () => {
      // One A4 page should fit exactly inside the viewport with no initial scroll.
      // Multi-page invoices keep a tiny vertical breathing room because scrolling is expected.
      const horizontalSpace = 24
      const verticalSpace = isMultiPage ? 24 : 0

      const availableWidth = Math.max(320, window.innerWidth - horizontalSpace)
      const availableHeight = Math.max(420, window.innerHeight - verticalSpace)

      const nextScale = Math.min(
        availableWidth / A4_WIDTH_PX,
        availableHeight / A4_HEIGHT_PX,
        1,
      )

      setFitScale(Math.max(MIN_PREVIEW_SCALE, nextScale))
    }

    updateFitScale()
    window.addEventListener('resize', updateFitScale)

    return () => {
      window.removeEventListener('resize', updateFitScale)
    }
  }, [isPdfMode, isMultiPage])

  const handlePreviewWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey) {
      return
    }

    event.preventDefault()

    const direction = event.deltaY < 0 ? 1 : -1
    const currentScale = manualScale ?? fitScale

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
    setManualScale(null)
  }

  const handleSavePdf = async () => {
    if (!payload) {
      return
    }

    const fileName = `${(
      payload.invoiceData.documentNumber || 'invoice'
    ).replace(/[^a-zA-Z0-9\-_]+/g, '_')}.pdf`

    await window.craftExportAPI?.exportInvoicePdf({
      invoiceData: payload.invoiceData,
      settings: payload.settings,
      fileName,
    })
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

  const renderPage = (
    chunk: InvoicePageChunk,
    pageIndex: number,
    scale: number,
    pdfMode: boolean,
  ) => {
    const pageNumber = pageIndex + 1

    const pageData: InvoicePrintData = {
      ...payload.invoiceData,
      items: chunk.items,
    }

    const hideTopSections = !chunk.isFirst
    const hideSummary = !chunk.isLast

    return (
      <Box
        key={`invoice-page-${pageNumber}`}
        sx={{
          width: pdfMode ? '210mm' : `${A4_WIDTH_PX * scale}px`,
          height: pdfMode ? '297mm' : `${A4_HEIGHT_PX * scale}px`,
          position: 'relative',
          flexShrink: 0,
          breakAfter: pageIndex < pageCount - 1 ? 'page' : 'auto',
          pageBreakAfter: pageIndex < pageCount - 1 ? 'always' : 'auto',
        }}
      >
        <Box
          className="invoice-a4"
          sx={{
            width: '210mm',
            height: '297mm',
            minHeight: '297mm',
            position: 'relative',
            background: '#FFFFFF',
            color: '#111827',
            borderRadius: pdfMode ? 0 : '8px',
            boxShadow: pdfMode
              ? 'none'
              : '0 24px 70px rgba(0, 0, 0, 0.34)',
            overflow: 'hidden',
            transform: pdfMode ? 'none' : `scale(${scale})`,
            transformOrigin: 'top left',

            // Do not touch the actual invoice design.
            // We only suppress the top blocks on continuation pages,
            // and suppress totals until the final page.
            ...(hideTopSections
              ? {
                  '& .craft-print-visible > :nth-of-type(1)': {
                    display: 'none !important',
                  },
                  '& .craft-print-visible > :nth-of-type(2)': {
                    display: 'none !important',
                  },
                }
              : {}),

            ...(hideSummary
              ? {
                  '& .craft-print-visible > :last-child': {
                    display: 'none !important',
                  },
                }
              : {}),

            '& .craft-print-visible': {
              minHeight: '297mm !important',
              height: '297mm !important',
              overflow: 'hidden !important',
              boxSizing: 'border-box !important',
            },

            '@media print': {
              width: '210mm',
              height: '297mm',
              minHeight: '297mm',
              borderRadius: 0,
              boxShadow: 'none',
              overflow: 'hidden',
              transform: 'none',
            },
          }}
        >
          <InvoicePrintTemplate
            data={pageData}
            settings={payload.settings}
          />

          <Box
            aria-hidden="true"
            sx={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: '4mm',
              textAlign: 'center',
              fontSize: 11,
              lineHeight: 1,
              color: '#64748B',
              direction: 'ltr',
              pointerEvents: 'none',
            }}
          >
            {pageNumber}
          </Box>
        </Box>
      </Box>
    )
  }

  if (isPdfMode) {
    return (
      <Box
        sx={{
          width: '210mm',
          minHeight: '297mm',
          background: '#FFFFFF',
          p: 0,
          m: 0,
          '@media print': {
            width: '210mm',
            background: '#FFFFFF !important',
            m: 0,
            p: 0,
          },
          '@page': {
            size: 'A4',
            margin: 0,
          },
        }}
      >
        {pageChunks.map((chunk, pageIndex) =>
          renderPage(chunk, pageIndex, 1, true),
        )}
      </Box>
    )
  }

  const manualZoomNeedsScroll =
    manualScale !== null && manualScale > fitScale + 0.001

  const shouldScroll = isMultiPage || manualZoomNeedsScroll

  return (
    <Box
      className="invoice-preview-background"
      onWheel={handlePreviewWheel}
      sx={{
        width: '100vw',
        height: '100vh',
        background: '#0B1636',
        position: 'relative',
        overflow: shouldScroll ? 'auto' : 'hidden',
        boxSizing: 'border-box',
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        className="invoice-preview-toolbar"
        sx={{
          position: 'fixed',
          top: 24,
          right: 32,
          zIndex: 10,
          alignItems: 'center',
        }}
      >
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

        <Button
          variant="outlined"
          onClick={() => navigate(-1)}
          sx={{
            minWidth: 72,
            height: 40,
            borderRadius: '12px',
            fontWeight: 700,
            color: '#E2E8F0',
            borderColor: 'rgba(226, 232, 240, 0.42)',
            '&:hover': {
              borderColor: '#67E8F9',
              color: '#67E8F9',
              background: 'rgba(103, 232, 249, 0.06)',
            },
          }}
        >
          إغلاق
        </Button>
      </Stack>

      <Box
        sx={{
          width: `${A4_WIDTH_PX * previewScale}px`,
          minHeight: isMultiPage
            ? `${
                pageCount * A4_HEIGHT_PX * previewScale +
                (pageCount - 1) * PAGE_GAP_PX
              }px`
            : `${A4_HEIGHT_PX * previewScale}px`,
          display: 'grid',
          gap: isMultiPage ? `${PAGE_GAP_PX}px` : 0,
          mx: 'auto',
          my: isMultiPage ? '12px' : 0,
        }}
      >
        {pageChunks.map((chunk, pageIndex) =>
          renderPage(chunk, pageIndex, previewScale, false),
        )}
      </Box>
    </Box>
  )
}
