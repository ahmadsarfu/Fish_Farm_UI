import jsPDF from 'jspdf'

const money = (value) =>
  Number(value || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

const weight = (value) => Number(value || 0).toFixed(2)

const formatDate = (value) => {
  if (!value) return '-'

  const [year, month, day] = value.split('-')

  if (!year || !month || !day) return value

  return `${day}-${month}-${year}`
}

const numberToWords = (num) => {
  num = Math.floor(Number(num || 0))

  if (num === 0) return 'Zero'

  const ones = [
    '', 'One', 'Two', 'Three', 'Four', 'Five',
    'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen',
    'Fifteen', 'Sixteen', 'Seventeen',
    'Eighteen', 'Nineteen'
  ]

  const tens = [
    '', '', 'Twenty', 'Thirty', 'Forty',
    'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
  ]

  const belowHundred = n => {
    if (n < 20) return ones[n]
    return `${tens[Math.floor(n / 10)]}${n % 10 ? ' ' + ones[n % 10] : ''}`
  }

  const belowThousand = n => {
    let result = ''

    if (n >= 100) {
      result += `${ones[Math.floor(n / 100)]} Hundred`
      n %= 100
      if (n) result += ' '
    }

    if (n) result += belowHundred(n)

    return result
  }

  let result = ''

  if (num >= 10000000) {
    result += `${numberToWords(Math.floor(num / 10000000))} Crore `
    num %= 10000000
  }

  if (num >= 100000) {
    result += `${numberToWords(Math.floor(num / 100000))} Lakh `
    num %= 100000
  }

  if (num >= 1000) {
    result += `${belowThousand(Math.floor(num / 1000))} Thousand `
    num %= 1000
  }

  if (num > 0) {
    result += belowThousand(num)
  }

  return result.trim()
}

export async function generateDispatchInvoice(dispatch, sessions) {
  const closedSessions = (sessions || []).filter(
    s => s.closed || s.isClosed
  )

  if (closedSessions.length === 0) {
    alert(
      'Bill banane ke liye pehle kam se kam ek machli ka wajan complete karo.'
    )
    return
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()

  const LEFT = 14
  const RIGHT = pageWidth - 14
  const CONTENT_WIDTH = pageWidth - 28

  // =========================================================
  // TOP BLUE LINE
  // =========================================================

  doc.setFillColor(12, 151, 198)
  doc.rect(LEFT, 14, CONTENT_WIDTH, 1.5, 'F')

  // =========================================================
  // COMPANY HEADER - LEFT
  // =========================================================

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(20)

  doc.text('MUSHTAQUE FISH TRADERS', LEFT, 28)

  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(12, 151, 198)

  doc.text('WHOLESALE & RETAIL  FRESH SEAFOOD', LEFT, 36)

  doc.setFont('helvetica', 'normal')
doc.setFontSize(7.5)
doc.setTextColor(100, 110, 120)

doc.text(
  'Nakthar, Siddharth Nagar, Uttar Pradesh - 272207',
  LEFT,
  42
)

doc.setFont('helvetica', 'bold')
doc.setTextColor(70, 80, 90)

doc.text(
  'Phone: +91 7081458197  |  GSTIN: 4637424372',
  LEFT,
  47
)

//   doc.setFont('helvetica', 'normal')
//   doc.setFontSize(8)
//   doc.setTextColor(100, 110, 120)

//   doc.text(
//     'Fresh fish weighing, dispatch & inventory management',
//     LEFT,
//     42
//   )

  // =========================================================
  // INVOICE - RIGHT
  // =========================================================

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(12, 151, 198)

  doc.text('INVOICE', RIGHT, 28, {
    align: 'right',
  })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(95, 105, 115)

  doc.text(
    `Invoice No: ${dispatch.dispatchNumber || '-'}`,
    RIGHT,
    36,
    { align: 'right' }
  )

  doc.text(
    `Date: ${formatDate(dispatch.dispatchDate)}`,
    RIGHT,
    41,
    { align: 'right' }
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(45, 55, 65)

  doc.text(
    'Payment Mode: As Agreed',
    RIGHT,
    46,
    { align: 'right' }
  )

  // =========================================================
  // DISPATCH / BILLED TO BOX
  // =========================================================

  const infoY = 55
  const infoH = 31

  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(224, 229, 234)
  doc.setLineWidth(0.3)

  doc.rect(
    LEFT,
    infoY,
    CONTENT_WIDTH,
    infoH,
    'FD'
  )

  // left information

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(145, 155, 165)

  doc.text(
    'DISPATCH DETAILS',
    LEFT + 5,
    infoY + 7
  )

  doc.setFontSize(11)
  doc.setTextColor(25, 35, 45)

  doc.text(
    dispatch.vehicleNumber || '-',
    LEFT + 5,
    infoY + 14
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(90, 100, 110)

  doc.text(
    `Driver: ${dispatch.driverName || '-'}`,
    LEFT + 5,
    infoY + 21
  )

  doc.text(
    `Mobile: ${dispatch.driverPhone || '-'}`,
    LEFT + 5,
    infoY + 26
  )

  // STATUS

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(145, 155, 165)

  doc.text(
    'STATUS',
    RIGHT - 6,
    infoY + 9,
    { align: 'right' }
  )

  doc.setFillColor(220, 252, 231)

  doc.roundedRect(
    RIGHT - 37,
    infoY + 13,
    31,
    9,
    4,
    4,
    'F'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(22, 120, 70)

  doc.text(
    'CONFIRMED',
    RIGHT - 21.5,
    infoY + 19,
    { align: 'center' }
  )

  // =========================================================
  // TABLE
  // =========================================================

  let y = 92

  const col = {
    no: LEFT + 5,
    fish: LEFT + 18,
    qty: 126,
    rate: 157,
    amount: RIGHT - 4,
  }

  // Header

  doc.setFillColor(15, 23, 42)
  doc.rect(
    LEFT,
    y,
    CONTENT_WIDTH,
    15,
    'F'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(255, 255, 255)

  doc.text('SL.', col.no, y + 6)
  doc.text('NO.', col.no, y + 10)

  doc.text(
    'FISH TYPE / DESCRIPTION',
    col.fish,
    y + 8
  )

  doc.text(
    'QTY (KG)',
    col.qty,
    y + 8,
    { align: 'right' }
  )

  doc.text(
    'RATE / KG',
    col.rate,
    y + 6,
    { align: 'right' }
  )

  doc.text(
    '(Rs.)',
    col.rate,
    y + 10,
    { align: 'right' }
  )

  doc.text(
    'AMOUNT (Rs.)',
    col.amount,
    y + 8,
    { align: 'right' }
  )

  y += 15

  // =========================================================
  // TABLE ROWS
  // =========================================================

  let grandTotal = 0
  let totalNetWeight = 0

  closedSessions.forEach((session, index) => {
    const fishName =
      session.fishTypeName ||
      session.fishType?.name ||
      'Fish'

    const netWeight =
      Number(session.netWeightKg || 0)

    const rate =
      Number(session.ratePerKg || 0)

    const amount =
      Number(session.totalAmount || 0)

    // Only for invoice display.
    // Existing backend calculation is untouched.

    const rowHeight = 17

    // Alternate background

    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252)

      doc.rect(
        LEFT,
        y,
        CONTENT_WIDTH,
        rowHeight,
        'F'
      )
    }

    // serial

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(80, 90, 100)

    doc.text(
      String(index + 1).padStart(2, '0'),
      col.no,
      y + 9
    )

    // fish name

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(25, 35, 45)

    let displayFish = fishName

    if (displayFish.length > 28) {
      displayFish =
        displayFish.substring(0, 26) + '...'
    }

    doc.text(
      displayFish,
      col.fish,
      y + 7
    )

    // fish description

//     doc.setFont('helvetica', 'normal')
//     doc.setFontSize(6.5)
//     doc.setTextColor(120, 130, 140)

//     const pondText = session.pondName
//   ? `${session.pondNumber ? session.pondNumber + ' - ' : ''}${session.pondName}`
//   : 'Pond not assigned'

// doc.text(
//   pondText,
//   col.fish,
//   y + 12
// )

    // doc.text(
    //   col.fish,
    //   y + 12
    // )

    // qty

    doc.setFontSize(8)
    doc.setTextColor(70, 80, 90)

    doc.text(
      weight(netWeight),
      col.qty,
      y + 9,
      { align: 'right' }
    )

    // rate

    doc.text(
      money(rate),
      col.rate,
      y + 9,
      { align: 'right' }
    )

    // amount

    doc.setFont('helvetica', 'bold')
    doc.setTextColor(25, 35, 45)

    doc.text(
      money(amount),
      col.amount,
      y + 9,
      { align: 'right' }
    )

    grandTotal += amount
    totalNetWeight += netWeight

    y += rowHeight
  })

  // =========================================================
  // AMOUNT / TOTAL SECTION
  // =========================================================

  y += 9

  const summaryX = 121

  // Left-side note

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7)
  doc.setTextColor(100, 110, 120)

 doc.setFont('helvetica', 'bold')
doc.setFontSize(7)
doc.setTextColor(100, 110, 120)

doc.text(
  'Amount in Words:',
  LEFT,
  y
)

doc.setFont('helvetica', 'normal')
doc.setFontSize(7)
doc.setTextColor(130, 140, 150)

const amountWords = `${numberToWords(grandTotal)} Rupees Only`

const amountWordLines = doc.splitTextToSize(
  amountWords,
  90
)

doc.text(
  amountWordLines,
  LEFT,
  y + 6
)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(130, 140, 150)

//   doc.text(
//     `${closedSessions.length} fish type(s) included in this dispatch`,
//     LEFT,
//     y + 6
//   )

//   doc.text(
//     `Total net weight: ${weight(totalNetWeight)} kg`,
//     LEFT,
//     y + 11
//   )

  // Right totals

  doc.setFontSize(8)
  doc.setTextColor(100, 110, 120)

  doc.text(
    'Subtotal:',
    summaryX,
    y
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(35, 45, 55)

  doc.text(
    `Rs. ${money(grandTotal)}`,
    RIGHT,
    y,
    { align: 'right' }
  )

  y += 8

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 110, 120)

  doc.text(
    'Total Net Weight:',
    summaryX,
    y
  )

  doc.setFont('helvetica', 'bold')
  doc.setTextColor(35, 45, 55)

  doc.text(
    `${weight(totalNetWeight)} kg`,
    RIGHT,
    y,
    { align: 'right' }
  )

  y += 7

  // blue divider

  doc.setDrawColor(12, 151, 198)
  doc.setLineWidth(0.6)

  doc.line(
    summaryX,
    y,
    RIGHT,
    y
  )

  y += 9

  // TOTAL PAYABLE

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(12, 151, 198)

  doc.text(
    'Total Payable:',
    summaryX,
    y
  )

  doc.setFontSize(14)

  doc.text(
    `Rs. ${money(grandTotal)}`,
    RIGHT,
    y,
    { align: 'right' }
  )

  // =========================================================
  // BOTTOM SEPARATOR
  // =========================================================

//   const footerY = 232

const footerY = Math.max(y + 20, 165)

  doc.setDrawColor(230, 234, 238)
  doc.setLineWidth(0.3)

  doc.line(
    LEFT,
    footerY,
    RIGHT,
    footerY
  )

  // =========================================================
  // TERMS BOX
  // =========================================================

  const termsY = footerY + 5

  doc.setFillColor(249, 250, 251)

  doc.rect(
    LEFT,
    termsY,
    72,
    45,
    'F'
  )

  // blue side line

  doc.setFillColor(12, 151, 198)

  doc.rect(
    LEFT,
    termsY,
    1,
    45,
    'F'
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(35, 45, 55)

  doc.text(
    'TERMS & CONDITIONS',
    LEFT + 5,
    termsY + 7
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(100, 110, 120)

  const terms = [
    '1. Weight is based on recorded basket weighing.',
    '2. Final amount is calculated on net weight.',
    '3. Rate is as agreed at dispatch time.',
    '4. Please verify bill details before payment.',
  ]

  let termsLineY = termsY + 14

  terms.forEach(term => {
    const lines =
      doc.splitTextToSize(term, 61)

    doc.text(
      lines,
      LEFT + 5,
      termsLineY
    )

    termsLineY +=
      lines.length * 4 + 2
  })

  // =========================================================
  // SIGNATURE
  // =========================================================

  const signatureCenter = 157

  doc.setDrawColor(110, 120, 130)
  doc.setLineWidth(0.3)

  doc.line(
    signatureCenter - 22,
    termsY + 28,
    signatureCenter + 22,
    termsY + 28
  )

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(35, 45, 55)

  doc.text(
    'For  MUSHTAQUE FISH TRADERS',
    signatureCenter,
    termsY + 36,
    { align: 'center' }
  )

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(100, 110, 120)

  doc.text(
    'Authorized',
    signatureCenter,
    termsY + 42,
    { align: 'center' }
  )

  doc.text(
    'Signatory',
    signatureCenter,
    termsY + 47,
    { align: 'center' }
  )

  return doc
}