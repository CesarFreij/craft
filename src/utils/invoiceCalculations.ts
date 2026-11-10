export function calculateNetInvoiceItemAmounts(
  quantity: number,
  lineTotal: number,
  invoiceSubtotal: number,
  discountAmount: number,
  priceDecimals: number,
): { netUnitPrice: number; netTotal: number } {
  const discountShare = invoiceSubtotal > 0
    ? (lineTotal / invoiceSubtotal) * discountAmount
    : 0
  const scale = 10 ** priceDecimals
  const netTotal = Math.round((Math.max(lineTotal - discountShare, 0) + Number.EPSILON) * scale) / scale
  const netUnitPrice = quantity > 0
    ? Math.round((netTotal / quantity + Number.EPSILON) * scale) / scale
    : 0

  return { netUnitPrice, netTotal }
}

export function calculateProratedReturnLineTotal(
  quantity: number,
  invoiceQuantity: number,
  invoiceItemNetTotal: number,
  previouslyReturnedQuantity: number,
  previouslyReturnedTotal: number,
  priceDecimals: number,
): number {
  if (quantity <= 0 || invoiceQuantity <= 0) return 0

  const scale = 10 ** priceDecimals
  const cumulativeQuantity = Math.min(previouslyReturnedQuantity + quantity, invoiceQuantity)
  const cumulativeTotal = cumulativeQuantity >= invoiceQuantity
    ? invoiceItemNetTotal
    : Math.round((invoiceItemNetTotal * cumulativeQuantity / invoiceQuantity + Number.EPSILON) * scale) / scale
  const roundedPreviousTotal = Math.round((previouslyReturnedTotal + Number.EPSILON) * scale) / scale

  return Math.max(Math.round((cumulativeTotal - roundedPreviousTotal + Number.EPSILON) * scale) / scale, 0)
}
