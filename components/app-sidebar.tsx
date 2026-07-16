"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  SlidersHorizontal,
  Brain,
  Files,
  Table2,
  Calculator,
  GitCompareArrows,
  UserCheck,
  BarChart3,
  HardHat,
  Settings,
  HelpCircle,
  BookOpen,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useProjectState } from "@/components/project-state-provider"
import { demoProject } from "@/lib/mock-data"

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Upload Documents", href: "/upload", icon: Files },
  { title: "Project Intelligence", href: "/intelligence", icon: Brain },
  { title: "Schedules & Tables", href: "/schedules", icon: Table2 },
  { title: "Cost Setup", href: "/cost-setup", icon: SlidersHorizontal },
  { title: "Estimate Workspace", href: "/estimate", icon: Calculator },
  {
    title: "Bid Reconciliation",
    href: "/reconciliation",
    icon: GitCompareArrows,
    badge: { text: "3", tone: "danger" as const },
  },
  {
    title: "Human Review",
    href: "/review",
    icon: UserCheck,
    badge: { text: "In review", tone: "review" as const },
  },
  { title: "Reports", href: "/reports", icon: BarChart3 },
]

const footerNav = [
  { title: "OPS Demo Guide", href: "/demo-guide", icon: BookOpen },
  { title: "Settings", href: "#", icon: Settings },
  { title: "Help", href: "#", icon: HelpCircle },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/")
  }
  return pathname === href
}

export function AppSidebar() {
  const pathname = usePathname()
  const { attentionCount, costSetupComplete } = useProjectState()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 outline-none hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-sidebar-ring"
        >
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">
              Constimator
            </span>
            <span className="text-xs leading-tight text-muted-foreground">
              AI Estimating
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase">
            Contractor Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => {
                const showSetupDot =
                  item.href === "/cost-setup" && !costSetupComplete
                const badgeText =
                  item.href === "/reconciliation" && item.badge
                    ? String(attentionCount)
                    : item.badge?.text
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      render={<Link href={item.href} />}
                      isActive={isActivePath(pathname, item.href)}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                    {showSetupDot ? (
                      <SidebarMenuBadge className="border-transparent bg-transparent">
                        <span
                          className="size-2 rounded-full bg-warning"
                          aria-label="Cost setup incomplete"
                        />
                      </SidebarMenuBadge>
                    ) : null}
                    {item.badge && !showSetupDot ? (
                      <SidebarMenuBadge
                        className={
                          item.badge.tone === "danger"
                            ? "border-transparent bg-destructive text-white"
                            : "border-transparent bg-review/15 text-review"
                        }
                      >
                        {badgeText}
                      </SidebarMenuBadge>
                    ) : null}
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase" title={demoProject.name}>
            Demo Project
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="px-2 text-xs leading-relaxed text-muted-foreground">
              {demoProject.name} · #{demoProject.number}
            </p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {footerNav.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                render={<Link href={item.href} />}
                isActive={item.href !== "#" && pathname === item.href}
              >
                <item.icon />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
