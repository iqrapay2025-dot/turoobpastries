import type { ReactNode } from 'react'

const wrap = { maxWidth: 720, margin: '0 auto', padding: '40px 20px 64px', color: '#2B2B2B', lineHeight: 1.65 } as const
const h2 = { fontSize: 18, margin: '28px 0 8px' } as const

function Page({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <div style={wrap}>
      <a href="#/" style={{ color: '#D62828', textDecoration: 'none', fontWeight: 600 }}>← Back to home</a>
      <h1 style={{ fontSize: 28, margin: '16px 0 4px' }}>{title}</h1>
      <p style={{ opacity: 0.7, margin: '0 0 8px' }}>Last updated: {updated}</p>
      {children}
    </div>
  )
}

const UPDATED = '[DATE]'
const EMAIL = '[CONTACT EMAIL]'

export function Privacy() {
  return (
    <Page title="Privacy Policy" updated={UPDATED}>
      <p>Turoob Pastries ("we", "us") takes orders through this website. This page explains what we collect and why.</p>

      <h2 style={h2}>Information we collect</h2>
      <ul>
        <li>Your name and phone number</li>
        <li>Your delivery address or pickup details</li>
        <li>Your email address, if you give one</li>
        <li>Your order details, order code and order status</li>
        <li>Payment confirmation details from our payment provider. We do not store your card number.</li>
      </ul>

      <h2 style={h2}>How we use it</h2>
      <p>We use your information to prepare and deliver your order, contact you about it (including delivery fees), let you track it, and keep records of sales. We do not sell your information.</p>

      <h2 style={h2}>Who we share it with</h2>
      <p>Only with services needed to run the shop: our database and hosting providers, our payment provider, and delivery partners where applicable. We may also share information if the law requires it.</p>

      <h2 style={h2}>How long we keep it</h2>
      <p>We keep order records for as long as needed for our business and legal records, then delete or anonymise them.</p>

      <h2 style={h2}>Your choices</h2>
      <p>You can ask us to see, correct or delete your information by emailing {EMAIL}.</p>

      <h2 style={h2}>Contact</h2>
      <p>Turoob Pastries, [CITY, STATE, NIGERIA] · {EMAIL} · [PHONE/WHATSAPP]</p>
    </Page>
  )
}

export function Terms() {
  return (
    <Page title="Terms of Service" updated={UPDATED}>
      <p>By placing an order on this website you agree to these terms.</p>

      <h2 style={h2}>Orders and batches</h2>
      <p>Our pastries are baked in batches. An order is confirmed once we accept it and, where required, payment is received. Each batch has limited portions, and we may close a batch when it is full.</p>

      <h2 style={h2}>Prices and delivery fees</h2>
      <p>Prices are shown in Naira (₦). Where a delivery fee is set after you order, we will show it to you and you may accept or decline it before we proceed.</p>

      <h2 style={h2}>Payment</h2>
      <p>[Describe how payment works, e.g. bank transfer before baking / payment on delivery.]</p>

      <h2 style={h2}>Cancellations and refunds</h2>
      <p>[Describe your policy, e.g. orders can be cancelled before baking starts. Because items are made fresh to order, we cannot refund after baking begins.]</p>

      <h2 style={h2}>Food and allergens</h2>
      <p>Our pastries may contain wheat, milk, eggs, nuts and other allergens. Please contact us before ordering if you have allergies.</p>

      <h2 style={h2}>Changes</h2>
      <p>We may update these terms. The version on this page applies to orders placed after the update date.</p>

      <h2 style={h2}>Contact</h2>
      <p>{EMAIL} · [PHONE/WHATSAPP]</p>
    </Page>
  )
}