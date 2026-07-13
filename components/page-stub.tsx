export function PageStub({ title }: { title: string }) {
  return (
    <div className="p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-sm text-muted-foreground">This screen is coming soon.</p>
      </div>
    </div>
  )
}
