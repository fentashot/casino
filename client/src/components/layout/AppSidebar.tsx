import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute } from "@tanstack/react-router";
import {
	BarChart3,
	ChevronLeft,
	ChevronRight,
	Dices,
	LayoutGrid,
	LogOut,
	Shield,
	Spade,
	Sparkles,
	User,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/auth-context";
import { Button } from "@/components/ui/button";
import { formatBalance } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
	{ label: "Games", to: "/games" as const, icon: LayoutGrid },
	{ label: "Roulette", to: "/games/roulette" as const, icon: Dices },
	{ label: "Blackjack", to: "/games/blackjack" as const, icon: Spade },
	{ label: "Statystyki", to: "/games/stats" as const, icon: BarChart3 },
	{ label: "Profile", to: "/profile" as const, icon: User },
] as const;

export function AppSidebar() {
	const { user, logout } = useAuth();
	const matchRoute = useMatchRoute();
	const [collapsed, setCollapsed] = useState(false);

	const { data: balanceData } = useQuery({
		queryKey: ["casino-balance"],
		queryFn: async () => ({ balance: user?.balance ?? 0 }),
		staleTime: Infinity,
		gcTime: Infinity,
		enabled: !!user,
	});

	const displayBalance = balanceData?.balance ?? user?.balance ?? 0;

	const isActive = (to: string) => {
		if (to === "/games") return !!matchRoute({ to: "/games", fuzzy: false });
		return !!matchRoute({ to, fuzzy: true });
	};

	return (
		<aside
			className={cn(
				"fixed left-0 top-0 z-40 h-dvh flex-col hidden lg:flex transition-all duration-300 ease-out border-r border-sidebar-border",
				collapsed ? "w-sidebar-collapsed" : "w-sidebar",
			)}
		>
			{/* Background */}
			<div className="absolute inset-0 bg-sidebar" />

			{/* Content */}
			<div className="relative z-10 flex h-full flex-col">
				{/* Logo */}
				<div
					className={cn(
						"flex items-center gap-3 px-5 h-14 shrink-0",
						collapsed && "justify-center px-0",
					)}
				>
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
						<Sparkles className="h-4 w-4 text-primary" />
					</div>
					{!collapsed && (
						<div className="flex flex-col animate-fade-in">
							<span className="text-sm font-bold tracking-tight text-foreground">
								NEXUS
							</span>
							<span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
								Casino
							</span>
						</div>
					)}
				</div>

				{/* Divider */}
				<div className="mx-0 h-px bg-sidebar-border" />

				{/* Balance Widget */}
				{user && (
					<div className={cn("px-3 py-3", collapsed && "px-2")}>
						<div
							className={cn(
								"balance-pill rounded-lg p-3 transition-all duration-200",
								collapsed && "p-2 flex items-center justify-center",
							)}
						>
							{collapsed ? (
								<div className="flex flex-col items-center gap-0.5">
									<span className="text-[10px] text-muted-foreground">PLN</span>
									<span className="text-xs font-bold font-mono text-foreground">
										{Math.floor(displayBalance)}
									</span>
								</div>
							) : (
								<>
									<div className="flex items-center gap-2 mb-1">
										<div className="h-1.5 w-1.5 rounded-full bg-primary" />
										<span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
											Balance
										</span>
									</div>
									<div className="flex items-baseline gap-1.5">
										<span className="text-lg font-bold font-mono tracking-tight text-foreground">
											{formatBalance(displayBalance)}
										</span>
										<span className="text-xs font-medium text-muted-foreground">
											PLN
										</span>
									</div>
								</>
							)}
						</div>
					</div>
				)}

				{/* Navigation */}
				<nav className="flex-1 px-2 space-y-0.5 overflow-y-auto pt-1">
					{NAV_ITEMS.map((item) => {
						const active = isActive(item.to);
						const Icon = item.icon;

						return (
							<Link
								key={item.to}
								to={item.to}
								className={cn(
									"group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
									collapsed && "justify-center px-0 py-3",
									active
										? "text-primary bg-primary/8"
										: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
								)}
							>
								{/* Active indicator bar */}
								{active && <div className="nav-indicator h-5" />}

								<Icon
									className={cn(
										"h-[18px] w-[18px] shrink-0 transition-colors duration-150",
										active
											? "text-primary"
											: "text-muted-foreground group-hover:text-foreground",
									)}
								/>

								{!collapsed && (
									<span className="animate-fade-in">{item.label}</span>
								)}
							</Link>
						);
					})}

					{/* Admin link */}
					{user?.role === "admin" && (
						<>
							<div className="mx-2 my-2 h-px bg-sidebar-border" />
							<Link
								to="/profile"
								className={cn(
									"group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
									"text-muted-foreground hover:text-foreground hover:bg-muted/60",
									collapsed && "justify-center px-0 py-3",
								)}
							>
								<Shield className="h-[18px] w-[18px] shrink-0 text-amber-500" />
								{!collapsed && (
									<span className="animate-fade-in text-amber-500">Admin</span>
								)}
							</Link>
						</>
					)}
				</nav>

				{/* Bottom section */}
				<div className="mt-auto border-t border-sidebar-border">
					{/* User info */}
					{user && (
						<div
							className={cn(
								"flex items-center gap-3 px-4 py-3",
								collapsed && "justify-center px-2",
							)}
						>
							{/* Avatar */}
							<div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted border border-border">
								<span className="text-xs font-semibold text-muted-foreground">
									{user.name
										.split(" ")
										.map((n) => n[0])
										.join("")
										.toUpperCase()
										.slice(0, 2)}
								</span>
								<div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-sidebar bg-emerald-500" />
							</div>

							{!collapsed && (
								<div className="flex-1 min-w-0 animate-fade-in">
									<p className="text-sm font-medium text-foreground truncate">
										{user.name}
									</p>
									<p className="text-[11px] text-muted-foreground truncate">
										{user.email}
									</p>
								</div>
							)}

							{!collapsed && (
								<Button
									variant="ghost"
									size="icon"
									className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
									onClick={logout}
								>
									<LogOut className="h-4 w-4" />
								</Button>
							)}
						</div>
					)}

					{/* Collapse toggle */}
					<div
						className={cn(
							"flex items-center px-3 py-2",
							collapsed ? "justify-center" : "justify-end",
						)}
					>
						<Button
							variant="ghost"
							size="icon"
							onClick={() => setCollapsed(!collapsed)}
							className="h-7 w-7 text-muted-foreground hover:text-foreground"
						>
							{collapsed ? (
								<ChevronRight className="h-4 w-4" />
							) : (
								<ChevronLeft className="h-4 w-4" />
							)}
						</Button>
					</div>
				</div>
			</div>
		</aside>
	);
}
