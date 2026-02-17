import { useCallback, useEffect, useState } from 'react';
import { Loader } from 'lucide-react';
import { betSchema } from '@server/zodTypes';
import z from 'zod';
import { Button } from '@/components/ui/button';
import { BalanceDisplay } from '@/components/BalanceDisplay';

// ============================================================================
// TYPES
// ============================================================================

export type RouletteSelection = z.infer<typeof betSchema>;

type BetKey = string;

type PendingStack = {
  total: number;
  chips: number;
};

type Props = {
  balance?: number;
  defaultAmount?: number;
  disableBet?: boolean;
  onPlaceBets?: (bets: RouletteSelection[]) => Promise<{ success: boolean; error?: unknown }>;
};

// ============================================================================
// CONSTANTS
// ============================================================================

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36];
const MIDDLE_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35];
const BOTTOM_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34];
const CHIP_VALUES = [10, 20, 50, 100, 500, 1000];
const CHIP_COUNTS = [1, 2, 3, 4, 5];

const CELL_BASE = 'select-none cursor-pointer rounded text-sm font-medium text-white text-center transition-colors';

// ============================================================================
// HELPERS
// ============================================================================

function getNumberBackground(n: number): string {
  if (n === 0) return `green-cell`;
  return RED_NUMBERS.has(n) ? `red-cell` : `black-cell`;
}

function formatValue(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return value.toString();
}

function getKeyFromSelection(selection: RouletteSelection): BetKey {
  switch (selection.type) {
    case 'straight':
      return `straight:${selection.numbers?.[0]}`;
    case 'red_black':
      return `red_black:${selection.color}`;
    default:
      return `${selection.type}:${selection.choice}`;
  }
}

function makeSelectionFromKey(key: BetKey, amount: number): RouletteSelection {
  const [type, choice] = key.split(':');
  const base = { amount, numbers: [] as number[], color: undefined, choice: undefined };

  if (type === 'straight') {
    return { ...base, type: 'straight', numbers: [Number(choice)] };
  }
  if (type === 'red_black') {
    return { ...base, type: 'red_black', color: choice as RouletteSelection['color'] };
  }
  return { ...base, type: type as RouletteSelection['type'], choice: choice as RouletteSelection['choice'] };
}

function areBetsEqual(a: RouletteSelection, b: RouletteSelection): boolean {
  return (
    a.type === b.type &&
    JSON.stringify(a.numbers || []) === JSON.stringify(b.numbers || []) &&
    a.choice === b.choice &&
    a.color === b.color
  );
}

// ============================================================================
// CUSTOM HOOK: useBetManager
// ============================================================================

