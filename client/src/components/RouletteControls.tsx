import { useMemo, useState } from 'react'

type EvenOdd = 'even' | 'odd'
type Color = 'red' | 'black'
type LowHigh = 'low' | 'high'
type Dozen = 1 | 2 | 3
type Column = 1 | 2 | 3

export type RouletteSelection = {
  numbers: number[] // will contain at most one number in single-bet mode
  dozen: Dozen | null
  column: Column | null
  evenOdd: EvenOdd | null
  color: Color | undefined
  lowHigh: LowHigh | null
}

type Props = {
  handleBet: (amount: number) => Promise<void>
  value?: RouletteSelection
  onChange?: (v: RouletteSelection) => void
  onUndo?: () => void
  onClear?: () => void
  onPlaceBet?: (selection: RouletteSelection, amount: number) => void
  defaultAmount?: number
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
])

const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
const MIDDLE_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
const BOTTOM_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]

const baseSelection: RouletteSelection = {
  numbers: [],
  dozen: null,
  column: null,
  evenOdd: null,
  color: undefined,
  lowHigh: null,
}

// Component
export default function RouletteControls({
  handleBet,
  value,
  onChange,
  onUndo,
  onClear,
  onPlaceBet,
  defaultAmount = 10,
}: Props) {
  const [internal, setInternal] = useState<RouletteSelection>(baseSelection)
  const selection = value ?? internal

  const [amount, setAmount] = useState<number>(defaultAmount)
  const chips = [1, 5, 10, 25, 100]

  // single-bet mode helpers: setting any bet clears others
  const setSelection = (next: RouletteSelection) => {
    if (!value) setInternal(next)
    onChange?.(next)
  }

  const clearSelection = () => {
    setSelection(baseSelection)
    onClear?.()
  }

  const isSelectedNumber = (n: number) => selection.numbers.includes(n)

  // Toggle a single number (only one number allowed)
  const toggleNumber = (n: number) => {
    if (isSelectedNumber(n)) {
      setSelection(baseSelection)
    } else {
      setSelection({
        numbers: [n],
        dozen: null,
        column: null,
        evenOdd: null,
        color: undefined,
        lowHigh: null,
      })
    }
  }

  // Selecting other bet types clears number and other groups (single bet)
  const selectDozen = (d: Dozen | null) =>
    setSelection({
      numbers: [],
      dozen: d,
      column: null,
      evenOdd: null,
      color: undefined,
      lowHigh: null,
    })

  const selectColumn = (c: Column | null) =>
    setSelection({
      numbers: [],
      dozen: null,
      column: c,
      evenOdd: null,
      color: undefined,
      lowHigh: null,
    })

  const selectEvenOdd = (eo: EvenOdd | null) =>
    setSelection({
      numbers: [],
      dozen: null,
      column: null,
      evenOdd: eo,
      color: undefined,
      lowHigh: null,
    })

  const selectColor = (c: Color | undefined) =>
    setSelection({
      numbers: [],
      dozen: null,
      column: null,
      evenOdd: null,
      color: c,
      lowHigh: null,
    })

  const selectLowHigh = (lh: LowHigh | null) =>
    setSelection({
      numbers: [],
      dozen: null,
      column: null,
      evenOdd: null,
      color: undefined,
      lowHigh: lh,
    })

  const placeBet = () => {
    // require a selection and positive amount
    const hasSelection =
      selection.numbers.length > 0 ||
      selection.dozen != null ||
      selection.column != null ||
      selection.evenOdd != null ||
      selection.color != null ||
      selection.lowHigh != null

    if (!hasSelection || amount <= 0) return

    onPlaceBet?.(selection, amount)
    handleBet(amount)
    // clear after placing single bet
    clearSelection()
    setAmount(defaultAmount)
  }

  // Roulette colors
  const rRed = '#FF013C'
  const rBlack = '#293136'
  const rGreen = '#16a34a'

  // Helpers for styling
  const numberBg = (n: number) => {
    if (n === 0) return `bg-[${rGreen}]`
    return RED_NUMBERS.has(n) ? `bg-[${rRed}]` : `bg-[${rBlack}]`
  }

  const cellBase =
    'select-none cursor-pointer rounded-md px-3 py-2 text-sm font-medium text-white text-center transition-colors'

  const numberCell = (n: number) => (
    <button
      key={n}
      onClick={() => toggleNumber(n)}
      className={[
        cellBase,
        numberBg(n),
        isSelectedNumber(n) ? 'ring-2 ring-yellow-400' : 'ring-0',
      ].join(' ')}
    >
      {n}
    </button>
  )

  const GridRow = ({ nums }: { nums: number[] }) => (
    <div className="grid grid-cols-12 gap-2">{nums.map(numberCell)}</div>
  )

  // Right-side 2:1 columns
  const columnButton = (idx: Column) => {
    const active = selection.column === idx
    return (
      <button
        key={idx}
        onClick={() => selectColumn(active ? null : idx)}
        className={[
          cellBase,
          'bg-zinc-700',
          active ? 'ring-2 ring-yellow-400' : '',
        ].join(' ')}
      >
        2:1
      </button>
    )
  }

  // Bottom controls
  const bottomBtn = (label: string, active: boolean, onClick: () => void, extraClasses = '') => (
    <button
      onClick={onClick}
      className={[cellBase, 'bg-zinc-700', active ? 'ring-2 ring-yellow-400' : '', extraClasses].join(' ')}
    >
      {label}
    </button>
  )

  const redActive = selection.color === 'red'
  const blackActive = selection.color === 'black'
  const evenActive = selection.evenOdd === 'even'
  const oddActive = selection.evenOdd === 'odd'
  const lowActive = selection.lowHigh === 'low'
  const highActive = selection.lowHigh === 'high'

  const dozenActive = useMemo(
    () => ({
      d1: selection.dozen === 1,
      d2: selection.dozen === 2,
      d3: selection.dozen === 3,
    }),
    [selection.dozen]
  )

  const hasSelection =
    selection.numbers.length > 0 ||
    selection.dozen != null ||
    selection.column != null ||
    selection.evenOdd != null ||
    selection.color != null ||
    selection.lowHigh != null

  return (
    <div className="w-full rounded-xl bg-[#111212] p-3 text-white">
      <div className="flex gap-2">
        <div className="flex flex-col gap-2">
          <button
            onClick={() => toggleNumber(0)}
            className={[
              cellBase,
              'bg-green-600 h-full min-h-[96px] w-12 justify-center',
              isSelectedNumber(0) ? 'ring-2 ring-yellow-400' : '',
            ].join(' ')}
          >
            0
          </button>
        </div>

        {/* Main 3-row grid */}
        <div className="flex-1 space-y-2">
          <GridRow nums={TOP_ROW} />
          <GridRow nums={MIDDLE_ROW} />
          <GridRow nums={BOTTOM_ROW} />
        </div>

        {/* 2:1 column buttons */}
        <div className="grid grid-rows-3 gap-2 w-16">
          {([1, 2, 3] as Column[]).map(columnButton)}
        </div>
      </div>

      {/* Dozens */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        {bottomBtn('1 to 12', dozenActive.d1, () => selectDozen(dozenActive.d1 ? null : 1))}
        {bottomBtn('13 to 24', dozenActive.d2, () => selectDozen(dozenActive.d2 ? null : 2))}
        {bottomBtn('25 to 36', dozenActive.d3, () => selectDozen(dozenActive.d3 ? null : 3))}
      </div>

      {/* Low/High + Even/Odd + Red/Black */}
      <div className="grid grid-cols-6 gap-2 mt-2">
        {bottomBtn('1 to 18', lowActive, () => selectLowHigh(lowActive ? null : 'low'))}
        {bottomBtn('Even', evenActive, () => selectEvenOdd(evenActive ? null : 'even'))}
        {bottomBtn('Red', redActive, () => selectColor(redActive ? undefined : 'red'), 'bg-red-600')}
        {bottomBtn('Black', blackActive, () => selectColor(blackActive ? undefined : 'black'), 'bg-zinc-900')}
        {bottomBtn('Odd', oddActive, () => selectEvenOdd(oddActive ? null : 'odd'))}
        {bottomBtn('19 to 36', highActive, () => selectLowHigh(highActive ? null : 'high'))}
      </div>

      {/* Bet amount + chips */}
      <div className="mt-3 flex items-center gap-3">
        <div className="flex gap-2">
          {chips.map(c => (
            <button
              key={c}
              onClick={() => setAmount(c)}
              className={[
                'px-3 py-1 rounded-md bg-zinc-700 text-white',
                amount === c ? 'ring-2 ring-yellow-400' : '',
              ].join(' ')}
            >
              {c}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <input
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="w-24 px-2 py-1 rounded-md bg-zinc-900 text-white border border-zinc-700"
          />
          <button
            onClick={placeBet}
            disabled={!hasSelection || amount <= 0}
            className={[
              'px-4 py-2 rounded-md text-white',
              !hasSelection || amount <= 0 ? 'bg-zinc-600' : 'bg-[#FF013C]',
            ].join(' ')}
          >
            Place Bet
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <button
          onClick={onUndo}
          className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
          title="Undo"
        >
          ↩ Undo
        </button>
        <button
          onClick={() => {
            clearSelection()
          }}
          className="text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
          title="Clear"
        >
          Clear ⟳
        </button>
      </div>
    </div>
  )
}