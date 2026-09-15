"use client"

import { useId, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  BarChart3,
  Check,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  FileCheck2,
  FileText,
  FolderOpen,
  HardHat,
  LayoutDashboard,
  ListChecks,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TriangleAlert,
  Upload,
  Users,
} from "lucide-react"

import styles from "./dashboard-preview.module.css"

const tabs = [
  "Overview",
  "Bid Reconciliation",
  "Line Items",
  "Documents",
] as const
type Tab = (typeof tabs)[number]

const sampleItems = [
  {
    id: "001",
    name: "Roadway excavation",
    quantity: "12,400",
    unit: "CY",
    status: "Matched",
  },
  {
    id: "002",
    name: "Hot mix asphalt",
    quantity: "8,250",
    unit: "TON",
    status: "Matched",
  },
  {
    id: "003",
    name: "Temporary traffic control",
    quantity: "1",
    unit: "LS",
    status: "Missing",
  },
  {
    id: "004",
    name: "18-inch drainage pipe",
    quantity: "640",
    unit: "LF",
    status: "Unit mismatch",
  },
  {
    id: "005",
    name: "Erosion control blanket",
    quantity: "3,100",
    unit: "SY",
    status: "Matched",
  },
]

const categories = [
  { name: "Roadway", count: 420, width: "100%" },
  { name: "Drainage", count: 312, width: "74%" },
  { name: "Structures", count: 206, width: "49%" },
  { name: "Traffic Control", count: 180, width: "43%" },
  { name: "Environmental", count: 130, width: "31%" },
]

const documents = [
  {
    name: "Official bid schedule.pdf",
    detail: "24 pages · Bid form",
    status: "Analyzed",
  },
  {
    name: "Roadway improvement plans.pdf",
    detail: "86 pages · Plans",
    status: "Analyzed",
  },
  {
    name: "Project specifications.pdf",
    detail: "142 pages · Specifications",
    status: "Analyzed",
  },
  {
    name: "Contractor estimate.xlsx",
    detail: "1,220 items · Estimate",
    status: "Reconciled",
  },
]

