import { useNavigate } from 'react-router'
import nanako from "/nanako.png"

export default function Top() {
  const navigate = useNavigate()
  const linkStyle = "transition-colors hover:text-sky-400 cursor-pointer"

  return (
    <div className='font-noto h-full'>
      <div id='header' className='w-full h-[360px]'>
        <img src={nanako} alt="菜々子ちゃん" className='object-[left_calc(-200%)_top_calc(36%)] w-[120%] max-h-full object-cover max-w-full' />
      </div>
      <div className="m-5 flex self-center items-center flex-col">
        <h1 className="text-5xl m-5 font-bold">
          🍻TOPページ🍻
        </h1>
        <ul className="mt-7 flex self-center items-center flex-col gap-4 text-xl text-sky-950">
          <li><p onClick={() => navigate('/counter')} className={linkStyle}>操作用 カウンター</p></li>
          <li><p onClick={() => navigate('/main')} className={linkStyle}>モニター表示用 カウンター</p></li>
        </ul>
      </div>
    </div>
  )
}