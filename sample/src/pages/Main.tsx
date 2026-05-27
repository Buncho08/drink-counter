import { useEffect, useState } from 'react'
import { useCounter } from '../contexts/CounterContext'
import { onChangePage, getKindSync } from '../lib/changePage'
import Monitor from './Monitor'
import Bonus from './Bonus'
import gomen from '/gomenne.png'
import drink from '/drink.png'

export default function Test() {
  const { value } = useCounter()
  const [kind, setKind] = useState(getKindSync())

  useEffect(() => {
    const unsubscribePage = onChangePage(setKind)
    return () => { unsubscribePage() }
  }, [])

  return (
    <>
      {(kind === 0) ?
        (value >= 1000) ?
          <Bonus />
          :
          <Monitor />
        :
        <div className='font-noto h-full flex flex-col items-center justify-center relative'>
          {(kind === 1) ?
            <img src={gomen} alt="" className='h-full w-full' />
            :
            <img src={drink} alt="" className='h-full w-full' />
          }
        </div>
      }
    </>
  )
}