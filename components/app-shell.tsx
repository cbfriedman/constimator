"use client"

import { usePathname } from "next/navigation"

import { AppSidebar } from "@/components/app-sidebar"
import { AuthHashErrorToast } from "@/components/auth-hash-error-toast"
import { BillingGate } from "@/components/billing-gate"
import { PrototypeBanner } from "@/components/prototype-banner"
import {
  ProjectStateProvider,
  ResettableMain,
} from "@/components/project-state-provider"
import { TopBar } from "@/components/top-bar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { ProjectStateSnapshot } from "@/lib/project-state-actions"

// Routes rendered without the dashboard sidebar: public marketing pages
// plus the auth pages, which unauthenticated visitors must be able to reach.
const NO_SIDEBAR_PATHS = new Set([
  "/",
  "/demo-guide",
  "/sign-in",
  "/sign-up",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
  "/terms",
  "/privacy",
  "/maintenance",
])

export function AppShell({
  children,
  initialProjectState,
}: {
  children: React.ReactNode
  initialProjectState: ProjectStateSnapshot | null
}) {
  const pathname = usePathname()
  const isNoSidebar = NO_SIDEBAR_PATHS.has(pathname)
  const isMaintenance = pathname === "/maintenance"

  return (
    <ProjectStateProvider initialProjectState={initialProjectState}>
      <AuthHashErrorToast />
      {isMaintenance ? (
        children
      ) : isNoSidebar ? (
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
            <ResettableMain className="flex flex-1 flex-col overflow-auto">
              <BillingGate>{children}</BillingGate>
            </ResettableMain>
          </SidebarInset>
        </SidebarProvider>
      )}
    </ProjectStateProvider>
  )
}
