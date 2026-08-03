import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

// A small, clearly-fake bid form — enough real-looking line-item text for
// Claude to have something to extract, without needing a real plan set
// (none is available in this environment). Kept to 2 pages so each
// concurrent job's rasterize + vision-extract cost stays bounded — this is
// a concurrency/timing test, not an accuracy test (see step 21 for that).
const LINE_ITEMS = [
  ["1", "Mobilization", "1", "LS"],
  ["2", "Clearing and Grubbing", "3.5", "AC"],
  ["3", "Unclassified Excavation", "12400", "CY"],
  ["4", "Aggregate Base Course", "8600", "TON"],
  ["5", "Hot Mix Asphalt Pavement", "2100", "TON"],
  ["6", "Storm Drain Pipe, 18-inch RCP", "940", "LF"],
  ["7", "Curb and Gutter", "3200", "LF"],
  ["8", "Pavement Striping", "1", "LS"],
]

export async function generateLoadTestPdf(label: string): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const page1 = doc.addPage([612, 792])
  page1.drawText("TEST BID SCHEDULE — LOAD TEST DATA, NOT A REAL PROJECT", {
    x: 50,
    y: 740,
    size: 14,
    font: bold,
    color: rgb(0.7, 0, 0),
  })
  page1.drawText(`Load test batch: ${label}`, { x: 50, y: 715, size: 10, font })
  page1.drawText("Project: Synthetic Roadway Rehabilitation — Load Test", {
    x: 50,
    y: 695,
    size: 11,
    font,
  })

  let y = 650
  page1.drawText("Item", { x: 50, y, size: 10, font: bold })
  page1.drawText("Description", { x: 100, y, size: 10, font: bold })
  page1.drawText("Qty", { x: 380, y, size: 10, font: bold })
  page1.drawText("Unit", { x: 440, y, size: 10, font: bold })
  y -= 20

  for (const [item, desc, qty, unit] of LINE_ITEMS) {
    page1.drawText(item, { x: 50, y, size: 10, font })
    page1.drawText(desc, { x: 100, y, size: 10, font })
    page1.drawText(qty, { x: 380, y, size: 10, font })
    page1.drawText(unit, { x: 440, y, size: 10, font })
    y -= 18
  }

  const page2 = doc.addPage([612, 792])
  page2.drawText("Sheet 2 — Notes", { x: 50, y: 740, size: 14, font: bold })
  page2.drawText(
    "This document was generated for a bounded concurrency/load test of the",
    { x: 50, y: 710, size: 10, font },
  )
  page2.drawText(
    "Constimator takeoff pipeline (docs/ROADMAP.md step 36). It does not", {
      x: 50,
      y: 695,
      size: 10,
      font,
    },
  )
  page2.drawText(
    "represent a real project and should never appear in production data.",
    { x: 50, y: 680, size: 10, font },
  )

  const bytes = await doc.save()
  return Buffer.from(bytes)
}
