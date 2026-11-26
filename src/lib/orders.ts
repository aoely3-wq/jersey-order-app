import fs from 'fs';
import path from 'path';
import {
  Order,
  OrderStatus,
  calculatePrice,
  JerseySize,
  SleeveType,
  GenderCut,
  JerseyColor,
  CartItem,
} from './types';
import {
  isGoogleSheetConfigured,
  fetchOrdersFromSheet,
  saveOrderToSheet,
  updateOrderStatusInSheet,
  deleteOrderFromSheet,
  batchSyncToSheet,
} from './googleSheets';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');

function ensureDataFile() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, '[]', 'utf8');
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
  phone: string;
  items?: CartItem[];
  genderCut?: GenderCut;
  size?: JerseySize;
  sleeve?: SleeveType;
  color?: JerseyColor;
  notes?: string;
}

export async function createOrder(params: CreateOrderParams): Promise<Order> {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const newId = `ORD-${Date.now().toString().slice(-4)}${randomSuffix.toString().slice(-2)}`;

  let newOrder: Order;

  if (params.items && Array.isArray(params.items) && params.items.length > 0) {
    const items = params.items;
    const totalQty = items.reduce((sum, it) => sum + (it.quantity || 1), 0);
    const totalPrice = items.reduce((sum, it) => sum + it.subtotal, 0);
    const firstItem = items[0];
    const isMulti = items.length > 1 || (items[0].quantity && items[0].quantity > 1);

    const sizeSummary = isMulti
      ? (items.map((it) => `${it.size} (${it.quantity}x)`).join(', ') as any)
      : firstItem.size;

    const sleeveSummary = isMulti
      ? (items
          .map(
            (it) =>
              `${it.color === 'maroon' ? 'Maroon' : 'Putih'} ${it.genderCut === 'ladies' ? 'Ladies' : 'Men'} (${it.sleeve === 'panjang' ? 'Pjg' : 'Pdk'})`
          )
          .join(', ') as any)
      : firstItem.sleeve;

    newOrder = {
      id: newId,
      name: params.name.trim(),
      division: params.division?.trim() || 'Bagian Umum',
      genderCut: firstItem.genderCut,
      phone: params.phone.trim(),
      size: sizeSummary,
      sleeve: sleeveSummary,
      color: firstItem.color,
      items,
      totalQty,
      basePrice: firstItem.basePrice,
      sleeveExtra: firstItem.sleeveExtra,
      sizeExtra: firstItem.sizeExtra,
      totalPrice,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      notes: params.notes?.trim() || undefined,
    };
  } else {
    const sleeve = params.sleeve || 'pendek';
    const size = params.size || 'L';
    const pricing = calculatePrice(sleeve, size);
    const singleItem: CartItem = {
      id: 'item-1',
      color: params.color || 'putih',
      genderCut: params.genderCut || 'men',
      size,
      sleeve,
      quantity: 1,
      basePrice: pricing.basePrice,
      sleeveExtra: pricing.sleeveExtra,
      sizeExtra: pricing.sizeExtra,
      unitPrice: pricing.totalPrice,
      subtotal: pricing.totalPrice,
    };

    newOrder = {
      id: newId,
      name: params.name.trim(),
      division: params.division?.trim() || 'Bagian Umum',
      genderCut: params.genderCut || 'men',
      phone: params.phone.trim(),
      size,
      sleeve,
      color: params.color || 'putih',
      items: [singleItem],
      totalQty: 1,
      basePrice: pricing.basePrice,
      sleeveExtra: pricing.sleeveExtra,
      sizeExtra: pricing.sizeExtra,
      totalPrice: pricing.totalPrice,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      notes: params.notes?.trim() || undefined,
    };
  }

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

// Penjaga in-memory untuk proses klaim PAID di dalam container yang sama
const markingPaidInFlight = new Set<string>();
const alreadyMarkedPaid = new Set<string>();

/**
 * Menandai pesanan sebagai PAID dengan mekanisme Distributed Atomic Claim (Compare-And-Swap)
 * melalui kolom `paidAt` di Google Sheets.
 *
 * Jika 2 atau lebih serverless instance di Vercel mendeteksi pembayaran LUNAS pada detik yang sama,
 * masing-masing menulis token waktu ISO unik (`claimPaidAt`) ke Google Sheets, lalu membaca ulang
 * setelah jeda singkat. Hanya SATU instance yang nilai `paidAt`-nya bertahan di Google Sheets
 * yang akan mendapatkan `newlyPaid: true` dan berhak mengirim pesan WhatsApp.
 */
export async function markOrderPaidOnce(
  id: string
): Promise<{ order: Order | null; newlyPaid: boolean }> {
  if (alreadyMarkedPaid.has(id) || markingPaidInFlight.has(id)) {
    const existing = await getOrderById(id);
    return { order: existing, newlyPaid: false };
  }

  markingPaidInFlight.add(id);
  try {
    // Buat timestamp ISO-8601 unik dengan jitter milidetik (001-999) agar tidak pernah kembar antar instance
    const now = new Date();
    const randomMs = Math.floor(Math.random() * 999) + 1;
    const uniqueMs = String((now.getMilliseconds() + randomMs) % 1000 || 1).padStart(3, '0');
    const claimPaidAt = now.toISOString().replace(/\.\d{3}Z$/, `.${uniqueMs}Z`);

    if (isGoogleSheetConfigured()) {
      await updateOrderStatusInSheet(id, 'PAID', claimPaidAt);

      // Tunggu 1.2 detik agar jika ada request paralel dari instance lain yang lolos di saat bersamaan,
      // penulisan ke Google Sheet selesai dan hanya menyisakan satu pemenang terakhir.
      await new Promise((resolve) => setTimeout(resolve, 1200));

      const all = await getAllOrders();
      const sheetOrder = all.find((o) => o.id === id) || null;

      alreadyMarkedPaid.add(id);

      if (sheetOrder && sheetOrder.paidAt && sheetOrder.paidAt !== claimPaidAt) {
        console.log(
          `[Orders Distributed Lock]: Order ${id} sudah diklaim oleh instance lain (sheet=${sheetOrder.paidAt} vs claim=${claimPaidAt}). Skip pengiriman WA ganda.`
        );
        return { order: sheetOrder, newlyPaid: false };
      }

      return { order: sheetOrder, newlyPaid: true };
    }

    // Fallback lokal bila Google Sheet tidak dikonfigurasi
    const updated = await updateOrderStatus(id, 'PAID');
    alreadyMarkedPaid.add(id);
    return { order: updated, newlyPaid: true };
  } finally {
    markingPaidInFlight.delete(id);
  }
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

export async function clearAllOrders(): Promise<boolean> {
  // 1. Bersihkan Google Sheet jika aktif
  if (isGoogleSheetConfigured()) {
    await batchSyncToSheet([]);
  }

  // 2. Bersihkan file lokal
  try {
    ensureDataFile();
    await saveOrdersLocally([]);
  } catch (err) {
    console.warn('Local clear ignored:', err);
  }

  return true;
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
