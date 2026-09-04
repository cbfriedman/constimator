"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, ChevronDown, LogOut, Plus, Search } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { useProjectState } from "@/components/project-state-provider"
import { searchWorkspaceAction, type SearchHit } from "@/app/search/actions"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

const KIND_LABEL: Record<SearchHit["kind"], string> = {
  project: "Project",
  document: "Document",
  estimate: "Estimate",
  bid: "Bid form",
}

export function TopBar() {
  const { user, orgName, notifications, selectProject } = useProjectState()
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [hits, setHits] = React.useState<SearchHit[]>([])
  const [open, setOpen] = React.useState(false)
  const [searching, setSearching] = React.useState(false)
  const trimmed = query.trim()
  const visibleHits = trimmed.length < 2 ? [] : hits

  React.useEffect(() => {
    if (trimmed.length < 2) return
    let cancelled = false
    const timer = window.setTimeout(() => {
      setSearching(true)
      searchWorkspaceAction(trimmed)
        .then((next) => {
          if (!cancelled) setHits(next)
        })
        .catch(() => {
          if (!cancelled) setHits([])
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [trimmed])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/sign-in")
    router.refresh()
  }

  function handleHit(hit: SearchHit) {
    const projectParam = new URL(hit.href, "http://local").searchParams.get("project")
    if (projectParam) {
      selectProject(projectParam).catch(() => {})
    }
    setOpen(false)
    setQuery("")
    router.push(hit.href)
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects, documents, line items..."
          className="h-9 pl-8"
          aria-label="Search"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            if (visibleHits.length > 0) setOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150)
          }}
        />
        {open && trimmed.length >= 2 ? (
          <div className="absolute top-[calc(100%+4px)] z-50 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
            {searching && visibleHits.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>
            ) : visibleHits.length === 0 ? (
              <p className="px-3 py-2 text-xs text-muted-foreground">No matches</p>
            ) : (
              <ul className="max-h-80 overflow-auto py-1">
                {visibleHits.map((hit) => (
                  <li key={`${hit.kind}-${hit.id}`}>
                    <button
                      type="button"
                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-accent"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleHit(hit)}
                    >
                      <span className="text-sm font-medium">{hit.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {KIND_LABEL[hit.kind]} · {hit.subtitle}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Button render={<Link href="/new-project" />}>
          <Plus data-icon="inline-start" />
          New Project
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                aria-label="Notifications"
              />
            }
          >
            <Bell />
            {notifications.length > 0 ? (
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
            ) : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            {notifications.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">
                No notifications right now.
              </p>
            ) : (
              notifications.map((item) => (
                <DropdownMenuItem
                  key={item.id}
                  className="flex-col items-start gap-0.5"
                  onClick={() => router.push(item.href)}
                >
                  <span
                    className={cn(
                      "text-sm font-medium",
                      item.tone === "danger" && "text-destructive",
                      item.tone === "warning" && "text-warning",
                    )}
                  >
                    {item.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.body}</span>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <Separator orientation="vertical" className="h-6" />
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <button
                type="button"
                className="flex items-center gap-2 rounded-md px-1 py-1 outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Account menu"
              />
            }
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col text-left sm:flex">
              <span className="text-sm font-medium leading-tight">
                {user.name}
              </span>
              <span className="text-xs leading-tight text-muted-foreground">
                {orgName}
              </span>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
