import jsPDF from "jspdf"

export async function downloadReportAsPdf(
  reportType: string,
  reportLabel: string,
  fetchUrl: string,
): Promise<void> {
  const res = await fetch(fetchUrl)
  if (!res.ok) throw new Error("Failed to fetch report data")

  const csvText = await res.text()
  const lines = csvText.trim().split("\n")
  if (lines.length < 2) throw new Error("Report has no data")

  const headers = parseCsvLine(lines[0])
  const rows = lines.slice(1).map(parseCsvLine)

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" })

  const pageW = doc.internal.pageSize.getWidth()
  const margin = 10
  const availableW = pageW - margin * 2
  const colW = Math.min(40, availableW / Math.max(headers.length, 1))

  doc.setFontSize(14)
  doc.text(`${reportLabel} Report`, margin, 20)

  doc.setFontSize(8)
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, margin, 26)

  const headerY = 32
  doc.setFontSize(7)
  doc.setFont("helvetica", "bold")

  let x = margin
  for (const h of headers) {
    doc.text(h, x, headerY)
    x += colW
  }

  doc.setFont("helvetica", "normal")
  let y = headerY + 5
  for (const row of rows) {
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage()
      y = margin + 5
    }
    x = margin
    for (const cell of row) {
      const display = String(cell ?? "").substring(0, 30)
      doc.text(display, x, y)
      x += colW
    }
    y += 4
  }

  const now = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  doc.save(`${reportType.toLowerCase()}_report_${dateStr}.pdf`)
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ""
  let inQuotes = false
  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim())
      current = ""
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}
