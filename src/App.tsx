import { StoreProvider, useApp } from './store'
import { Shell } from './components/Layout'
import Home from './pages/Home'
import Order from './pages/Order'
import Checkout from './pages/Checkout'
import Fee from './pages/Fee'
import Confirmation from './pages/Confirmation'
import Status from './pages/Status'
import AdminApp from './admin/AdminApp'

function Router() {
  const { route } = useApp()
  const r = route.replace('#', '')
  if (r.startsWith('/admin')) return <AdminApp />
  const Page = r.startsWith('/order') ? Order : r.startsWith('/checkout') ? Checkout : r.startsWith('/fee') ? Fee : r.startsWith('/confirmation') ? Confirmation : r.startsWith('/status') ? Status : Home
  return <Shell><Page /></Shell>
}

export default function App() {
  return <StoreProvider><Router /></StoreProvider>
}
