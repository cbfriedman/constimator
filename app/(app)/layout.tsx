import {
  ProjectStateProvider,
  ResettableMain,
} from "@/components/project-state-provider"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { TopBar } from "@/components/top-bar"

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ProjectStateProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <TopBar />
          <ResettableMain className="flex-1 overflow-auto">
            {children}
          </ResettableMain>
        </SidebarInset>
      </SidebarProvider>
    </ProjectStateProvider>
  )
}
