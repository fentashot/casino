const RULES = [
	{
		label: "Cel",
		text: "Zbij dealera — dobierz bliżej 21 nie przekraczając.",
	},
	{
		label: "Blackjack",
		text: "As + karta 10-wartości na pierwszych 2 kartach. Wypłata 3:2.",
	},
	{
		label: "Dealer",
		text: "Musi dobierać na 16 i miękkim 17. Staje na twardym 17+.",
	},
	{
		label: "Double Down",
		text: "Podwój zakład po pierwszych 2 kartach — dostajesz dokładnie 1 kartę.",
	},
	{
		label: "Split",
		text: "Podziel dwie karty o równej wartości na 2 ręce (asy: 1 karta każda).",
	},
	{
		label: "Ubezpieczenie",
		text: "Oferowane gdy dealer pokazuje Asa. Kosztuje ½ zakładu, wypłaca 2:1.",
	},
	{
		label: "Remis",
		text: "Wynik równy dealerowi — zakład wraca.",
	},
	{
		label: "But",
		text: "6 talii, karta spalona. Tasowanie przy 75% penetracji.",
	},
];

export function RulesReference() {
	return (
		<div className="rounded-xl border border-border bg-card p-4">
			<p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
				Zasady
			</p>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5">
				{RULES.map((rule) => (
					<div
						key={rule.label}
						className="flex gap-2 text-xs text-muted-foreground"
					>
						<span className="font-semibold text-foreground/70 shrink-0 w-[110px]">
							{rule.label}
						</span>
						<span>{rule.text}</span>
					</div>
				))}
			</div>
		</div>
	);
}
