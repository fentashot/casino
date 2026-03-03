import { Link, useMatchRoute } from "@tanstack/react-router";
import { Dices, LayoutGrid, User, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    label: "Games",
    to: "/games" as const,
    icon: LayoutGrid,
    exactMatch: true,
  },
  {
    label: "Roulette",
    to: "/games/roulette" as const,
    icon: Dices,
    exactMatch: false,
  },
  {
    label: "Stats",
    to: "/games/stats" as const,
    icon: BarChart3,
    exactMatch: false,
  },
  {
    label: "Profile",
    to: "/profile" as const,
    icon: User,
    exactMatch: false,
  },
] as const;

export function BottomNav() {
  const matchRoute = useMatchRoute();

  const isActive = (to: string | null, exactMatch: boolean) => {
    if (!to) return false;
    if (to === "/games" && exactMatch) {
      return !!matchRoute({ to: "/games", fuzzy: false });
    }
    return !!matchRoute({ to, fuzzy: true });
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bottom-nav">
      {/* Safe area padding for notched devices */}
      <div className="flex items-end justify-around px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;

          const to = item.to;
          if (!to) return null;

          const active = isActive(to, item.exactMatch);

          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-3 py-1 min-w-[3.5rem] transition-colors duration-200",
                active
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground",
              )}
            >
              {/* Active indicator dot/bar at top */}
              {active && <div className="bottom-nav-indicator" />}

              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                  active
                    ? "bg-primary/10"
                    : "bg-transparent active:bg-muted/50",
                )}
              >
                <Icon
                  className={cn(
                    "h-[20px] w-[20px] transition-all duration-200",
                    active && "scale-110",
                  )}
                  strokeWidth={active ? 2.5 : 2}
                />
              </div>

              <span
                className={cn(
                  "text-[10px] leading-none transition-all duration-200",
                  active ? "font-semibold" : "font-medium",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
