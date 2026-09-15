"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  FolderKanban,
  SlidersHorizontal,
  Brain,
  Files,
  Table2,
  Calculator,
  ClipboardList,
  Columns3,
  FileCheck2,
  FileUp,
  GitCompareArrows,
  Grid3x3,
  UserCheck,
  BarChart3,
  HardHat,
  CreditCard,
  Users,
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
import { useProjectState } from "@/components/project-state-provider"
import { withProjectQuery } from "@/lib/project-scope"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import styles from "@/components/workspace.module.css"

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderKanban },
  { title: "Upload Documents", href: "/upload", icon: Files },
  { title: "Project Intelligence", href: "/intelligence", icon: Brain },
  { title: "Schedules & Tables", href: "/schedules", icon: Table2 },
  { title: "Cost Setup", href: "/cost-setup", icon: SlidersHorizontal },
  { title: "Upload Sub Quotes", href: "/sub-quotes/upload", icon: FileUp },
  { title: "Review Sub Quotes", href: "/sub-quotes", icon: FileCheck2 },
  { title: "Compare Quotes", href: "/sub-quotes/compare", icon: Columns3 },
  { title: "Upload Plan Holders", href: "/plan-holders/upload", icon: FileUp },
  { title: "Review Plan Holders", href: "/plan-holders", icon: ClipboardList },
  { title: "Estimate Workspace", href: "/estimate", icon: Calculator },
  {
    title: "Bid Reconciliation",
    href: "/reconciliation",
    icon: GitCompareArrows,
    attentionBadge: true,
  },
  {
    title: "Sheet Reconciliation",
    href: "/reconciliation/sheets",
    icon: Grid3x3,
  },
  {
    title: "Human Review",
    href: "/review",
    icon: UserCheck,
    reviewBadge: true,
  },
  { title: "Reports", href: "/reports", icon: BarChart3 },
]

const footerNav = [
  { title: "Team", href: "/team", icon: Users },
  { title: "Billing", href: "/billing", icon: CreditCard },
  { title: "Settings", href: "/settings", icon: Settings },
  { title: "Help", href: "/help", icon: HelpCircle },
]

function isActivePath(pathname: string, href: string) {
  if (href === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/")
  }
  return pathname === href
}

export function AppSidebar() {
  const pathname = usePathname()
  const {
    attentionCount,
    costSetupComplete,
    currentProjectId,
    currentProjectName,
    currentProjectNumber,
    projects,
    reviewStatus,
    selectProject,
  } = useProjectState()
  const router = useRouter()

  return (
    <Sidebar className={styles.sidebar}>
      <div className={styles.sidebarBody}>
        <SidebarHeader className={styles.sidebarHeader}>
          <Link href="/" className={styles.brand}>
            <div className={styles.brandIcon}>
              <HardHat className="size-5" />
            </div>
            <span className={styles.brandName}>Constimator</span>
          </Link>
        </SidebarHeader>
        <SidebarContent className={styles.sidebarContent}>
          <SidebarGroup className={styles.navGroup}>
            <SidebarGroupLabel className={styles.groupLabel}>
              Contractor Workspace
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className={styles.navMenu}>
                {mainNav.map((item) => {
                  const showSetupDot =
                    item.href === "/cost-setup" && !costSetupComplete
                  const showAttention =
                    "attentionBadge" in item &&
                    item.attentionBadge &&
                    attentionCount > 0
                  const showReview =
                    "reviewBadge" in item &&
                    item.reviewBadge &&
                    (reviewStatus === "requested" ||
                      reviewStatus === "in_progress")
                  const href = withProjectQuery(item.href, currentProjectId)
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        render={<Link href={href} />}
                        isActive={isActivePath(pathname, item.href)}
                        className={styles.navButton}
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
                      {showAttention ? (
                        <SidebarMenuBadge className="border-transparent bg-destructive text-white">
                          {attentionCount}
                        </SidebarMenuBadge>
                      ) : null}
                      {showReview ? (
                        <SidebarMenuBadge className="border-transparent bg-review/15 text-review">
                          In review
                        </SidebarMenuBadge>
                      ) : null}
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
          {currentProjectName ? (
            <SidebarGroup className={styles.projectGroup}>
              <SidebarGroupLabel className={styles.groupLabel}>
                Current Project
              </SidebarGroupLabel>
              <SidebarGroupContent className="px-2">
                {projects.length > 1 ? (
                  <Select
                    value={currentProjectId ?? undefined}
                    onValueChange={(value) => {
                      if (!value) return
                      selectProject(value).then(() => {
                        router.push(withProjectQuery(pathname, value))
                        router.refresh()
                      })
                    }}
                  >
                    <SelectTrigger
                      size="sm"
                      className={styles.projectSelect}
                      aria-label="Current project"
                    >
                      <SelectValue>
                        {() => (
                          <span className="truncate text-left text-xs">
                            {currentProjectName}
                            {currentProjectNumber
                              ? ` · #${currentProjectNumber}`
                              : ""}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className={styles.popup}>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                          {project.number ? ` · #${project.number}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className={styles.currentProject}>
                    {currentProjectName}
                    {currentProjectNumber ? ` · #${currentProjectNumber}` : ""}
                  </p>
                )}
              </SidebarGroupContent>
            </SidebarGroup>
          ) : null}
        </SidebarContent>
        <SidebarFooter className={styles.sidebarFooter}>
          <SidebarMenu>
            {footerNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  render={<Link href={item.href} />}
                  isActive={item.href !== "#" && pathname === item.href}
                  className={styles.navButton}
                >
                  <item.icon />
                  <span>{item.title}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarFooter>
      </div>
    </Sidebar>
  )
}
