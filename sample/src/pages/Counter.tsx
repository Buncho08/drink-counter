import { useState } from 'react';
import { useCounter } from '../contexts/CounterContext';
import DropDownMenu from '../components/dropDown';

export default function Counter() {
  const { value, loading, increment, decrement, reset, setCounter } = useCounter();
  const [inputValue, setInputValue] = useState('');

  const handleReset = () => {
    if (window.confirm('カウンターを 0 にリセットしますか？')) {
      reset();
    }
  };

  const handleSetValue = () => {
    const num = parseInt(inputValue, 10);
    if (isNaN(num)) return;
    if (window.confirm(`カウンターを ${num} に変更しますか？`)) {
      setCounter(num);
      setInputValue('');
    }
  };

  if (loading) return <div className='font-noto h-full flex items-center justify-center'>読み込み中...</div>

  return (
    <div className='font-noto h-full flex flex-col items-center justify-center'>
      <div className='mb-10 flex flex-row'>
        <h1 className='text-6xl'></h1>
        <h2 className='text-6xl'>ドリンク枚数カウンター</h2>
      </div>
      <div className='my-8 flex flex-row items-end'>
        <p className='text-7xl'>只今...</p>
        <div className='text-9xl'>{value}</div>
        <p className='text-7xl'>杯</p>
      </div>
      <div className='flex flex-row gap-8'>
        <button
          onClick={increment}
          className="inline-block rounded-sm bg-amber-400 px-12 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:ring-3 focus:outline-hidden"
        >
          増やす +1
        </button>
        <button
          onClick={decrement}
          className="inline-block rounded-sm border border-current px-12 py-3 text-sm font-medium text-amber-400 transition hover:scale-110 hover:shadow-xl focus:ring-3 focus:outline-hidden"
        >
          減らす -1
        </button>
      </div>
      <div className='mt-8 flex flex-row gap-8 items-center'>
        <button
          onClick={handleReset}
          className="inline-block rounded-sm bg-red-500 px-12 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:ring-3 focus:outline-hidden"
        >
          リセット
        </button>
        <div className='flex flex-row gap-2 items-center'>
          <input
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="数値を入力"
            className="w-32 rounded-sm border border-gray-300 px-4 py-3 text-sm text-center focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-hidden"
          />
          <button
            onClick={handleSetValue}
            disabled={inputValue === '' || isNaN(parseInt(inputValue, 10))}
            className="inline-block rounded-sm bg-blue-500 px-8 py-3 text-sm font-medium text-white transition hover:scale-110 hover:shadow-xl focus:ring-3 focus:outline-hidden disabled:opacity-50 disabled:hover:scale-100"
          >
            変更
          </button>
        </div>
      </div>
      <h3 className='mt-10 mb-5 text-4xl'>ページ切り替え</h3>
      <DropDownMenu />
    </div>
  );
}