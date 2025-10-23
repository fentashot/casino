import { Button } from '@/components/ui/button'
import AnimatedWheel from '@/components/Wheel'
import { testPlaceBet } from '@/lib/api'
import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authenticated/casino/roulette')({
  component: RouteComponent,
})


function RouteComponent() {
  const [targetNumber, setTargetNumber] = useState<number | null>(null);
  const [disabled, setDisabled] = useState(false);



  const handleBet = async () => {
    setDisabled(true);
    const res = await testPlaceBet(10, 'red')
    if (res) {
      setTargetNumber(res.result.number);
      console.log(res.result);
    }
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
        <div>
        </div>
      </div>
    </div>
  )
}
