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

// Routes rendered without the dashboard sidebar: public marketing pages
// plus the auth pages, which unauthenticated visitors must be able to reach.
const NO_SIDEBAR_PATHS = new Set(["/", "/demo-guide", "/sign-in", "/sign-up"])

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isNoSidebar = NO_SIDEBAR_PATHS.has(pathname)

  return (
    <ProjectStateProvider>
      {isNoSidebar ? (
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
