"use client"

import { usePathname } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { PrototypeBanner } from "@/components/prototype-banner"
import {
  ProjectStateProvider,
  ResettableMain,
} from "@/components/project-state-provider"
import { TopBar } from "@/components/top-bar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

const MARKETING_PATHS = new Set(["/", "/demo-guide"])

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isMarketing = MARKETING_PATHS.has(pathname)

  return (
    <ProjectStateProvider>
      {isMarketing ? (
        <div className="flex min-h-svh flex-col">
          <PrototypeBanner />
          {children}
        </div>
      ) : (
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <PrototypeBanner />
            <TopBar />
            <ResettableMain className="flex-1 overflow-auto">
              {children}
            </ResettableMain>
          </SidebarInset>
        </SidebarProvider>
      )}
    </ProjectStateProvider>
  )
}
