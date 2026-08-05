import { getSettingsData } from "@/app/settings/actions"
import { SettingsShell } from "@/components/settings/settings-shell"

export default async function SettingsPage() {
  const data = await getSettingsData()

  return <SettingsShell {...data} />
}
