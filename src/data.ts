import t1 from './assets/team-t1.jpg'
import t2 from './assets/team-t2.jpg'
import t3 from './assets/team-t3.jpg'
import jumah from './assets/jumah muhammed.jpg'
import abdulazeez from './assets/abdulazeez adegbite.jpg'
import ademola from './assets/Ademola Khalif.jpg'
import muhammadulawwal from './assets/Muhammadulawwal Abdulsamod.jpg'
import opatola from './assets/Opatola Abbas.jpg'
import pepperedImg from './assets/peppered puffpuff.jpg'
import zoboImg from './assets/bliss blend zobo 1.jpg'
import tigernutImg from './assets/bliss blend tigernut 1.jpg'
export const IMG = {
  hero: 'https://images.unsplash.com/photo-1767324672458-7dec3a2acffa?w=1000&q=80&fit=crop',
    pepper: pepperedImg,
  plain: 'https://images.unsplash.com/photo-1667506999146-805370d013f4?w=800&q=80&fit=crop',
  zobo: zoboImg,
  tigernut: tigernutImg,
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
  { name: 'Ademola Khalif', role: 'Opeartions Maanager', img: ademola },
  { name: 'Muhammadulawwal Abdulsamod', role: 'Inventory & Production Coordinator', img: muhammadulawwal },
  { name: 'Jumah Muhammed O.', role: 'Digital Communications & Tech Lead', img: jumah },
    { name: 'Opatola Abass', role: 'Customer Relations & Logistics Officer', img: opatola },
  { name: 'Yisau Shukroh', role: 'Packaging & Distribution Associate', img: t1 },
  { name: 'Fatimah Salahudeen', role: 'Production & Packaging Associate', img: t2 },
  { name: 'Masruroh Fasasi', role: 'Packaging & Presentation Associate', img: t3 },
]

export const REVIEWS = [
  { name: 'Ajibola James', where: '500L, Biomedical Engineering', rating: 3, text: 'It feels homemade.' },
  { name: 'Anonymous', where: '500L', rating: 4, text: "I love the spicy puff puff, it's 10/10." },
  { name: 'Anonymous', where: '500L', rating: 5, text: 'Unique taste and succulence.' },
  { name: 'Abubakar Ahmad Abdumumeen', where: '500L, Computer Engineering', rating: 5, text: 'It has the right amount of fluffiness and sweetness.' },
  { name: 'Anonymous', where: '500L', rating: 4, text: "The puff puff is nice and filling, and it wasn't too sugary." },
  { name: 'Adedeji Abdulhammed Adewale', where: '500L, Biomedical Engineering', rating: 5, text: 'Your product is good, honestly.' },
  { name: 'Anonymous', where: '500L', rating: 5, text: 'It had the right amount of sweetener. It was just perfect.' },
  { name: 'Busari Iqbal', where: '500L, Civil Engineering', rating: 5, text: 'The taste.' },
  { name: 'Anonymous', where: '400L', rating: 5, text: 'The hotness of it.' },
  { name: 'Anonymous', where: '500L', rating: 5, text: 'The flavour is rich. It tastes good.' },
]

export const FAQ = [
  ['When do you sell?', 'We fry on Friday (after Jumah prayer, around 2:30pm), Saturday and Sunday. Pick the day you want when you order.'],
  ['How do I pre-order?', 'Choose your puff-puff, pick pickup or delivery, and pay securely online.'],
  ['What is the order cutoff?', 'Order for Friday by Thursday night or before 7am Friday. For Saturday, order by Friday night or before 7am Saturday. For Sunday, order by Saturday night or before 7am Sunday.'],
  ['Where do I pick up?', 'Central Mosque, University of Ilorin.'],
    ['Do you deliver?', "Yes. On-campus delivery is ₦100 and off-campus is ₦200. The final fee may depend on your location and we'll confirm it before payment."],
  ['Where can I order from?', 'You can order from the University of Ilorin on-campus (PS), off-campus, and the College of Health Sciences.'],
  ['How can I pay?', 'Through Paystack: card, bank transfer, USSD or OPay.'],
  ["What's the difference between the two puff-puff types?", 'One is made with pepper, the other without.'],
  ['What is Zobo?', 'A refreshing hibiscus drink from our partner Bliss Blend, offered some weeks.'],
  ['How do I contact you?', 'Tap the WhatsApp button or email us.'],
]
