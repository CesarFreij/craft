export type TableCellValue = string | number | boolean | null | undefined

export type TableExportOptions = {
  title: string
  headers: string[]
  rows: TableCellValue[][]
  fileName: string
  sheetName?: string
  subtitle?: string
  summary?: string
  summaryPosition?: 'above' | 'below'
  printDetails?: {
    warehouse?: string
    fromDate?: string
    toDate?: string
  }
}

function stripInvalidXmlCharacters(value: unknown): string {
  return Array.from(String(value ?? ''))
    .filter((character) => {
      const code = character.charCodeAt(0)

      return (
        code === 0x09 ||
        code === 0x0a ||
        code === 0x0d ||
        code >= 0x20
      )
    })
    .join('')
}

function escapeXml(value: unknown): string {
  return stripInvalidXmlCharacters(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function normalizeExcelCellText(value: unknown): string {
  return String(value ?? '')
    .replace(/\r\n|\r|\n|\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .trim()
}

function excelColumnName(index: number): string {
  let value = index + 1
  let name = ''

  while (value > 0) {
    const remainder = (value - 1) % 26
    name = String.fromCharCode(65 + remainder) + name
    value = Math.floor((value - 1) / 26)
  }

  return name
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff

  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index]

    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
    }
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32(target: Uint8Array, offset: number, value: number): void {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0

  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }

  return result
}

function createStoredZip(files: Array<{ name: string; content: string }>): Uint8Array {
  const encoder = new TextEncoder()
  const localChunks: Uint8Array[] = []
  const centralChunks: Uint8Array[] = []
  let localOffset = 0

  for (const file of files) {
    const nameBytes = encoder.encode(file.name)
    const dataBytes = encoder.encode(file.content)
    const checksum = crc32(dataBytes)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    writeUint32(localHeader, 0, 0x04034b50)
    writeUint16(localHeader, 4, 20)
    writeUint16(localHeader, 6, 0)
    writeUint16(localHeader, 8, 0)
    writeUint16(localHeader, 10, 0)
    writeUint16(localHeader, 12, 0)
    writeUint32(localHeader, 14, checksum)
    writeUint32(localHeader, 18, dataBytes.length)
    writeUint32(localHeader, 22, dataBytes.length)
    writeUint16(localHeader, 26, nameBytes.length)
    writeUint16(localHeader, 28, 0)
    localHeader.set(nameBytes, 30)

    localChunks.push(localHeader, dataBytes)

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    writeUint32(centralHeader, 0, 0x02014b50)
    writeUint16(centralHeader, 4, 20)
    writeUint16(centralHeader, 6, 20)
    writeUint16(centralHeader, 8, 0)
    writeUint16(centralHeader, 10, 0)
    writeUint16(centralHeader, 12, 0)
    writeUint16(centralHeader, 14, 0)
    writeUint32(centralHeader, 16, checksum)
    writeUint32(centralHeader, 20, dataBytes.length)
    writeUint32(centralHeader, 24, dataBytes.length)
    writeUint16(centralHeader, 28, nameBytes.length)
    writeUint16(centralHeader, 30, 0)
    writeUint16(centralHeader, 32, 0)
    writeUint16(centralHeader, 34, 0)
    writeUint16(centralHeader, 36, 0)
    writeUint32(centralHeader, 38, 0)
    writeUint32(centralHeader, 42, localOffset)
    centralHeader.set(nameBytes, 46)

    centralChunks.push(centralHeader)
    localOffset += localHeader.length + dataBytes.length
  }

  const centralDirectory = concatBytes(centralChunks)
  const endRecord = new Uint8Array(22)
  writeUint32(endRecord, 0, 0x06054b50)
  writeUint16(endRecord, 4, 0)
  writeUint16(endRecord, 6, 0)
  writeUint16(endRecord, 8, files.length)
  writeUint16(endRecord, 10, files.length)
  writeUint32(endRecord, 12, centralDirectory.length)
  writeUint32(endRecord, 16, localOffset)
  writeUint16(endRecord, 20, 0)

  return concatBytes([...localChunks, centralDirectory, endRecord])
}

function buildExcelWorkbook(
  headers: string[],
  rows: TableCellValue[][],
  sheetName: string,
): Blob {
  const safeSheetName =
    (sheetName || 'البيانات')
      .replace(/[\\/*?:[\]]/g, ' ')
      .split('')
      .map((character) => (character.charCodeAt(0) < 0x20 ? ' ' : character))
      .join('')
      .trim()
      .slice(0, 31) || 'البيانات'

  const allRows: TableCellValue[][] = [headers, ...rows]
  const excelFontSize = 20

  const canvas = document.createElement('canvas')
  const canvasContext = canvas.getContext('2d')

  const measureTextWidth = (value: TableCellValue, bold = false): number => {
    const textValue = normalizeExcelCellText(value)

    if (!canvasContext) {
      return Math.max(1, textValue.length) * 12
    }

    canvasContext.font = `${bold ? '700 ' : ''}${excelFontSize}px Arial`
    return canvasContext.measureText(textValue).width
  }

  const pixelsToExcelWidth = (pixels: number): number => {
    if (!canvasContext) {
      return Math.min(255, Math.max(2.5, pixels / 10))
    }

    canvasContext.font = `${excelFontSize}px Arial`
    const zeroWidth = Math.max(1, canvasContext.measureText('0').width)

    // Add the same visual breathing room used by the browser print table
    // (8px padding on both sides), then convert to Excel column-width units.
    const excelWidth = (pixels + 16) / zeroWidth

    return Math.min(255, Math.max(2.5, Number(excelWidth.toFixed(2))))
  }

  const columnWidths = headers.map((header, columnIndex) => {
    const headerWidth = measureTextWidth(header, true)
    const maxContentWidth = rows.reduce((max, row) => {
      return Math.max(max, measureTextWidth(row[columnIndex]))
    }, 0)

    return pixelsToExcelWidth(Math.max(headerWidth, maxContentWidth))
  })


  const rowXml = allRows
    .map((row, rowIndex) => {
      const cells = headers
        .map((_, columnIndex) => {
          const value = row[columnIndex] ?? ''
          const reference = `${excelColumnName(columnIndex)}${rowIndex + 1}`
          const isHeader = rowIndex === 0
          const isLastColumn = columnIndex === headers.length - 1

          const textStyle = isHeader
            ? isLastColumn
              ? 4
              : 1
            : isLastColumn
              ? 3
              : 0

          const numberStyle = isLastColumn ? 5 : 2

          if (
            rowIndex > 0 &&
            typeof value === 'number' &&
            Number.isFinite(value)
          ) {
            return `<c r="${reference}" s="${numberStyle}"><v>${value}</v></c>`
          }

          if (rowIndex > 0 && typeof value === 'boolean') {
            return `<c r="${reference}" t="b" s="${textStyle}"><v>${value ? 1 : 0}</v></c>`
          }

          return `<c r="${reference}" t="inlineStr" s="${textStyle}"><is><t xml:space="preserve">${escapeXml(normalizeExcelCellText(value))}</t></is></c>`
        })
        .join('')

      const rowHeight = rowIndex === 0 ? 34 : 30
      return `<row r="${rowIndex + 1}" ht="${rowHeight}" customHeight="1">${cells}</row>`
    })
    .join('')


  const lastColumn = excelColumnName(Math.max(0, headers.length - 1))
  const lastRow = Math.max(1, allRows.length)

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr>
    <pageSetUpPr fitToPage="1" autoPageBreaks="0"/>
  </sheetPr>
  <dimension ref="A1:${lastColumn}${lastRow}"/>
  <sheetViews>
    <sheetView workbookViewId="0" rightToLeft="1" showGridLines="0">
      <pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>
    </sheetView>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="30"/>
  <cols>
    ${columnWidths
      .map(
        (width, index) =>
          `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1" bestFit="1"/>`,
      )
      .join('')}
  </cols>
  <sheetData>${rowXml}</sheetData>
  <autoFilter ref="A1:${lastColumn}${lastRow}"/>
  <printOptions
    horizontalCentered="1"
    verticalCentered="0"
    headings="0"
    gridLines="0"
    gridLinesSet="1"
  />
  <pageMargins
    left="0.47"
    right="0.47"
    top="0.47"
    bottom="0.47"
    header="0.20"
    footer="0.20"
  />
  <pageSetup
    paperSize="9"
    orientation="landscape"
    pageOrder="downThenOver"
    fitToWidth="1"
    fitToHeight="0"
    firstPageNumber="1"
    useFirstPageNumber="1"
    horizontalDpi="300"
    verticalDpi="300"
  />
</worksheet>`

  const formulaSheetName = `'${safeSheetName.replace(/'/g, "''")}'`
  const printAreaReference =
    `${formulaSheetName}!$A$1:$${lastColumn}$${lastRow}`
  const printTitlesReference = `${formulaSheetName}!$1:$1`

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets><sheet name="${escapeXml(safeSheetName)}" sheetId="1" r:id="rId1"/></sheets>
  <definedNames>
    <definedName name="_xlnm.Print_Area" localSheetId="0">${escapeXml(printAreaReference)}</definedName>
    <definedName name="_xlnm.Print_Titles" localSheetId="0">${escapeXml(printTitlesReference)}</definedName>
  </definedNames>
</workbook>`

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="${excelFontSize}"/><name val="Arial"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="${excelFontSize}"/><name val="Arial"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0B2948"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="5">
    <border/>
    <border>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <bottom style="thin"><color rgb="FF94A3B8"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <bottom style="thin"><color rgb="FF94A3B8"/></bottom>
    </border>
    <border>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="thin"><color rgb="FF94A3B8"/></top>
      <bottom style="thin"><color rgb="FF94A3B8"/></bottom>
    </border>
    <border>
      <left style="thin"><color rgb="FF94A3B8"/></left>
      <right style="thin"><color rgb="FF94A3B8"/></right>
      <top style="thin"><color rgb="FF94A3B8"/></top>
      <bottom style="thin"><color rgb="FF94A3B8"/></bottom>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="0"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="3" xfId="0" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="0"/>
    </xf>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="0"/>
    </xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="2" xfId="0" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="0"/>
    </xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="4" xfId="0" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="0"/>
    </xf>
    <xf numFmtId="4" fontId="0" fillId="0" borderId="2" xfId="0" applyNumberFormat="1" applyAlignment="1">
      <alignment horizontal="center" vertical="center" wrapText="0"/>
    </xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

  const files = [
    {
      name: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      name: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    { name: 'xl/workbook.xml', content: workbookXml },
    {
      name: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    { name: 'xl/styles.xml', content: stylesXml },
    { name: 'xl/worksheets/sheet1.xml', content: sheetXml },
  ]

  const bytes = createStoredZip(files)
  const arrayBuffer = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(arrayBuffer).set(bytes)

  return new Blob([arrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function downloadExcelTable(options: TableExportOptions): void {
  if (options.rows.length === 0) {
    return
  }

  const workbook = buildExcelWorkbook(
    options.headers,
    options.rows,
    options.sheetName ?? options.title,
  )
  const url = URL.createObjectURL(workbook)
  const anchor = document.createElement('a')
  const normalizedFileName = options.fileName.toLowerCase().endsWith('.xlsx')
    ? options.fileName
    : `${options.fileName}.xlsx`

  anchor.href = url
  anchor.download = normalizedFileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1500)
}

function buildPrintableDocument(options: TableExportOptions): string {
  const now = new Date()
  const systemLocale = navigator.language || undefined
  const twoDigit = new Intl.NumberFormat(systemLocale, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  })
  const fourDigit = new Intl.NumberFormat(systemLocale, {
    minimumIntegerDigits: 4,
    useGrouping: false,
  })
  const generatedDate = [
    twoDigit.format(now.getDate()),
    twoDigit.format(now.getMonth() + 1),
    fourDigit.format(now.getFullYear()),
  ].join('/')
  const generatedAt = generatedDate
  const headersHtml = options.headers
    .map((header) => `<th>${escapeHtml(header)}</th>`)
    .join('')
  const rowsHtml = options.rows
    .map(
      (row) =>
        `<tr>${options.headers
          .map((_, index) => `<td>${escapeHtml(row[index] ?? '')}</td>`)
          .join('')}</tr>`,
    )
    .join('')

  const hasPrintDetails = Boolean(options.printDetails)
  const warehouseLabel = options.printDetails?.warehouse?.trim() || '__'
  const fromDateLabel = options.printDetails?.fromDate?.trim() || '__'
  const toDateLabel = options.printDetails?.toDate?.trim() || '__'
  const summaryPosition = options.summaryPosition ?? 'above'

  return `<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(options.title)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 12mm;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      min-height: 100%;
    }

    body {
      margin: 0;
      padding: 22px;
      font-family: Arial, Tahoma, sans-serif;
      direction: rtl;
      color: #111827;
      background: #d7dce3;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .print-page {
      width: 297mm;
      min-height: 210mm;
      margin: 0 auto;
      padding: 12mm;
      background: #ffffff;
      box-shadow: 0 18px 55px rgba(15, 23, 42, 0.24);
      display: flex;
      flex-direction: column;
    }

    .header {
      position: relative;
      margin-bottom: 16px;
      border-bottom: 2px solid #0b2948;
      padding-bottom: 12px;
      text-align: center;
    }

    h1 {
      margin: 0;
      font-size: 24px;
      line-height: 1.25;
      color: #0b2948;
      font-weight: 800;
      text-align: center;
    }

    .subtitle {
      margin-top: 5px;
      font-size: 18px;
      color: #475569;
      text-align: right;
    }

    .header-details {
      margin-top: 12px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      align-items: center;
      gap: 10px;
      direction: ltr;
      min-height: 28px;
    }

    .warehouse-detail,
    .date-range-detail {
      direction: rtl;
      color: #0f172a;
      font-size: 18px;
      font-weight: 800;
      line-height: 1.5;
    }

    .warehouse-detail {
      grid-column: 2;
      text-align: center;
      transform: translateX(-12%);
    }

    .date-range-detail {
      grid-column: 4;
      text-align: right;
      white-space: nowrap;
    }

    .summary {
      padding: 9px 12px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      border-radius: 8px;
      font-weight: 700;
    }

    .summary-above {
      margin: 12px 0 0;
      text-align: left;
      font-size: 20px
    }

    .summary-below {
      margin-top: 12px;
      width: 100%;
      min-width: 0;
      text-align: left;
      direction: rtl;
    }

    .table-block {
      display: inline-block;
      width: max-content;
      max-width: none;
      margin: 0 auto;
      align-self: center;
    }

    table {
      width: max-content;
      max-width: none;
      margin: 0;
      border-collapse: collapse;
      table-layout: auto;
    }

    thead {
      display: table-header-group;
    }

    tr {
      break-inside: avoid;
      page-break-inside: avoid;
    }

    th,
    td {
      border: 1px solid #94a3b8;
      padding: 6px 8px;
      text-align: center;
      font-size: 20px;
      vertical-align: middle;
      white-space: nowrap;
      word-break: normal;
    }

    th {
      background: #0b2948;
      color: #ffffff;
      font-weight: 700;
    }

    tbody tr:nth-child(even) {
      background: #f8fafc;
    }

    .generated-footer {
      margin-top: auto;
      padding-top: 14px;
      direction: ltr;
      text-align: right;
      font-size: 18px;
      color: #475569;
      white-space: nowrap;
    }

    @media print {
      html,
      body {
        min-height: auto;
      }

      body {
        padding: 0;
        background: #ffffff;
      }

      .print-page {
        width: auto;
        min-height: calc(210mm - 24mm);
        margin: 0;
        padding: 0;
        box-shadow: none;
      }

      .table-block {
        margin-left: auto;
        margin-right: auto;
      }
    }
  </style>
</head>
<body>
  <main class="print-page">
    <div class="header">
      <h1>${escapeHtml(options.title)}</h1>
      ${
        options.subtitle && !hasPrintDetails
          ? `<div class="subtitle">${escapeHtml(options.subtitle)}</div>`
          : ''
      }
      ${
        hasPrintDetails
          ? `<div class="header-details">
              <div class="warehouse-detail">المخزن: ${escapeHtml(warehouseLabel)}</div>
              <div class="date-range-detail">من تاريخ: ${escapeHtml(fromDateLabel)} &nbsp;&nbsp; إلى تاريخ: ${escapeHtml(toDateLabel)}</div>
            </div>`
          : ''
      }
    </div>
    
    <div class="table-block">
    <table>
    <thead>
    <tr>${headersHtml}</tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
    </table>

    ${
      options.summary && summaryPosition === 'above'
        ? `<div class="summary summary-above">${escapeHtml(options.summary)}</div>`
        : ''
    }

      ${
        options.summary && summaryPosition === 'below'
          ? `<div class="summary summary-below">${escapeHtml(options.summary)}</div>`
          : ''
      }
    </div>

    <div class="generated-footer">${escapeHtml(generatedAt)}</div>
  </main>
</body>
</html>`
}


export function printTableData(options: TableExportOptions): void {
  if (options.rows.length === 0) {
    return
  }

  const existingPreview = document.getElementById('craft-table-print-preview')
  existingPreview?.remove()

  const previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'

  const overlay = document.createElement('div')
  overlay.id = 'craft-table-print-preview'
  overlay.dir = 'rtl'
  Object.assign(overlay.style, {
    position: 'fixed',
    inset: '0',
    zIndex: '2147483647',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(2, 6, 23, 0.94)',
    color: '#f8fafc',
    fontFamily: 'Arial, Tahoma, sans-serif',
  })

  const toolbar = document.createElement('div')
  Object.assign(toolbar.style, {
    minHeight: '68px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '16px',
    flexWrap: 'wrap',
    background: 'rgba(8, 22, 48, 0.98)',
    borderBottom: '1px solid rgba(148, 197, 255, 0.18)',
    boxShadow: '0 10px 30px rgba(2, 6, 23, 0.28)',
  })

  const headingGroup = document.createElement('div')

  const heading = document.createElement('div')
  heading.textContent = 'معاينة الطباعة'
  Object.assign(heading.style, {
    fontSize: '17px',
    fontWeight: '800',
    color: '#ffffff',
  })

  const detail = document.createElement('div')
  detail.textContent = `${options.title} — ${options.rows.length} سجل`
  Object.assign(detail.style, {
    marginTop: '3px',
    fontSize: '12px',
    color: 'rgba(226, 232, 240, 0.68)',
  })

  headingGroup.append(heading, detail)

  const actions = document.createElement('div')
  Object.assign(actions.style, {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  })

  const closeButton = document.createElement('button')
  closeButton.type = 'button'
  closeButton.textContent = 'إغلاق'
  Object.assign(closeButton.style, {
    minHeight: '40px',
    padding: '0 18px',
    borderRadius: '11px',
    border: '1px solid rgba(203, 213, 225, 0.28)',
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#e2e8f0',
    fontWeight: '700',
    cursor: 'pointer',
  })

  const printButton = document.createElement('button')
  printButton.type = 'button'
  printButton.textContent = 'طباعة'
  printButton.disabled = true
  Object.assign(printButton.style, {
    minHeight: '40px',
    padding: '0 20px',
    borderRadius: '11px',
    border: '1px solid rgba(96, 165, 250, 0.58)',
    background: 'rgba(96, 165, 250, 0.10)',
    color: '#BFDBFE',
    fontWeight: '800',
    cursor: 'pointer',
    transition: 'background 160ms ease, border-color 160ms ease, color 160ms ease',
  })

  printButton.addEventListener('mouseenter', () => {
    if (printButton.disabled) return
    printButton.style.background = 'rgba(96, 165, 250, 0.20)'
    printButton.style.borderColor = '#60A5FA'
    printButton.style.color = '#DBEAFE'
  })

  printButton.addEventListener('mouseleave', () => {
    printButton.style.background = 'rgba(96, 165, 250, 0.10)'
    printButton.style.borderColor = 'rgba(96, 165, 250, 0.58)'
    printButton.style.color = '#BFDBFE'
  })

  actions.append(closeButton, printButton)
  toolbar.append(headingGroup, actions)

  const previewArea = document.createElement('div')
  Object.assign(previewArea.style, {
    flex: '1',
    minHeight: '0',
    overflow: 'auto',
    padding: '28px',
  })

  const iframe = document.createElement('iframe')
  iframe.title = 'معاينة الطباعة'
  Object.assign(iframe.style, {
    display: 'block',
    width: '1180px',
    height: '820px',
    maxWidth: 'none',
    margin: '0 auto',
    border: '0',
    borderRadius: '4px',
    background: '#ffffff',
    boxShadow: '0 22px 65px rgba(0, 0, 0, 0.38)',
  })
  iframe.srcdoc = buildPrintableDocument(options)

  previewArea.appendChild(iframe)
  overlay.append(toolbar, previewArea)
  document.body.appendChild(overlay)

  const closePreview = () => {
    document.removeEventListener('keydown', handleKeyDown)
    document.body.style.overflow = previousBodyOverflow
    overlay.remove()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      closePreview()
    }
  }

  closeButton.addEventListener('click', closePreview)
  document.addEventListener('keydown', handleKeyDown)

  iframe.addEventListener(
    'load',
    () => {
      printButton.disabled = false
      printButton.style.opacity = '1'
    },
    { once: true },
  )

  printButton.style.opacity = '0.58'

  printButton.addEventListener('click', () => {
    const previewWindow = iframe.contentWindow

    if (!previewWindow) {
      return
    }

    previewWindow.focus()
    previewWindow.print()
  })
}