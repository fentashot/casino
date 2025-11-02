import { useAuth } from '@/auth-context'
import RouletteControls, { RouletteSelection } from '@/components/RouletteControls'
import AnimatedWheel from '@/components/RouletteWheel'
import { api } from '@/lib/api'
import { SpinResponse } from '@server/types'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/casino/roulette')({
  component: Roulette,
})

type Result = {
  number: number;
  color: 'red' | 'black' | 'green';
}

function Roulette() {
  const [result, setResult] = useState<Result | null>(null);
  // const [disabled, setDisabled] = useState(false);
  const [data, setData] = useState<SpinResponse | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [disableBetting, setDisableBetting] = useState(false);

  const { user } = useAuth();

  const [selection, setSelection] = useState<RouletteSelection>({
    type: "straight",
    numbers: [],
    amount: 10,
    color: undefined,
    choice: undefined,
  })



  const handlePlaceBets = async (bets: RouletteSelection[]) => {
    setShowResult(false)
    try {
      setDisableBetting(true);

      const res = await api.casino.spin.$post({
        json: {
          clientSeed: '8293yr8wehdu2',
          nonce: 1,
          bets: bets.map((b) => ({
            type: b.type,
            amount: b.amount,
            color: b.color || undefined,
            choice: b.choice,
            numbers: b.numbers || [],
          })),
        },
      });

      const data = await res.json();

      if (res.ok) {
        const spin = data as SpinResponse;
        if (spin.result) {
          setResult(spin.result);
        }
        setData(spin);
      }
      return { success: true, error: null };
    } catch (error) {
      setDisableBetting(false);
      return { success: false, error };
    }
  }

  function handleResultNumber() {
    if (result?.color === 'red') {
      return <div className={`w-full h-full rounded-md flex items-center justify-center bg-[#FF013C]`}>{result.number}</div>
    } else if (result?.color === 'black') {
      return <div className={`w-full h-full rounded-md flex items-center justify-center bg-[#1D2224]`}>{result.number}</div>
    } else if (result?.color === 'green') {
      return <div className={`w-full h-full rounded-md flex items-center justify-center bg-[#16A34A]`}>{result.number}</div>
    }
  }

  return (
    <>
      <section className='mx-auto max-w-[700px] p-2.5 space-y-10 mt-10'>
        <div className='flex items-center justify-center gap-10'>
          <div className="w-12 h-12 overflow-hidden bg-zinc-700 rounded-md">
            <div
              className={`w-12 h-12 rounded-md text-center flex items-center justify-center font-bold duration-200 transform transition-all ease-in-out ${showResult ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-70'
                }`}
            >
              <div className="w-full h-full rounded-md text-white flex items-center justify-center">
                {handleResultNumber()}
              </div>
            </div>
          </div>
          <AnimatedWheel fontSizeProp={11} size={280} targetNumber={result?.number} onSpinEnd={() => {
            setDisableBetting(false);
            setShowResult(true)
          }} />
        </div>
        <div>
          <RouletteControls onPlaceBets={handlePlaceBets} value={selection} onChange={setSelection} balance={data?.newBalance || user?.balance} disableBet={disableBetting} />
        </div>
        <div className='flex space-x-2 justify-center'>
        </div>
      </section>
    </>
  )
}


