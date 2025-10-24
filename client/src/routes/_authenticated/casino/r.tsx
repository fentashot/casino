import { useAuth } from '@/auth-context'
import RouletteControls, { RouletteSelection } from '@/components/RouletteControls'
import AnimatedWheel from '@/components/RouletteWheel'
import { placeBet } from '@/lib/api'
import { rBlack, rGreen, rRed } from '@/lib/utils'
import { SpinResponse } from '@server/types'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/casino/r')({
  component: Roulette,
})

const baseSelection: RouletteSelection = {
  type: "straight",
  numbers: [],
  amount: 10,
  color: undefined,
  choice: undefined,
}

type Result = {
  number: number;
  color: 'red' | 'black' | 'green';
}

function Roulette() {
  const [result, setResult] = useState<Result | null>(null);
  // const [disabled, setDisabled] = useState(false);
  const [data, setData] = useState<SpinResponse | null>(null);

  const { user } = useAuth();

  const [selection, setSelection] = useState<RouletteSelection>({
    type: "straight",
    numbers: [],
    amount: 10,
    color: undefined,
    choice: undefined,
  })

  const clearSelection = () => {
    setSelection(baseSelection)
  }

  const handleBet = async () => {
    try {
      const res = await placeBet(
        selection.amount,
        selection.color,
        selection.numbers,
        selection.type,
        selection.choice
      )
      if (res) {
        setResult(res.result);
      }
      setData(res);
      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error };
    }
  }

  function handleResultNumber() {
    if (result?.color === 'red') {
      return <div className={`w-full h-full rounded flex items-center justify-center bg-[${rRed}]`}>{result.number}</div>
    } else if (result?.color === 'black') {
      return <div className={`w-full h-full rounded flex items-center justify-center bg-[${rBlack}]`}>{result.number}</div>
    } else if (result?.color === 'green') {
      return <div className={`w-full h-full rounded flex items-center justify-center bg-[${rGreen}]`}>{result.number}</div>
    }
  }

  return (
    <>
      <section>
        {/* <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-500 ">01</div>
          <div className="bg-blue-500">02</div>
          <div className="bg-blue-500">03</div>
          <div className="col-span-2 bg-blue-500">04</div>
          <div className="bg-blue-500">05</div>
          <div className="bg-blue-500">06</div>
          <div className="col-span-2 ...">07</div>
        </div> */}
      </section>
      <div className='mx-auto max-w-[700px] p-2.5 space-y-10 mt-10'>
        <div className='flex items-center justify-center gap-10'>
          <div className='w-12 h-12 bg-zinc-700 rounded text-center flex items-center justify-center text-white font-bold'>
            {handleResultNumber()}
          </div>
          <AnimatedWheel fontSizeProp={11} size={280} targetNumber={result?.number} onSpinEnd={() => {
            clearSelection();
          }} />
        </div>
        <div>
          <RouletteControls handleBet={handleBet} value={selection} onChange={setSelection} newBalance={data?.newBalance || user?.balance} />
        </div>
        <div className='flex space-x-2 justify-center'>
        </div>
        <h1 className='text-xl'>Balance: {data?.newBalance || user?.balance}</h1>
        <p>{JSON.stringify(selection)}</p>
        <div>
          <p>{`Number: ${data?.result.number} `}</p>
          <p>{`Win: ${data?.totalWin}`}</p>
          <p>{`Client Seed: ${data?.provablyFair.clientSeed}`}</p>
          <p>{`Server Seed Hash: ${data?.provablyFair.serverSeedHash}`}</p>
          <p>{`Nonce: ${data?.provablyFair.nonce}`}</p>
        </div>
      </div>
    </>
  )
}


