export type JerseySize = 'S' | 'M' | 'L' | 'XL' | 'XXL' | '3XL' | '4XL';

export type SleeveType = 'pendek' | 'panjang';

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export interface Order {
  id: string;
  name: string;
  phone: string;
  size: JerseySize;
  sleeve: SleeveType;
  basePrice: number;
  sleeveExtra: number;
  sizeExtra: number;
  totalPrice: number;
  status: OrderStatus;
  createdAt: string;
  paidAt?: string;
  notes?: string;
}

export interface PriceBreakdown {
  basePrice: number;
  sleeveExtra: number;
  sizeExtra: number;
  totalPrice: number;
}

export const SIZES: { label: string; value: JerseySize; description?: string }[] = [
  { label: 'S (Small)', value: 'S' },
  { label: 'M (Medium)', value: 'M' },
  { label: 'L (Large)', value: 'L' },
  { label: 'XL (Extra Large)', value: 'XL' },
  { label: 'XXL (+ Rp 10.000)', value: 'XXL', description: 'Ukuran Jumbo' },
  { label: 'XXXL / 3XL (+ Rp 10.000)', value: '3XL', description: 'Ukuran Jumbo' },
  { label: 'XXXXL / 4XL (+ Rp 10.000)', value: '4XL', description: 'Ukuran Jumbo' },
];

export const JUMBO_SIZES: JerseySize[] = ['XXL', '3XL', '4XL'];

export function calculatePrice(sleeve: SleeveType, size: JerseySize): PriceBreakdown {
  const basePrice = 100000;
  const sleeveExtra = sleeve === 'panjang' ? 20000 : 0;
  const sizeExtra = JUMBO_SIZES.includes(size) ? 10000 : 0;
  const totalPrice = basePrice + sleeveExtra + sizeExtra;

  return {
    basePrice,
    sleeveExtra,
    sizeExtra,
    totalPrice,
  };
}

export function formatRupiah(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
