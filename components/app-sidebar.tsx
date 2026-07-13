"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Files,
  Table2,
  Calculator,
  GitCompareArrows,
  UserCheck,
  BarChart3,
  HardHat,
  Settings,
  HelpCircle,
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
import { Badge } from "@/components/ui/badge"
import { demoProject } from "@/lib/demo-data"

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
]

type NavBadge = { text: string; tone: "danger" | "review" }

const projectNav: {
  title: string
  href: string
  icon: typeof FileText
  badge?: NavBadge
}[] = [
  { title: "Overview", href: "/intelligence", icon: FileText },
  { title: "Documents", href: "/upload", icon: Files },
  { title: "Schedules & Tables", href: "/schedules", icon: Table2 },
  { title: "Estimate Workspace", href: "/estimate", icon: Calculator },
  {
    title: "Bid Form Reconciliation",
    href: "/reconciliation",
    icon: GitCompareArrows,
    badge: { text: "3", tone: "danger" },
  },
  {
    title: "Human Review",
    href: "/review",
    icon: UserCheck,
    badge: { text: "In review", tone: "review" },
  },
  { title: "Reports", href: "/reports", icon: BarChart3 },
]

const footerNav = [
  { title: "Settings", href: "#", icon: Settings },
  { title: "Help", href: "#", icon: HelpCircle },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HardHat className="size-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold leading-tight">Constimator</span>
            <span className="text-xs text-muted-foreground leading-tight">AI Estimating</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase" title={demoProject.name}>
            {demoProject.name}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {projectNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    render={<Link href={item.href} />}
                    isActive={pathname === item.href}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge
                      render={
                        <Badge
                          className={
                            item.badge.tone === "danger"
                              ? "border-transparent bg-destructive text-white"
                              : "border-transparent bg-review/15 text-review"
                          }
                        />
                      }
                    >
                      {item.badge.text}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          {footerNav.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton render={<Link href={item.href} />}>
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
