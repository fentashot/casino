import { Button } from '@/components/ui/button'
import AnimatedWheel from '@/components/Wheel'
import { testPlaceBet } from '@/lib/api'
import { SpinResponse } from '@server/routes/casino'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/casino/roulette')({
  component: RouteComponent,
})


function RouteComponent() {
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [disabled, setDisabled] = useState(false);
  const [data, setData] = useState<SpinResponse | null>(null);



  const handleBet = async () => {
    setDisabled(true);
    const res = await testPlaceBet(10, 'red')
    if (res) {
      setTargetNumber(res.result.number);
    }

    setTimeout(() => {
      setDisabled(false);
    }, 4000);
    setData(res);

  }

  return (
    <div className='mx-auto max-w-lg p-2.5 space-y-10 mt-10'>
      <AnimatedWheel size={300} targetNumber={targetNumber} onSpinEnd={() => {
        setDisabled(false)
        setTargetNumber(null);
      }} />
      <div className='flex space-x-2 justify-center'>
        <Button className="bg-[#FF013C] text-white" onClick={handleBet} disabled={disabled}>{'Bet Red'}</Button>
        <Button className="bg-[#293136] text-white" onClick={handleBet} disabled={disabled}>{'Bet Black'}</Button>
      </div>
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
