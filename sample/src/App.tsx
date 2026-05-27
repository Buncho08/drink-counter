import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router';
import Top from './pages/Top';
import Monitor from './pages/Monitor';
import Counter from './pages/Counter';
import Main from './pages/Main';
import Settings from './pages/Settings';
import { supabase } from './lib/supabase'
import Login from './pages/Login';
import PrivateRoute from './components/PrivateRoute'

const router = createBrowserRouter([
  { path: '/', element: <PrivateRoute><Top /></PrivateRoute> },
  { path: '/login', element: <Login /> },
  { path: '/monitor', element: <PrivateRoute><Monitor /></PrivateRoute> },
  { path: '/counter', element: <PrivateRoute><Counter /></PrivateRoute> },
  { path: '/main', element: <PrivateRoute><Main /></PrivateRoute> },
  { path: '/settings', element: <PrivateRoute><Settings /></PrivateRoute> },
]);


export default function App() {
  useEffect(() => {
    const test = async () => {
      const { data, error } = await supabase.from('counters').select('*')
      console.log('data:', data)
      console.log('error:', error)
    }
    test()
  }, [])
  return (
    <RouterProvider router={router} />
  )
}