function useBetManager(chipValue: number, chipCount: number, disabled: boolean) {
  const [pendingStacks, setPendingStacks] = useState<Record<BetKey, PendingStack>>({});
  const [basket, setBasket] = useState<RouletteSelection[]>([]);

  const betValue = chipValue * chipCount;

  const addBet = useCallback((key: BetKey) => {
    if (disabled || chipValue <= 0) return;

    setPendingStacks(prev => ({
      ...prev,
      [key]: {
        total: (prev[key]?.total || 0) + betValue,
        chips: (prev[key]?.chips || 0) + chipCount,
      },
    }));

    const newBet = makeSelectionFromKey(key, betValue);
    setBasket(prev => {
      const existingIndex = prev.findIndex(b => areBetsEqual(b, newBet));
      if (existingIndex >= 0) {
        return prev.map((b, i) =>
          i === existingIndex ? { ...b, amount: b.amount + betValue } : b
        );
      }
      return [...prev, newBet];
    });
  }, [disabled, chipValue, chipCount, betValue]);

  const removeBet = useCallback((key: BetKey) => {
    if (disabled) return;

    setPendingStacks(prev => {
      const current = prev[key];
      if (!current || current.total <= betValue) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return {
        ...prev,
        [key]: {
          total: current.total - betValue,
          chips: Math.max(0, current.chips - chipCount),
        },
      };
    });

    const targetBet = makeSelectionFromKey(key, betValue);
    setBasket(prev => {
      const existingIndex = prev.findIndex(b => areBetsEqual(b, targetBet));
      if (existingIndex < 0) return prev;

      const existing = prev[existingIndex];
      if (existing.amount <= betValue) {
        return prev.filter((_, i) => i !== existingIndex);
      }
      return prev.map((b, i) =>
        i === existingIndex ? { ...b, amount: b.amount - betValue } : b
      );
    });
  }, [disabled, betValue, chipCount]);

  const removeEntireBet = useCallback((key: BetKey) => {
    setBasket(prev => prev.filter(bet => getKeyFromSelection(bet) !== key));
    setPendingStacks(prev => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const removeFromBasket = useCallback((index: number, currentChipValue: number) => {
    const bet = basket[index];
    if (!bet) return;

    const key = getKeyFromSelection(bet);
    setBasket(prev => prev.filter((_, i) => i !== index));

    setPendingStacks(prev => {
      const current = prev[key];
      if (!current) return prev;

      const newTotal = current.total - bet.amount;
      const newChips = current.chips - (bet.amount / currentChipValue);

      if (newTotal <= 0) {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: { total: newTotal, chips: newChips } };
    });
  }, [basket]);

  const resetAll = useCallback(() => {
    setBasket([]);
    setPendingStacks({});
  }, []);

  return { pendingStacks, basket, addBet, removeBet, removeEntireBet, removeFromBasket, resetAll };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

type NumberCellProps = {
  number: number;
  pendingAmount?: number;
  onMouseDown: (e: React.MouseEvent) => void;
};

function NumberCell({ number, pendingAmount, onMouseDown }: NumberCellProps) {
  return (
    <button
      onMouseDown={onMouseDown}
      onContextMenu={e => e.preventDefault()}
      className={`${CELL_BASE} relative w-11 h-11 ${getNumberBackground(number)}`}
    >
      <div className="w-full h-full flex items-center justify-center">{number}</div>
      {pendingAmount && <div className="badge bottom-0">{formatValue(pendingAmount)}</div>}
    </button>
  );
}

type OutsideBetButtonProps = {
  label: string;
  className: string;
  badgeClass: string;
  pendingAmount?: number;
  onMouseDown: (e: React.MouseEvent) => void;
};

function OutsideBetButton({ label, className, badgeClass, pendingAmount, onMouseDown }: OutsideBetButtonProps) {
  return (
    <div className="relative">
      <button onMouseDown={onMouseDown} onContextMenu={e => e.preventDefault()} className={className}>
        {label}
      </button>
      {pendingAmount && <div className={badgeClass}>{formatValue(pendingAmount)}</div>}
    </div>
  );
}

type ChipSelectorProps = {
  values: number[];
  selected: number;
  onSelect: (value: number) => void;
  label: string;
};

function ChipSelector({ values, selected, onSelect, label }: ChipSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-sm text-zinc-400">{label}</div>
      <div className="flex gap-2">
        {values.map(v => (
          <button
            key={v}
            onClick={() => onSelect(v)}
            className={`px-3 py-1 rounded ${selected === v ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-white'}`}
          >
            {v}
          </button>
        ))}
      </div>
    </div>
  );
}

type BasketDisplayProps = {
  basket: RouletteSelection[];
  onRemove: (index: number) => void;
};

function BasketDisplay({ basket, onRemove }: BasketDisplayProps) {
  if (basket.length === 0) {
    return <div className="text-sm text-zinc-500">empty</div>;
  }

  return (
    <>
      {basket.map((bet, i) => (
        <div key={i} className="px-2 py-1 rounded bg-zinc-800 text-sm flex items-center gap-1">
          <div className="font-mono text-xs">
            {bet.numbers?.length ? `n=${bet.numbers.join(',')}` : bet.choice ?? bet.color}
          </div>
          <div className="font-mono text-xs">${bet.amount}</div>
          <button onClick={() => onRemove(i)} className="text-xs text-zinc-400">✕</button>
        </div>
      ))}
    </>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function RouletteControls({
  defaultAmount = 10,
  disableBet = false,
  onPlaceBets,
  balance,
}: Props) {
  const [chipValue, setChipValue] = useState(defaultAmount);
  const [chipCount, setChipCount] = useState(1);
  const [loading, setLoading] = useState(false);

  const { pendingStacks, basket, addBet, removeBet, removeEntireBet, removeFromBasket, resetAll } =
    useBetManager(chipValue, chipCount, disableBet);

  useEffect(() => setChipValue(defaultAmount), [defaultAmount]);

  const handleBetClick = useCallback((key: BetKey, e: React.MouseEvent) => {
    e.preventDefault();
    if (e.button === 2) removeBet(key);
    else if (e.button === 1) removeEntireBet(key);
    else addBet(key);
  }, [addBet, removeBet, removeEntireBet]);

  const handlePlaceBets = async () => {
    if (!basket.length || !onPlaceBets) return;
    setLoading(true);
    try {
      const result = await onPlaceBets(basket);
      if (result.success) resetAll();
    } finally {
      setLoading(false);
    }
  };

  const getPending = (key: BetKey) => pendingStacks[key]?.total;
  const hasNoBets = basket.length === 0 && Object.keys(pendingStacks).length === 0;

  const NumberRow = ({ nums }: { nums: number[] }) => (
    <div className="grid grid-cols-12 gap-1">
      {nums.map(n => (
        <NumberCell
          key={n}
          number={n}
          pendingAmount={getPending(`straight:${n}`)}
          onMouseDown={e => handleBetClick(`straight:${n}`, e)}
        />
      ))}
    </div>
  );

  return (
    <div className="max-w-fit mx-auto space-y-3">
      <div className="max-w-fit mx-auto rounded-xl bg-[#111212] p-5 text-white">
        <div className="grid grid-cols-[auto,1fr,auto] grid-rows-[auto,1fr]">

          {/* Zero */}
          <div className="relative">
            <button
              onMouseDown={e => handleBetClick('straight:0', e)}
              onContextMenu={e => e.preventDefault()}
              className={`${CELL_BASE} h-full min-h-[96px] w-12 bg-green-600`}
            >
              <div className="w-full h-full flex items-center justify-center">0</div>
              {getPending('straight:0') && (
                <div className="absolute bottom-2 right-2 bg-yellow-300 text-black small-font px-1 rounded-sm z-10 pointer-events-none">
                  {formatValue(getPending('straight:0')!)}
                </div>
              )}
            </button>
          </div>

          {/* Main Grid */}
          <div className="row-span-2 space-y-1 mx-1">
            <NumberRow nums={TOP_ROW} />
            <NumberRow nums={MIDDLE_ROW} />
            <NumberRow nums={BOTTOM_ROW} />

            {/* Dozens */}
            <div className="grid grid-cols-3 gap-1 mt-2">
              {[
                { key: 'dozen:1st12', label: '1 to 12' },
                { key: 'dozen:2nd12', label: '13 to 24' },
                { key: 'dozen:3rd12', label: '25 to 36' },
              ].map(({ key, label }) => (
                <OutsideBetButton
                  key={key}
                  label={label}
                  className="rounded w-full h-10 bg-zinc-700"
                  badgeClass="badge-corner"
                  pendingAmount={getPending(key)}
                  onMouseDown={e => handleBetClick(key, e)}
                />
              ))}
            </div>

            {/* Even money bets */}
            <div className="grid grid-cols-6 gap-1 mt-1">
              {[
                { key: 'high_low:low', label: '1 to 18', className: 'rounded w-full h-10 bg-zinc-700' },
                { key: 'even_odd:even', label: 'Even', className: 'rounded w-full h-10 bg-zinc-700' },
                { key: 'red_black:red', label: 'Red', className: ` rounded red-cell w-full h-10` },
                { key: 'red_black:black', label: 'Black', className: `rounded black-cell w-full h-10` },
                { key: 'even_odd:odd', label: 'Odd', className: 'rounded w-full h-10 bg-zinc-700' },
                { key: 'high_low:high', label: '19 to 36', className: 'rounded w-full h-10 bg-zinc-700' },
              ].map(({ key, label, className }) => (
                <OutsideBetButton
                  key={key}
                  label={label}
                  className={className}
                  badgeClass="badge"
                  pendingAmount={getPending(key)}
                  onMouseDown={e => handleBetClick(key, e)}
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex justify-center gap-1 pt-3 pb-1">
              <Button
                onClick={resetAll}
                variant="outline"
                disabled={hasNoBets}
                className={`px-4 py-2 rounded text-white w-full ${hasNoBets ? 'bg-zinc-600' : 'bg-red-600 hover:bg-red-700'}`}
              >
                Reset All
              </Button>
              <Button
                onClick={handlePlaceBets}
                disabled={!onPlaceBets || !basket.length}
                className={`w-full px-4 py-2 rounded text-white ${!onPlaceBets || !basket.length ? 'bg-zinc-600' : 'bg-blue-500 hover:bg-blue-600'}`}
              >
                {loading ? <Loader className="animate-spin" /> : `Place Bets (${basket.length})`}
              </Button>
            </div>
          </div>

          {/* Columns */}
          <div className="grid grid-rows-3 gap-1 w-16">
            {['col1', 'col2', 'col3'].map(col => (
              <OutsideBetButton
                key={col}
                label="2:1"
                className="bg-zinc-700 h-11 w-full rounded"
                badgeClass="badge-corner-small"
                pendingAmount={getPending(`column:${col}`)}
                onMouseDown={e => handleBetClick(`column:${col}`, e)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="p-5 rounded-xl bg-[#111212]">
        {/* <div className="text-xl text-zinc-400 flex items-center gap-3 mb-5">
          Balance:
          <motion.span
            key={balance}
            animate={{
              scale: balanceChanged ? [1, 1.1, 1] : 1,
              opacity: balanceChanged ? [0.6, 1, 0.8] : 1,
            }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            className="font-bold text-white"
          >
            {balance !== undefined ? formatBalance(balance) : 'N/A'}
          </motion.span>
        </div> */}
        <BalanceDisplay initialBalance={balance} className="mb-5" />

        <div className="flex items-center gap-3">
          <ChipSelector values={CHIP_VALUES} selected={chipValue} onSelect={setChipValue} label="Chip value" />

          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-zinc-400">Chips /click</div>
            <div className="flex gap-1">
              {CHIP_COUNTS.map(n => (
                <button
                  key={n}
                  onClick={() => setChipCount(n)}
                  className={`px-2 py-1 rounded ${chipCount === n ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-white'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="text-sm text-zinc-400 mb-2">Basket</div>
        <div className="flex max-w-[700px] flex-wrap gap-2">
          <BasketDisplay basket={basket} onRemove={i => removeFromBasket(i, chipValue)} />
        </div>
      </div>
    </div>
  );
}
