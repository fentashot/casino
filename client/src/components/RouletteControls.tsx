import { Button } from '@/components/ui/button'
import { rBlack, rGreen, rRed } from '@/lib/utils'
import { betSchema } from '@server/zodTypes'
import { Loader, RefreshCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import z from 'zod'

type EvenOdd = 'even' | 'odd'
type Color = 'red' | 'black'
type LowHigh = 'high' | 'low'
type Dozen = "1st12" | "2nd12" | "3rd12"
type Column = "col1" | "col2" | "col3"

const baseSelection: RouletteSelection = {
  type: "straight",
  numbers: [],
  amount: 10,
  color: undefined,
  choice: undefined,
}

export type RouletteSelection = z.infer<typeof betSchema>

type Props = {
  handleBet: () => Promise<{ success: boolean; error: unknown }>
  value?: RouletteSelection
  onChange?: (v: RouletteSelection) => void
  onUndo?: () => void
  onClear?: () => void
  onPlaceBet?: (selection: RouletteSelection, amount: number) => void
  newBalance?: number
  defaultAmount?: number
  disableBet?: boolean
}

const RED_NUMBERS = new Set([
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
])

const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
const MIDDLE_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
const BOTTOM_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]

// Component
export default function RouletteControls({
  handleBet,
  value,
  onChange,
  defaultAmount = 0,
  newBalance,
  disableBet = false,
}: Props) {
  const [internal, setInternal] = useState<RouletteSelection>(baseSelection)
  const [loading, setLoading] = useState<boolean>(false)
  const selection = value ?? internal

  const [betAmount, setBetAmount] = useState<number>(defaultAmount)
  const chips = [10, 20, 50, 100, 500, 1000]

  useEffect(() => {
    setSelection({
      ...selection,
      amount: betAmount,
    })
  }, [betAmount])

  // single-bet mode helpers: setting any bet clears others
  const setSelection = (next: RouletteSelection) => {
    if (!value) setInternal(next)
    onChange?.(next)
  }


  const isSelectedNumber = (n: number) => selection.numbers.includes(n)

  // Toggle a single number (only one number allowed)
  const toggleNumber = (n: number) => {
    if (isSelectedNumber(n)) {
      setSelection(baseSelection)
    } else {
      setSelection({
        type: "straight",
        numbers: [n],
        amount: betAmount,
        color: undefined,
        choice: undefined,
      })
    }
  }

  // Selecting other bet types clears number and other groups (single bet)
  const selectDozen = (d: Dozen | undefined) =>
    setSelection({
      type: "dozen",
      numbers: [],
      amount: betAmount,
      color: undefined,
      choice: d,
    })

  const selectColumn = (c: Column | undefined) =>
    setSelection({
      type: "column",
      numbers: [],
      amount: betAmount,
      color: undefined,
      choice: c,
    })

  const selectEvenOdd = (eo: EvenOdd | undefined) =>
    setSelection({
      type: "even_odd",
      numbers: [],
      amount: betAmount,
      color: undefined,
      choice: eo,
    })

  const selectColor = (c: Color | undefined) =>
    setSelection({
      type: "red_black",
      numbers: [],
      amount: betAmount,
      color: c,
      choice: undefined,
    })

  const selectLowHigh = (lh: LowHigh | undefined) =>
    setSelection({
      type: "high_low",
      numbers: [],
      amount: betAmount,
      color: undefined,
      choice: lh,
    })

  // Roulette colors


  // Helpers for styling
  const numberBg = (n: number) => {
    if (n === 0) return `bg-[${rGreen}]`
    return RED_NUMBERS.has(n) ? `bg-[${rRed}]` : `bg-[#1D2224]`
  }

  const cellBase =
    'select-none cursor-pointer rounded-md text-sm font-medium text-white text-center transition-colors'

  const numberCell = (n: number) => (
    <button
      key={n}
      onClick={() => toggleNumber(n)}
      className={[
        cellBase, "w-10 h-10",
        numberBg(n),
        isSelectedNumber(n) ? 'ring-2 ring-yellow-400' : 'ring-0',
      ].join(' ')}
    >
      {n}
    </button>
  )

  const GridRow = ({ nums }: { nums: number[] }) => (
    <div className="grid grid-cols-12 gap-1">{nums.map(numberCell)}</div>
  )

  // Right-side 2:1 columns
  const columnButton = (idx: Column) => {
    const active = selection.type === 'column' && selection.choice === idx
    return (
      <button
        key={idx}
        onClick={() => selectColumn(active ? undefined : idx)}
        className={[
          cellBase, "w-16 h-10",
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
      className={[cellBase, 'bg-zinc-700 h-10 w-full', active ? 'ring-2 ring-yellow-400' : '', extraClasses].join(' ')}
    >
      {label}
    </button>
  )

  // Bottom controls
  const bottomBtnRB = (label: string, active: boolean, onClick: () => void, extraClasses = '') => (
    <button
      onClick={onClick}
      className={[cellBase, 'h-10 w-full', active ? 'ring-2 ring-yellow-400' : '', extraClasses].join(' ')}
    >
      {label}
    </button>
  )


  const redActive = selection.type === 'red_black' && selection.color === 'red'
  const blackActive = selection.type === 'red_black' && selection.color === 'black'
  const evenActive = selection.type === 'even_odd' && selection.choice === 'even'
  const oddActive = selection.type === 'even_odd' && selection.choice === 'odd'
  const lowActive = selection.type === 'high_low' && selection.choice === 'low'
  const highActive = selection.type === 'high_low' && selection.choice === 'high'

  const dozenActive = useMemo(
    () => ({
      d1: selection.type === 'dozen' && selection.choice === '1st12',
      d2: selection.type === 'dozen' && selection.choice === '2nd12',
      d3: selection.type === 'dozen' && selection.choice === '3rd12',
    }),
    [selection.type, selection.choice]
  )

  const hasSelection =
    selection.numbers.length > 0 || selection.type !== 'straight'

  return (
    <>
      <div className="max-w-fit mx-auto rounded-xl bg-[#111212] p-4 text-white">
        <div className="flex gap-1 mx-auto">
          <div className="gap-1">
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
          <div className="flex-1 space-y-1">
            <GridRow nums={TOP_ROW} />
            <GridRow nums={MIDDLE_ROW} />
            <GridRow nums={BOTTOM_ROW} />
          </div>

          {/* 2:1 column buttons */}
          <div className="grid grid-rows-3 gap-1 ">
            {(["col1", "col2", "col3"] as Column[]).map(columnButton)}
          </div>
        </div>

        {/* Dozens */}
        <div className="grid grid-cols-3 gap-1 mt-1 h-10 mr-[68px] ml-[52px]">
          {bottomBtn('1 to 12', dozenActive.d1, () => selectDozen(dozenActive.d1 ? undefined : '1st12'))}
          {bottomBtn('13 to 24', dozenActive.d2, () => selectDozen(dozenActive.d2 ? undefined : '2nd12'))}
          {bottomBtn('25 to 36', dozenActive.d3, () => selectDozen(dozenActive.d3 ? undefined : '3rd12'))}
        </div>

        {/* Low/High + Even/Odd + Red/Black */}
        <div className="grid grid-cols-6 gap-1 mt-1 mr-[68px] ml-[52px]">
          <div className="">{bottomBtn('1 to 18', lowActive, () => selectLowHigh(lowActive ? undefined : 'low'),)}</div>
          <div className="">{bottomBtn('Even', evenActive, () => selectEvenOdd(evenActive ? undefined : 'even'))}</div>
          <div className="">{bottomBtnRB('', redActive, () => selectColor(redActive ? undefined : 'red'), `bg-[${rRed}]`)}</div>
          <div className="">{bottomBtnRB('', blackActive, () => selectColor(blackActive ? undefined : 'black'), `bg-[${rBlack}]`)}</div>
          <div className="">{bottomBtn('Odd', oddActive, () => selectEvenOdd(oddActive ? undefined : 'odd'))}</div>
          <div className="">{bottomBtn('19 to 36', highActive, () => selectLowHigh(highActive ? undefined : 'high'))}</div>
        </div>

      </div>
      {/* Bet amount + chips */}
      <div className="mt-3 flex gap-3 bg-[#111212] p-5 rounded-xl flex-col">
        <div className='flex text-xl gap-2 items-center'>
          <h1 className='font-medium'>Balance:</h1>
          <div className='border rounded-lg py-0.5 px-3 text-lg'>${newBalance || 0}</div>
        </div>
        <div className='flex flex-between w-full'>
          <div className="flex gap-2">
            {chips.map(c => (
              <button
                key={c}
                onClick={() => setBetAmount(c)}
                className={[
                  'px-3 py-1 rounded-md bg-zinc-700 text-white',
                  betAmount === c ? 'ring-2 ring-yellow-400' : '',
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
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              className="w-24 px-2 py-1 rounded-md bg-zinc-900 text-white border border-zinc-700"
            />
            <button
              onClick={() => {
                setLoading(true);
                handleBet().
                  finally(() => {
                    setLoading(false)
                  })
              }}
              disabled={(!hasSelection || betAmount <= 0 || disableBet) && true}
              className={[
                'px-4 py-2 rounded-md text-white min-w-28 duration-200',
                !hasSelection || betAmount <= 0 || disableBet ? 'bg-zinc-600' : 'bg-[#FF013C]',
              ].join(' ')}
            >
              {loading ? <Loader className='animate-spin mx-auto' /> : 'Place Bet'}
            </button>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center justify-between mt-3 text-sm w-full">
          <Button
            onClick={() => {
              setSelection(baseSelection)
            }}
            variant={'outline'}
            className="transition-colors flex items-center gap-2 font-medium "
            title="Clear"
          >

            <RefreshCcw size={20} />Refresh
          </Button>
        </div>
      </div>
    </>

  )
}