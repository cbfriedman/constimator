import { getCostItemsData } from "@/app/cost-setup/actions"
import { CostSetupShell } from "@/components/cost-setup/cost-setup-shell"
import {
  toEquipmentRates,
  toLaborRates,
  toMarginFields,
} from "@/lib/cost-setup-view"

export default async function CostSetupPage() {
  const rows = await getCostItemsData()

  return (
    <CostSetupShell
      initialLabor={toLaborRates(rows)}
      initialEquipment={toEquipmentRates(rows)}
      initialMargins={toMarginFields(rows)}
    />
  )
}
