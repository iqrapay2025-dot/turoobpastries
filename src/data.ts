import t1 from './assets/team-t1.jpg'
import t2 from './assets/team-t2.jpg'
import t3 from './assets/team-t3.jpg'
import jumah from './assets/jumah muhammed.jpg'
import abdulazeez from './assets/abdulazeez adegbite.jpg'
export const IMG = {
  hero: 'https://images.unsplash.com/photo-1767324672458-7dec3a2acffa?w=1000&q=80&fit=crop',
  pepper: 'https://images.unsplash.com/photo-1665833613236-7c1d087463b1?w=800&q=80&fit=crop',
  plain: 'https://images.unsplash.com/photo-1667506999146-805370d013f4?w=800&q=80&fit=crop',
  zobo: 'https://images.unsplash.com/photo-1506802913710-40e2e66339c9?w=800&q=80&fit=crop',
  bowl: 'https://images.unsplash.com/photo-1664993085274-80c6ba725ccc?w=800&q=80&fit=crop',
  saturday: 'https://images.unsplash.com/photo-1525359013742-5791b1548d90?w=800&q=80&fit=crop',
}

export type Product = {
  id: 'pepper' | 'plain' | 'zobo'
  name: string
  desc: string
  price: number | null
  unit: string
  img: string
  tag?: string
  partner?: string
}

export const PRODUCTS: Product[] = [
  { id: 'pepper', name: 'Puff-Puff (With Pepper)', desc: 'Spicy, golden and a student favourite. A little heat in every bite.', price: 100, unit: 'piece', img: IMG.pepper, tag: 'Student favourite' },
  { id: 'plain', name: 'Puff-Puff (Without Pepper)', desc: 'Soft, sweet and pillowy. Dusted fresh and fried hot.', price: 100, unit: 'piece', img: IMG.plain, tag: 'Soft and sweet' },
  { id: 'zobo', name: 'Zobo', desc: 'Chilled hibiscus drink, the perfect partner for hot puff-puff.', price: 500, unit: 'bottle', img: IMG.zobo, partner: 'Bliss Blend' },
]

// Priced cart lines. Zobo comes in two placeholder sizes.
export const LINES = [
  { id: 'pepper', name: 'Puff-Puff (With Pepper)', price: 100 },
  { id: 'plain', name: 'Puff-Puff (Without Pepper)', price: 100 },
  { id: 'zobo_s', name: 'Zobo, Small (Bliss Blend)', price: 500 },
  { id: 'zobo_l', name: 'Zobo, Large (Bliss Blend)', price: 500 },
]
export const ZOBO_SIZES = [
  { id: 'zobo_s', label: 'Small', price: 500 },
  { id: 'zobo_l', label: 'Large', price: 500 },
]

export const SLOTS = ['2:45pm', '3:15pm', '3:45pm', '4:15pm', '4:45pm']
export const NAV = [
  { label: 'Order', href: '#/order' },
  { label: 'Meet the Team', href: '#team' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'FAQ', href: '#faq' },
]
export type BatchId = 'fri' | 'sat' | 'sun'
export const BATCHES: { id: BatchId; day: string; dow: number; when: string; cut: string }[] = [
  { id: 'fri', day: 'Friday', dow: 5, when: 'After Jumah, from about 2:30pm', cut: 'Thursday night or before 7am Friday' },
  { id: 'sat', day: 'Saturday', dow: 6, when: 'Weekend batch', cut: 'Friday night or before 7am Saturday' },
  { id: 'sun', day: 'Sunday', dow: 0, when: 'Weekend batch', cut: 'Saturday night or before 7am Sunday' },
]
export const naira = (n: number) => '₦' + n.toLocaleString('en-NG')

export const TEAM = [
  { name: 'AbdulAzeez Adegbite Ayomide', role: 'Founder and Head Fryer', img: abdulazeez },
  { name: 'Ademola Khalif', role: 'Team member', img: 'https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&q=80&fit=crop' },
  { name: 'Muhammadulawwal Abdulsamod', role: 'Team member', img: 'https://images.unsplash.com/photo-1614023342667-6f060e9d1e04?w=600&q=80&fit=crop' },
  { name: 'Jumah Muhammed O.', role: 'Team member', img: jumah },
  { name: 'Yisau Shukroh', role: 'Team member', img: t1 },
  { name: 'Fatimah Salahudeen', role: 'Team member', img: t2 },
  { name: 'Masruroh Fasasi', role: 'Team member', img: t3 },
  { name: 'Opatola Abass', role: 'Team member', img: 'https://images.unsplash.com/photo-1546525848-3ce03ca516f6?w=600&q=80&fit=crop' },
]

export const REVIEWS = [
  { name: 'Fatima A.', where: '300L, Law', rating: 5, text: 'The pepper one is dangerous. I ordered 20 for my hostel and we finished them before Asr.' },
  { name: 'Tunde O.', where: '200L, Engineering', rating: 5, text: 'Still hot when I picked up after Jumah. Pre-ordering saved me from the queue.' },
  { name: 'Maryam S.', where: 'Staff, Faculty of Arts', rating: 4, text: 'Soft, sweet and not oily. Delivery to my office was on time.' },
  { name: 'Ibrahim K.', where: '400L, Sciences', rating: 5, text: 'Cleanest ordering experience on campus. Paid with OPay in seconds.' },
  { name: 'Hauwa B.', where: '100L, Pharmacy', rating: 5, text: 'Best puff-puff in Ilorin, honestly. Love that I can order for Saturday too!' },
]

export const FAQ = [
  ['When do you sell?', 'We fry on Friday (after Jumah prayer, around 2:30pm), Saturday and Sunday. Pick the day you want when you order.'],
  ['How do I pre-order?', 'Choose your puff-puff, pick pickup or delivery, and pay securely online.'],
  ['What is the order cutoff?', 'Order for Friday by Thursday night or before 7am Friday. For Saturday, order by Friday night or before 7am Saturday. For Sunday, order by Saturday night or before 7am Sunday.'],
  ['Where do I pick up?', 'Central Mosque, University of Ilorin.'],
  ['Do you deliver?', "Yes. On-campus delivery is ₦100 and off-campus is ₦200. The final fee may depend on your location and we'll confirm it before payment."],
  ['How can I pay?', 'Through Paystack: card, bank transfer, USSD or OPay.'],
  ["What's the difference between the two puff-puff types?", 'One is made with pepper, the other without.'],
  ['What is Zobo?', 'A refreshing hibiscus drink from our partner Bliss Blend, offered some weeks.'],
  ['How do I contact you?', 'Tap the WhatsApp button or email us.'],
]
