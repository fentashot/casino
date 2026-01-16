import Wrapper from '@/components/Wrapper'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/games/')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <Wrapper>
      <div className="container mx-auto max-w-7xl p-6 space-y-8">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Games</h1>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 ">
          <Link to="/games/roulette">
            <div className="rounded-lg border bg-card p-4 text-card-foreground shadow-sm hover:cursor-pointer hover:scale-[1.02] hover:border-zinc-600 transition">
              <div className="text-sm text-muted-foreground">{`"error {msg:'pogchamp'}"`}</div>
              <div className="mt-2 text-3xl font-semibold">Pogchamp Roulette 💎</div>
            </div>
          </Link>
        </div>

      </div>
    </Wrapper>
  )
}
