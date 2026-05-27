import bonus from '/bonus.mp4'
import { useCounter } from '../contexts/CounterContext'

export default function Bonus() {
  const { value } = useCounter()

  return (
    <div className='flex justify-center items-center h-full bg-black'>
      <div className='font-noto h-[770px] w-[1220px] relative'>
        <video autoPlay loop playsInline muted className='h-full w-full'>
          <source src={bonus} type="video/mp4" />
        </video>
        <div className='absolute right-[18.3rem] top-[4rem] text-center my-0'>
          <p className='text-[90px] font-extrabold text-black'>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}