export function DashboardPreview() {
  const [activeTab, setActiveTab] = useState<Tab>("Overview")
  const [search, setSearch] = useState("")
  const previewId = useId()
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const visibleItems = sampleItems.filter((item) =>
    `${item.name} ${item.status} ${item.unit}`
      .toLowerCase()
      .includes(search.toLowerCase())
  )

  function selectTab(tab: Tab) {
    setActiveTab(tab)
    setSearch("")
  }

  return (
    <section
      className={styles.preview}
      aria-label="Interactive Constimator sample project"
    >
      <div className={styles.workspace}>
        <aside
          className={styles.sidebar}
          aria-label="Sample workspace navigation"
        >
          <div className={styles.brand}>
            <span className={styles.brandIcon}>
              <HardHat size={17} aria-hidden="true" />
            </span>
            <span>Constimator</span>
          </div>
          <div className={styles.sidebarBody}>
            <span className={styles.eyebrow}>CONTRACTOR WORKSPACE</span>
            <button
              type="button"
              className={
                activeTab === "Overview" ? styles.sideActive : styles.sideLink
              }
              onClick={() => selectTab("Overview")}
            >
              <LayoutDashboard aria-hidden="true" /> Dashboard
            </button>
            <Link className={styles.sideLink} href="/demo-guide">
              <FolderOpen aria-hidden="true" /> Projects
            </Link>
            <button
              type="button"
              className={
                activeTab === "Documents" ? styles.sideActive : styles.sideLink
              }
              onClick={() => selectTab("Documents")}
            >
              <Upload aria-hidden="true" /> Upload Documents
            </button>
            <Link className={styles.sideLink} href="/demo-guide">
              <Sparkles aria-hidden="true" /> Project Intelligence
            </Link>
            <button
              type="button"
              className={
                activeTab === "Line Items" ? styles.sideActive : styles.sideLink
              }
              onClick={() => selectTab("Line Items")}
            >
              <ListChecks aria-hidden="true" /> Schedules &amp; Tables
            </button>
            <Link className={styles.sideLink} href="/demo-guide">
              <SlidersHorizontal aria-hidden="true" /> Cost Setup{" "}
              <i className={styles.orangeDot} />
            </Link>
            <div className={styles.sideDivider} />
            <Link className={styles.sideLink} href="/demo-guide">
              <FileText aria-hidden="true" /> Subcontractor Quotes
            </Link>
            <Link className={styles.sideLink} href="/demo-guide">
              <Users aria-hidden="true" /> Plan Holders
            </Link>
            <button
              type="button"
              className={
                activeTab === "Bid Reconciliation"
                  ? styles.sideActive
                  : styles.sideLink
              }
              onClick={() => selectTab("Bid Reconciliation")}
            >
              <ClipboardCheck aria-hidden="true" /> Bid Reconciliation{" "}
              <span className={styles.alertCount}>42</span>
            </button>
            <Link className={styles.sideLink} href="/demo-guide">
              <ShieldCheck aria-hidden="true" /> Human Review
            </Link>
            <Link className={styles.sideLink} href="/demo-guide">
              <BarChart3 aria-hidden="true" /> Reports
            </Link>
            <span className={`${styles.eyebrow} ${styles.projectLabel}`}>
              CURRENT PROJECT
            </span>
            <div className={styles.currentProject}>
              <span>Shasta County Roadway</span>
              <ChevronDown size={10} aria-hidden="true" />
            </div>
            <div className={styles.sidebarBottom}>
              <Link className={styles.sideLink} href="/demo-guide">
                <Settings2 aria-hidden="true" /> Workspace Settings
              </Link>
              <Link className={styles.sideLink} href="/help">
                <CircleHelp aria-hidden="true" /> Help &amp; Support
              </Link>
            </div>
          </div>
        </aside>

        <div className={styles.main}>
          <div className={styles.toolbar}>
            <label className={styles.search}>
              <Search size={12} aria-hidden="true" />
              <input
                aria-label="Search sample line items"
                placeholder="Search sample line items..."
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value)
                  setActiveTab("Line Items")
                }}
              />
            </label>
            <Link href="/sign-up" className={styles.newProject}>
              <Plus size={12} aria-hidden="true" /> New Project
            </Link>
            <span className={styles.toolbarDivider} />
            <div className={styles.avatar} aria-hidden="true">
              GC
            </div>
            <div className={styles.account}>
              <strong>Your workspace</strong>
              <span>General contractor</span>
            </div>
          </div>

          <div className={styles.content}>
            <div className={styles.projectHeading}>
              <div>
                <span className={styles.sampleLabel}>
                  <span /> LIVE PREVIEW · SAMPLE PROJECT
                </span>
                <h3>Shasta County Roadway Improvements</h3>
              </div>
              <span className={styles.inProgress}>In progress</span>
            </div>

            <div className={styles.tabRow}>
              <div
                className={styles.tabs}
                role="tablist"
                aria-label="Sample project views"
              >
                {tabs.map((tab, index) => (
                  <button
                    key={tab}
                    ref={(element) => {
                      tabRefs.current[index] = element
                    }}
                    id={`${previewId}-tab-${index}`}
                    type="button"
                    role="tab"
                    aria-selected={activeTab === tab}
                    aria-controls={`${previewId}-panel`}
                    tabIndex={activeTab === tab ? 0 : -1}
                    className={
                      activeTab === tab ? styles.activeTab : styles.tab
                    }
                    onClick={() => selectTab(tab)}
                    onKeyDown={(event) => {
                      let nextIndex = index
                      if (event.key === "ArrowRight")
                        nextIndex = (index + 1) % tabs.length
                      else if (event.key === "ArrowLeft")
                        nextIndex = (index + tabs.length - 1) % tabs.length
                      else if (event.key === "Home") nextIndex = 0
                      else if (event.key === "End") nextIndex = tabs.length - 1
                      else return
                      event.preventDefault()
                      selectTab(tabs[nextIndex])
                      tabRefs.current[nextIndex]?.focus()
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <Link className={styles.demoLink} href="/demo-guide">
                Full demo <ArrowUpRight size={12} aria-hidden="true" />
              </Link>
            </div>

            <div
              id={`${previewId}-panel`}
              role="tabpanel"
              aria-labelledby={`${previewId}-tab-${tabs.indexOf(activeTab)}`}
              className={styles.panel}
              tabIndex={0}
            >
              {activeTab === "Overview" ? (
                <>
                  <div className={styles.stats}>
                    <Stat
                      icon={FileText}
                      label="Total Items"
                      value="1,248"
                      detail="Across all documents"
                      tone="blue"
                    />
                    <Stat
                      icon={Check}
                      label="Matched Items"
                      value="1,206"
                      detail="96.6% matched"
                      tone="green"
                    />
                    <Stat
                      icon={TriangleAlert}
                      label="Missing Items"
                      value="28"
                      detail="2.2% of bid items"
                      tone="red"
                    />
                    <Stat
                      icon={TriangleAlert}
                      label="Mismatched"
                      value="14"
                      detail="1.2% to review"
                      tone="amber"
                    />
                  </div>

                  <div className={styles.chartGrid}>
                    <div className={styles.card}>
                      <h4>Reconciliation Summary</h4>
                      <div className={styles.donutContent}>
                        <div
                          className={styles.donut}
                          role="img"
                          aria-label="1,248 total items: 1,206 matched, 28 missing, 14 mismatched"
                        >
                          <div>
                            <strong>1,248</strong>
                            <span>Total Items</span>
                          </div>
                        </div>
                        <div className={styles.legend}>
                          <div>
                            <i className={styles.greenDot} />
                            <span>Matched</span>
                            <strong>1,206</strong>
                          </div>
                          <div>
                            <i className={styles.redDot} />
                            <span>Missing</span>
                            <strong>28</strong>
                          </div>
                          <div>
                            <i className={styles.amberDot} />
                            <span>Mismatched</span>
                            <strong>14</strong>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.card}>
                      <div className={styles.cardHeading}>
                        <h4>Items by Category</h4>
                        <button
                          type="button"
                          onClick={() => selectTab("Line Items")}
                        >
                          View all
                        </button>
                      </div>
                      <div className={styles.categories}>
                        {categories.map((category) => (
                          <div key={category.name} className={styles.category}>
                            <span>{category.name}</span>
                            <span>{category.count}</span>
                            <div className={styles.barTrack}>
                              <div style={{ width: category.width }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={`${styles.card} ${styles.activityCard}`}>
                    <div className={styles.cardHeading}>
                      <h4>Recent Activity</h4>
                      <button
                        type="button"
                        onClick={() => selectTab("Documents")}
                      >
                        View documents
                      </button>
                    </div>
                    <div className={styles.activityRow}>
                      <i className={styles.orangeDot} />
                      <span>
                        Reconciliation found <strong>42 items</strong> that need
                        your attention
                      </span>
                      <span>Just now</span>
                    </div>
                    <div className={styles.activityRow}>
                      <i className={styles.greenDot} />
                      <span>
                        Estimate matched against the official bid schedule
                      </span>
                      <span>2 min ago</span>
                    </div>
                    <div className={styles.activityRow}>
                      <i className={styles.blueDot} />
                      <span>Project plans and specifications analyzed</span>
                      <span>4 min ago</span>
                    </div>
                    <div className={styles.activityRow}>
                      <i className={styles.blueDot} />
                      <span>Official bid schedule uploaded</span>
                      <span>5 min ago</span>
                    </div>
                  </div>
                </>
              ) : activeTab === "Documents" ? (
                <div className={`${styles.card} ${styles.detailCard}`}>
                  <div className={styles.cardHeading}>
                    <h4>Project Documents</h4>
                    <span className={styles.subtle}>4 sample documents</span>
                  </div>
                  <p className={styles.detailIntro}>
                    One place for every plan, specification, and bid item.
                  </p>
                  {documents.map((document) => (
                    <div className={styles.documentRow} key={document.name}>
                      <span className={styles.documentIcon}>
                        <FileCheck2 size={19} aria-hidden="true" />
                      </span>
                      <div>
                        <strong>{document.name}</strong>
                        <span>{document.detail}</span>
                      </div>
                      <span className={styles.matchedStatus}>
                        <Check size={10} aria-hidden="true" />
                        {document.status}
                      </span>
                    </div>
                  ))}
                  <Link className={styles.panelCta} href="/demo-guide">
                    Explore the document workflow{" "}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              ) : (
                <div className={`${styles.card} ${styles.detailCard}`}>
                  <div className={styles.cardHeading}>
                    <h4>
                      {activeTab === "Bid Reconciliation"
                        ? "Catch the gaps before you bid"
                        : "Every line item. Accounted for."}
                    </h4>
                    <span className={styles.subtle}>Sample data</span>
                  </div>
                  <p className={styles.detailIntro}>
                    {activeTab === "Bid Reconciliation"
                      ? "Compare your estimate with the official bid form, item by item."
                      : "Search the sample items by description, unit, or status."}
                  </p>
                  {activeTab === "Bid Reconciliation" && (
                    <div className={styles.reviewNotice}>
                      <TriangleAlert size={16} aria-hidden="true" />
                      <span>
                        <strong>42 items need review</strong>
                        <br />
                        28 missing items and 14 quantity or unit mismatches.
                      </span>
                    </div>
                  )}
                  <div className={styles.tableWrap}>
                    <table className={styles.itemTable}>
                      <thead>
                        <tr>
                          <th>Bid item</th>
                          <th>Qty / Unit</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(activeTab === "Bid Reconciliation"
                          ? sampleItems.filter(
                              (item) => item.status !== "Matched"
                            )
                          : visibleItems
                        ).map((item) => (
                          <tr key={item.id}>
                            <td>
                              <span className={styles.itemId}>{item.id}</span>
                              {item.name}
                            </td>
                            <td>
                              {item.quantity}{" "}
                              <span className={styles.subtle}>{item.unit}</span>
                            </td>
                            <td>
                              <span
                                className={
                                  item.status === "Matched"
                                    ? styles.matchedStatus
                                    : item.status === "Missing"
                                      ? styles.missingStatus
                                      : styles.mismatchStatus
                                }
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {activeTab === "Line Items" &&
                      visibleItems.length === 0 && (
                        <p className={styles.emptyState}>
                          No sample items match &ldquo;{search}&rdquo;. Try
                          &ldquo;asphalt&rdquo; or &ldquo;missing&rdquo;.
                        </p>
                      )}
                  </div>
                  <Link className={styles.panelCta} href="/demo-guide">
                    See how reconciliation works{" "}
                    <ArrowUpRight size={13} aria-hidden="true" />
                  </Link>
                </div>
              )}
            </div>
            <div className={styles.previewFooter}>
              <span>
                <ShieldCheck size={11} aria-hidden="true" /> Every item. Every
                detail. No surprises.
              </span>
              <span>Illustrative sample data</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof FileText
  label: string
  value: string
  detail: string
  tone: "blue" | "green" | "red" | "amber"
}) {
  return (
    <div className={styles.stat} data-tone={tone}>
      <div className={styles.statTop}>
        <span className={styles.statIcon}>
          <Icon size={16} aria-hidden="true" />
        </span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      <span className={styles.statDetail}>{detail}</span>
    </div>
  )
}
