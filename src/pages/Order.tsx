import { Notice, cx } from '../components/ui'
import { BatchBanner, BatchPicker, ProductCard } from '../components/Blocks'
import { CartPanel } from '../components/Summary'
import { useApp } from '../store'
import { toProduct } from '../lib/products'

export default function Order() {
  const { closed, count, products, productsError, productsLoading, currentBatch } = useApp()
  const soldOut = !!currentBatch?.is_sold_out

  return (
    <main className="mx-auto max-w-6xl px-4 pb-32 pt-8 sm:px-6 lg:pb-10">
      <h1 className="text-4xl font-semibold sm:text-5xl">Build your order</h1>
      <p className="mt-2 text-ink-soft">Choose a batch, then pick your pieces.</p>

      <div className="mt-6"><BatchPicker /></div>
      <div className="mt-6"><BatchBanner /></div>

      {soldOut && (
        <div className="mt-6">
          <Notice tone="warn" title="Puff-puff is sold out for this batch">
            We have hit our maximum portions. Follow us on Instagram for the next batch.
          </Notice>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="grid gap-5 sm:grid-cols-2">
          {productsError ? (
            <p className="rounded-2xl bg-white p-6 text-center font-semibold text-red-dark shadow-soft sm:col-span-2">
              Couldn’t load the menu. Please refresh the page.
            </p>
          ) : productsLoading ? (
            <p className="text-ink-soft sm:col-span-2">Loading the menu…</p>
          ) : (
            products.map(toProduct).map((p) => (
              <div
                key={p.id}
                className={cx(p.partner && 'sm:col-span-2 sm:mx-auto sm:w-[calc(50%-10px)]')}
              >
                <ProductCard p={p} />
              </div>
            ))
          )}
        </div>
        <div className="hidden lg:block">
          <div className="sticky top-24">
            <CartPanel cta />
            {count > 0 && !closed && (
              <p className="mt-3 text-center text-xs text-ink/70">Delivery fee is added at checkout.</p>
            )}
          </div>
        </div>
      </div>
      <div className="mt-8 lg:hidden"><CartPanel /></div>
    </main>
  )
}