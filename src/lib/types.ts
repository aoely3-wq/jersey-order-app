export type GenderCut = 'men' | 'ladies';

export type JerseySize = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | 'XS' | '4XL';

export type SleeveType = 'pendek' | 'panjang';

export type OrderStatus = 'PENDING' | 'PAID' | 'CANCELLED';

export const DIVISIONS = [
  'Kepala Kanwil',
  'Bagian Umum',
  'Bidang PPA 1',
  'Bidang PPA 2',
  'Bidang SKKI',
  'Bidang PAPK',
] as const;

export type Division = (typeof DIVISIONS)[number] | string;

export interface Order {
  id: string;
  name: string;
  division: string;
  genderCut: GenderCut;
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

export interface SizeMeasurement {
  size: JerseySize;
  width: number;
  height: number;
  extraFee: number;
}

export const SIZE_CHART_DATA: Record<GenderCut, SizeMeasurement[]> = {
  men: [
    { size: 'S', width: 50, height: 69, extraFee: 0 },
    { size: 'M', width: 52, height: 71, extraFee: 0 },
    { size: 'L', width: 54, height: 73, extraFee: 0 },
    { size: 'XL', width: 56, height: 75, extraFee: 0 },
    { size: 'XXL', width: 59, height: 77, extraFee: 0 },
    { size: 'XXXL', width: 61, height: 79, extraFee: 5000 },
  ],
  ladies: [
    { size: 'S', width: 46, height: 60, extraFee: 0 },
    { size: 'M', width: 49, height: 62, extraFee: 0 },
    { size: 'L', width: 52, height: 64, extraFee: 0 },
    { size: 'XL', width: 55, height: 66, extraFee: 0 },
    { size: 'XXL', width: 58, height: 68, extraFee: 0 },
    { size: 'XXXL', width: 61, height: 70, extraFee: 5000 },
  ],
};

export const SIZES: { label: string; value: JerseySize; description?: string }[] = [
  { label: 'S (Small)', value: 'S' },
  { label: 'M (Medium)', value: 'M' },
  { label: 'L (Large)', value: 'L' },
  { label: 'XL (Extra Large)', value: 'XL' },
  { label: 'XXL (2XL)', value: 'XXL' },
  { label: 'XXXL (3XL) (+ Rp 5.000)', value: 'XXXL', description: '+ Rp 5.000' },
];

export function calculatePrice(sleeve: SleeveType, size: JerseySize): PriceBreakdown {
  const basePrice = 130000;
  const sleeveExtra = sleeve === 'panjang' ? 10000 : 0;
  const sizeExtra = size === 'XXXL' || (size as string) === '3XL' ? 5000 : 0;
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
