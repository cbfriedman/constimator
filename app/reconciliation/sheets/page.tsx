import { getSheetMatrixData } from "@/app/reconciliation/sheets/actions"
import { SheetMatrixShell } from "@/components/reconciliation/sheet-matrix"

export default async function SheetMatrixPage() {
  const data = await getSheetMatrixData()
  return <SheetMatrixShell data={data} />
}
