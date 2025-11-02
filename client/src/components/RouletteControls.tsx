import { useCallback, useEffect, useState } from 'react'
import { Loader } from 'lucide-react'
import { betSchema } from '@server/zodTypes'
import z from 'zod'

export type RouletteSelection = z.infer<typeof betSchema>

type Props = {
  value?: RouletteSelection
  onChange?: (v: RouletteSelection) => void
  onUndo?: () => void
  onClear?: () => void
  newBalance?: number
  defaultAmount?: number
  disableBet?: boolean
  // Called with an array of bets to place in a single spin
  onPlaceBets?: (bets: RouletteSelection[]) => Promise<{ success: boolean; error?: unknown }>
}

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])
const TOP_ROW = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36]
const MIDDLE_ROW = [2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35]
const BOTTOM_ROW = [1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34]

const cellBase = 'select-none cursor-pointer rounded-sm text-sm font-medium text-white text-center transition-colors'

export default function RouletteControls({ defaultAmount = 10, disableBet = false, onPlaceBets, newBalance }: Props) {

  const [betAmount, setBetAmount] = useState(defaultAmount)
  const [chipCount, setChipCount] = useState(1)
  const [pendingStacks, setPendingStacks] = useState<Record<string, { total: number; chips: number }>>({})
  const [basket, setBasket] = useState<RouletteSelection[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => setBetAmount(defaultAmount), [defaultAmount])

  const numberBg = (n: number) => n === 0 ? 'bg-green-600' : (RED_NUMBERS.has(n) ? 'bg-red-600' : 'bg-zinc-800')
  const addPending = (key: string, addValue: number, addChips = 1) =>
    setPendingStacks(prev => ({ ...prev, [key]: { total: (prev[key]?.total || 0) + addValue, chips: (prev[key]?.chips || 0) + addChips } }))

  const addClickBet = (key: string) => {
    if (disableBet || betAmount <= 0) return
    const addValue = betAmount * chipCount
    addPending(key, addValue, chipCount)
    const sel = makeSelectionFromKey(key, addValue)
    setBasket(prev => {
      const idx = prev.findIndex(b => b.type === sel.type && JSON.stringify(b.numbers || []) === JSON.stringify(sel.numbers || []) && b.choice === sel.choice && b.color === sel.color)
      return idx >= 0 ? prev.map((b, i) => i === idx ? { ...b, amount: b.amount + addValue } : b) : [...prev, sel]
    })
  }

  const removeClickBet = (key: string) => {
    if (disableBet) return
    const removeValue = betAmount * chipCount

    // Remove from pendingStacks
    setPendingStacks(prev => {
      const current = prev[key]
      if (!current || current.total <= removeValue) {
        const newStacks = { ...prev }
        delete newStacks[key]
        return newStacks
      }
      return { ...prev, [key]: { total: current.total - removeValue, chips: Math.max(0, current.chips - chipCount) } }
    })

    // Remove from basket
    const sel = makeSelectionFromKey(key, removeValue)
    setBasket(prev => {
      const idx = prev.findIndex(b => b.type === sel.type && JSON.stringify(b.numbers || []) === JSON.stringify(sel.numbers || []) && b.choice === sel.choice && b.color === sel.color)
      if (idx >= 0) {
        const item = prev[idx]
        if (item.amount <= removeValue) {
          return prev.filter((_, i) => i !== idx)
        }
        return prev.map((b, i) => i === idx ? { ...b, amount: b.amount - removeValue } : b)
      }
      return prev
    })
  }

  const handleClick = (key: string, e: React.MouseEvent) => {
    e.preventDefault()
    if (e.button === 2) { // Right click
      removeClickBet(key)
    } else { // Left click
      addClickBet(key)
    }
  }

  const formatValue = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000)}k`
    }
    return value.toString()
  }

  const getKeyFromSelection = (selection: RouletteSelection): string => {
    switch (selection.type) {
      case 'straight': return `straight:${selection.numbers?.[0]}`
      case 'red_black': return `red_black:${selection.color}`
      case 'dozen': return `dozen:${selection.choice}`
      case 'column': return `column:${selection.choice}`
      case 'even_odd': return `even_odd:${selection.choice}`
      case 'high_low': return `high_low:${selection.choice}`
      default: return `${selection.type}:${selection.choice}`
    }
  }

  const removeFromBasket = (indexToRemove: number) => {
    const betToRemove = basket[indexToRemove]
    if (!betToRemove) return

    const key = getKeyFromSelection(betToRemove)

    // Update basket by removing the bet at the specified index
    setBasket(prev => prev.filter((_, idx) => idx !== indexToRemove))

    // Update pending stacks to reflect the removal
    setPendingStacks(prev => {
      const current = prev[key]
      if (!current) return prev

      const newTotal = current.total - betToRemove.amount
      const newChips = current.chips - (betToRemove.amount / betAmount)

      if (newTotal <= 0) {
        // Remove the entry if no bets remain
        const newState = { ...prev }
        delete newState[key]
        return newState
      }

      return {
        ...prev,
        [key]: { total: newTotal, chips: newChips }
      }
    })
  }

  const makeSelectionFromKey = useCallback((key: string, amount: number): RouletteSelection => {
    const [type, choice] = key.split(':')
    const base = { amount, numbers: [] as number[], color: undefined, choice: undefined }
    switch (type) {
      case 'straight': return { ...base, type: 'straight', numbers: [Number(choice)] }
      case 'red_black': return { ...base, type: 'red_black', color: choice as RouletteSelection['color'] }
      default: return { ...base, type: type as RouletteSelection['type'], choice: choice as RouletteSelection['choice'] }
    }
  }, [])

  const placeBasket = async () => {
    if (!basket.length || !onPlaceBets) return
    setLoading(true)
    try {
      await onPlaceBets(basket)
      setBasket([])
      setPendingStacks({}) // Clear pending stacks after successful bet placement
    }
    finally { setLoading(false) }
  }

  const GridRow = ({ nums }: { nums: number[] }) => (
    <div className="grid grid-cols-12 gap-1">{nums.map(n => (
      <button
        key={n}
        onMouseDown={(e) => handleClick(`straight:${n}`, e)}
        onContextMenu={(e) => e.preventDefault()}
        className={[cellBase, 'relative w-10 h-10', numberBg(n)].join(' ')}
      >
        <div className="w-full h-full flex items-center justify-center">{n}</div>
        {pendingStacks[`straight:${n}`] ? <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-300 text-black text-xs px-1 rounded-sm z-10">{formatValue(pendingStacks[`straight:${n}`].total)}</div> : null}
      </button>
    ))}</div>
  )

  return (
    <div className="w-full rounded-xl bg-[#111212] p-4 text-white">
      <div className="flex gap-2 items-start">
        <div className="w-12">
          <button
            onMouseDown={(e) => handleClick('straight:0', e)}
            onContextMenu={(e) => e.preventDefault()}
            className={[cellBase, 'w-full h-24', 'bg-green-600'].join(' ')}
          >
            <div className="w-full h-full flex items-center justify-center">0</div>
            {pendingStacks['straight:0'] ? <div className="absolute -bottom-2 left-6 bg-yellow-300 text-black text-xs px-1 rounded-sm z-10">{formatValue(pendingStacks['straight:0'].total)}</div> : null}
          </button>
        </div>

        <div className="flex-1 space-y-1">
          <GridRow nums={TOP_ROW} />
          <GridRow nums={MIDDLE_ROW} />
          <GridRow nums={BOTTOM_ROW} />
        </div>

        <div className="grid grid-rows-3 gap-1 w-16">
          <div className="relative"><button className="bg-zinc-700 h-10 w-full" onMouseDown={(e) => handleClick('column:col1', e)} onContextMenu={(e) => e.preventDefault()}>2:1</button>{pendingStacks['column:col1'] ? <div className="badge bottom-0 right-0">{formatValue(pendingStacks['column:col1'].total)}</div> : null}</div>
          <div className="relative"><button className="bg-zinc-700 h-10 w-full" onMouseDown={(e) => handleClick('column:col2', e)} onContextMenu={(e) => e.preventDefault()}>2:1</button>{pendingStacks['column:col2'] ? <div className="badge bottom-0 right-0">{formatValue(pendingStacks['column:col2'].total)}</div> : null}</div>
          <div className="relative"><button className="bg-zinc-700 h-10 w-full" onMouseDown={(e) => handleClick('column:col3', e)} onContextMenu={(e) => e.preventDefault()}>2:1</button>{pendingStacks['column:col3'] ? <div className="badge bottom-0 right-0">{formatValue(pendingStacks['column:col3'].total)}</div> : null}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="relative"><button onMouseDown={(e) => handleClick('dozen:1st12', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">1 to 12</button>{pendingStacks['dozen:1st12'] ? <div className="badge">{formatValue(pendingStacks['dozen:1st12'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('dozen:2nd12', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">13 to 24</button>{pendingStacks['dozen:2nd12'] ? <div className="badge">{formatValue(pendingStacks['dozen:2nd12'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('dozen:3rd12', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">25 to 36</button>{pendingStacks['dozen:3rd12'] ? <div className="badge">{formatValue(pendingStacks['dozen:3rd12'].total)}</div> : null}</div>
      </div>

      <div className="grid grid-cols-6 gap-2 mt-2">
        <div className="relative"><button onMouseDown={(e) => handleClick('high_low:low', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">1 to 18</button>{pendingStacks['high_low:low'] ? <div className="badge">{formatValue(pendingStacks['high_low:low'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('even_odd:even', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">Even</button>{pendingStacks['even_odd:even'] ? <div className="badge">{formatValue(pendingStacks['even_odd:even'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('red_black:red', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-red-600">Red</button>{pendingStacks['red_black:red'] ? <div className="badge">{formatValue(pendingStacks['red_black:red'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('red_black:black', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-900">Black</button>{pendingStacks['red_black:black'] ? <div className="badge">{formatValue(pendingStacks['red_black:black'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('even_odd:odd', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">Odd</button>{pendingStacks['even_odd:odd'] ? <div className="badge">{formatValue(pendingStacks['even_odd:odd'].total)}</div> : null}</div>
        <div className="relative"><button onMouseDown={(e) => handleClick('high_low:high', e)} onContextMenu={(e) => e.preventDefault()} className="w-full h-10 bg-zinc-700">19 to 36</button>{pendingStacks['high_low:high'] ? <div className="badge">{formatValue(pendingStacks['high_low:high'].total)}</div> : null}</div>
      </div>


      <div className="p-3 rounded">
        <div className="text-xl text-zinc-400 my-5">Balance: {newBalance !== undefined ? newBalance : 'N/A'}</div>
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-400">Chip value</div>
          <div className="flex gap-2">
            {[10, 20, 50, 100, 500, 1000].map(d => (
              <button key={d} onClick={() => setBetAmount(d)} className={["px-3 py-1 rounded", betAmount === d ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-white'].join(' ')}>{d}</button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="text-sm text-zinc-400">Chips /click</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} onClick={() => setChipCount(n)} className={["px-2 py-1 rounded", chipCount === n ? 'bg-yellow-400 text-black' : 'bg-zinc-700 text-white'].join(' ')}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3">
          <div className="flex gap-2 items-center">
            <div className="text-sm text-zinc-400">Pending: {Object.values(pendingStacks).reduce((s, v) => s + v.total, 0)}</div>
          </div>

          <div className="mt-3">
            <div className="text-sm text-zinc-400 mb-2">Basket</div>
            <div className="flex gap-2 flex-wrap">
              {basket.length === 0 ? <div className="text-sm text-zinc-500">empty</div> : basket.map((b, i) => (
                <div key={i} className="px-2 py-1 rounded bg-zinc-800 text-sm flex items-center gap-2">
                  <div className="font-mono text-xs">{b.type}</div>
                  <div className="font-mono text-xs">{b.numbers?.length ? b.numbers.join(',') : b.choice}</div>
                  <div className="font-mono text-xs">{b.amount}</div>
                  <button onClick={() => removeFromBasket(i)} className="text-xs text-zinc-400">✕</button>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-3">
              <button onClick={placeBasket} disabled={!onPlaceBets || !basket.length} className={["px-4 py-2 rounded text-white", (!onPlaceBets || !basket.length) ? 'bg-zinc-600' : 'bg-[#FF013C]'].join(' ')}>{loading ? <Loader className="animate-spin" /> : `Place Bets (${basket.length})`}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
