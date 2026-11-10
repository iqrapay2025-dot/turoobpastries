import { StoreProvider, useApp } from './store'
import { Shell } from './components/Layout'
import Home from './pages/Home'
import Order from './pages/Order'
import Checkout from './pages/Checkout'
import Fee from './pages/Fee'
import Confirmation from './pages/Confirmation'
import Status from './pages/Status'
import MyOrders from './pages/MyOrders'
import NotFound from './pages/NotFound'
import { Privacy, Terms } from './pages/Legal'
import AdminApp from './admin/AdminApp'

function Router() {
  const { route } = useApp()
  const r = route.replace('#', '')
  const path = r.split('?')[0]
  if (path.startsWith('/admin')) return <AdminApp />

  let Page: React.ComponentType
  if (path === '' || path === '/' || path === '/home') Page = Home
  else if (path.startsWith('/order')) Page = Order
  else if (path.startsWith('/checkout')) Page = Checkout
  else if (path.startsWith('/fee')) Page = Fee
  else if (path.startsWith('/confirmation')) Page = Confirmation
  else if (path.startsWith('/status')) Page = Status
  else if (path.startsWith('/my-orders')) Page = MyOrders
  else if (path === '/privacy') Page = Privacy
  else if (path === '/terms') Page = Terms
  else Page = NotFound

  return <Shell><Page /></Shell>
}

export default function App() {
  return <StoreProvider><Router /></StoreProvider>
}