import fs from 'fs';
import path from 'path';
import { Order, OrderStatus, calculatePrice, JerseySize, SleeveType, GenderCut } from './types';
import {
  isGoogleSheetConfigured,
  fetchOrdersFromSheet,
  saveOrderToSheet,
  updateOrderStatusInSheet,
  deleteOrderFromSheet,
} from './googleSheets';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const initialOrders: Order[] = [
        {
          id: 'ORD-1001',
          name: 'Budi Santoso',
          division: 'Bagian Umum',
          genderCut: 'men',
          phone: '081234567890',
          size: 'L',
          sleeve: 'pendek',
          basePrice: 130000,
          sleeveExtra: 0,
          sizeExtra: 0,
          totalPrice: 130000,
          status: 'PAID',
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          paidAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        },
        {
          id: 'ORD-1002',
          name: 'Siti Rahma',
          division: 'Bidang PPA 1',
          genderCut: 'ladies',
          phone: '085711223344',
          size: 'M',
          sleeve: 'panjang',
          basePrice: 130000,
          sleeveExtra: 10000,
          sizeExtra: 0,
          totalPrice: 140000,
          status: 'PAID',
          createdAt: new Date(Date.now() - 3600000 * 3).toISOString(),
          paidAt: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: 'ORD-1003',
          name: 'Agus Pratama',
          division: 'Bidang SKKI',
          genderCut: 'men',
          phone: '081987654321',
          size: 'XXL',
          sleeve: 'panjang',
          basePrice: 130000,
          sleeveExtra: 10000,
          sizeExtra: 0,
          totalPrice: 140000,
          status: 'PENDING',
          createdAt: new Date(Date.now() - 1800000).toISOString(),
        },
      ];
      fs.writeFileSync(DATA_FILE, JSON.stringify(initialOrders, null, 2), 'utf8');
    }
  } catch (err) {
    // Di serverless environment seperti Vercel, filesystem bersifat read-only.
  }
}

/**
 * Mengambil semua pesanan.
 * Jika Google Sheet dikonfigurasi, membaca data langsung dari Google Sheet.
 * Jika tidak, membaca dari file data/orders.json lokal.
 */
export async function getAllOrders(): Promise<Order[]> {
  if (isGoogleSheetConfigured()) {
    const sheetOrders = await fetchOrdersFromSheet();
    if (sheetOrders !== null) {
      return sheetOrders;
    }
    console.warn('[Orders] Gagal membaca dari Google Sheet, beralih ke cache lokal');
  }

  ensureDataFile();
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = await fs.promises.readFile(DATA_FILE, 'utf8');
      const orders: Order[] = JSON.parse(raw);
      return orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return [];
  } catch (err) {
    console.error('Error reading orders file:', err);
    return [];
  }
}

export async function getOrderById(id: string): Promise<Order | null> {
  const orders = await getAllOrders();
  return orders.find((o) => o.id === id) || null;
}

export interface CreateOrderParams {
  name: string;
  division: string;
  genderCut: GenderCut;
  phone: string;
  size: JerseySize;
  sleeve: SleeveType;
  notes?: string;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const pricing = calculatePrice(params.sleeve, params.size);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newId = `ORD-${Date.now().toString().slice(-4)}${randomSuffix.toString().slice(-2)}`;

  const newOrder: Order = {
    id: newId,
    name: params.name.trim(),
    division: params.division?.trim() || 'Bagian Umum',
    genderCut: params.genderCut || 'men',
    phone: params.phone.trim(),
    size: params.size,
    sleeve: params.sleeve,
    basePrice: pricing.basePrice,
    sleeveExtra: pricing.sleeveExtra,
    sizeExtra: pricing.sizeExtra,
    totalPrice: pricing.totalPrice,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    notes: params.notes?.trim() || undefined,
  };

  // 1. Simpan ke Google Sheet jika aktif
  if (isGoogleSheetConfigured()) {
    await saveOrderToSheet(newOrder);
  }

  // 2. Simpan juga ke cache lokal jika filesystem writable
  try {
    ensureDataFile();
    const localOrders = await getLocalOrdersDirect();
    localOrders.unshift(newOrder);
    await saveOrdersLocally(localOrders);
  } catch {
    // Abaikan jika read-only
  }

  return newOrder;
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order | null> {
  const paidAt = status === 'PAID' ? new Date().toISOString() : undefined;

  // 1. Update ke Google Sheet jika aktif
  if (isGoogleSheetConfigured()) {
    await updateOrderStatusInSheet(id, status, paidAt);
  }

  // 2. Update di cache lokal jika memungkinkan
  let updatedOrder: Order | null = null;
  try {
    ensureDataFile();
    const orders = await getLocalOrdersDirect();
    const index = orders.findIndex((o) => o.id === id);
    if (index !== -1) {
      orders[index].status = status;
      orders[index].paidAt = paidAt;
      await saveOrdersLocally(orders);
      updatedOrder = orders[index];
    }
  } catch {
    // Abaikan
  }

  if (!updatedOrder) {
    const all = await getAllOrders();
    updatedOrder = all.find((o) => o.id === id) || null;
  }

  return updatedOrder;
}

export async function deleteOrder(id: string): Promise<boolean> {
  let success = false;

  // 1. Hapus dari Google Sheet jika aktif
  if (isGoogleSheetConfigured()) {
    success = await deleteOrderFromSheet(id);
  }

  // 2. Hapus dari cache lokal jika memungkinkan
  try {
    ensureDataFile();
    const orders = await getLocalOrdersDirect();
    const filtered = orders.filter((o) => o.id !== id);
    if (filtered.length !== orders.length) {
      await saveOrdersLocally(filtered);
      success = true;
    }
  } catch {
    // Abaikan
  }

  return success;
}

async function getLocalOrdersDirect(): Promise<Order[]> {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = await fs.promises.readFile(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch {}
  return [];
}

async function saveOrdersLocally(orders: Order[]): Promise<void> {
  try {
    const tmpFile = `${DATA_FILE}.tmp`;
    await fs.promises.writeFile(tmpFile, JSON.stringify(orders, null, 2), 'utf8');
    await fs.promises.rename(tmpFile, DATA_FILE);
  } catch (err) {
    // Vercel serverless read-only filesystem
    console.warn('[Orders] Local file write ignored:', err);
  }
}
