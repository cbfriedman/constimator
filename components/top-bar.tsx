"use client"

import { Bell, Search } from "lucide-react"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { demoUser } from "@/lib/demo-data"

export function TopBar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="relative w-full max-w-sm">
        <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search projects, documents, line items..."
          className="h-9 pl-8"
          aria-label="Search"
        />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell />
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-destructive" />
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="text-xs">{demoUser.initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-medium leading-tight">{demoUser.name}</span>
            <span className="text-xs text-muted-foreground leading-tight">{demoUser.company}</span>
          </div>
        </div>
      </div>
    </header>
  )
}
