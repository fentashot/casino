import RouletteControls, { RouletteSelection } from '@/components/RouletteControls'
import AnimatedWheel from '@/components/RouletteWheel'
import { placeBet } from '@/lib/api'
import { SpinResponse } from '@server/types'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/casino/roulette')({
  component: Roulette,
})

function Roulette() {
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  // const [disabled, setDisabled] = useState(false);
  const [data, setData] = useState<SpinResponse | null>(null);

  const [selection, setSelection] = useState<RouletteSelection>({
    numbers: [],
    dozen: null,
    column: null,
    evenOdd: null,
    color: undefined,
    lowHigh: null,
  })

  const handleBet = async (amount: number) => {
    const res = await placeBet(amount, selection.color, selection.numbers, "straight")
    if (res) {
      setTargetNumber(res.result.number);
    }

    setData(res);

  }

  return (
    <div className='mx-auto max-w-[800px] p-2.5 space-y-10 mt-10'>
      <AnimatedWheel size={300} targetNumber={targetNumber} onSpinEnd={() => {
        setTargetNumber(null);
      }} />
      <RouletteControls handleBet={handleBet} value={selection} onChange={setSelection} onClear={() => setSelection({
        numbers: [], dozen: null, column: null, evenOdd: null, color: undefined, lowHigh: null,
      })} />
      <div className='flex space-x-2 justify-center'>
        {/* <Button className="bg-[#FF013C] text-white" onClick={handleBet} disabled={disabled}>{'Bet Red'}</Button>
        <Button className="bg-[#293136] text-white" onClick={handleBet} disabled={disabled}>{'Bet Black'}</Button> */}
      </div>
      <p>{JSON.stringify(selection)}</p>
      <div>
        <p>{`Number: ${data?.result.number} `}</p>
        <p>{`Win: ${data?.totalWin}`}</p>
        <p>{`Client Seed: ${data?.provablyFair.clientSeed}`}</p>
        <p>{`Server Seed Hash: ${data?.provablyFair.serverSeedHash}`}</p>
        <p>{`Nonce: ${data?.provablyFair.nonce}`}</p>
      </div>
    </div>
  )
}
