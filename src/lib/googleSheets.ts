import { Order, OrderStatus, CartItem, calculatePrice } from './types';

/**
 * Sheet tidak punya kolom warna/potongan/item, jadi dikodekan di kolom catatan
 * sebagai tag [ITM:warna-potongan-ukuran-lengan-jumlah,...] (pola sama dengan [DIV:...]).
 */
function encodeItemsTag(order: Order): string {
  const items = order.items?.length
    ? order.items
    : [{ color: order.color, genderCut: order.genderCut, size: order.size, sleeve: order.sleeve, quantity: 1 }];
  const parts = items
    .filter((it) => it.color && it.genderCut && it.size && it.sleeve)
    .map((it) => `${it.color}-${it.genderCut}-${it.size}-${it.sleeve}-${it.quantity || 1}`);
  return parts.length ? `[ITM:${parts.join(',')}]` : '';
}

function decodeItemsTag(tag: string): CartItem[] {
  return tag.split(',').flatMap((part, i) => {
    const [color, genderCut, size, sleeve, qty] = part.split('-');
    if (!color || !genderCut || !size || !sleeve) return [];
    const pricing = calculatePrice(sleeve as CartItem['sleeve'], size as CartItem['size']);
    const quantity = Math.max(1, parseInt(qty, 10) || 1);
    return [{
      id: `item-${i + 1}`,
      color: color === 'maroon' ? 'maroon' : 'putih',
      genderCut: genderCut === 'ladies' ? 'ladies' : 'men',
      size: size as CartItem['size'],
      sleeve: sleeve === 'panjang' ? 'panjang' : 'pendek',
      quantity,
      basePrice: pricing.basePrice,
      sleeveExtra: pricing.sleeveExtra,
      sizeExtra: pricing.sizeExtra,
      unitPrice: pricing.totalPrice,
      subtotal: pricing.totalPrice * quantity,
    } as CartItem];
  });
}

/**
 * Pesanan multi-item lama (sebelum tag [ITM:...]) menyimpan ringkasan teks:
 *   size   = "XXL (1x), XL (1x)"
 *   sleeve = "Putih Men (Pdk), Putih Ladies (Pjg)"
 * Dipecah kembali per item (urutan sama). Mengembalikan [] bila bukan format ringkasan.
 */
function decodeLegacySummary(size: unknown, sleeve: unknown): CartItem[] {
  if (typeof size !== 'string' || typeof sleeve !== 'string') return [];
  const sizes = size.split(',').map((s) => s.trim().match(/^(\S+)\s*\((\d+)x\)$/));
  const kinds = sleeve.split(',').map((s) => s.trim().match(/^(Maroon|Putih)\s+(Men|Ladies)\s*\((Pdk|Pjg)\)$/));
  if (!sizes.length || sizes.length !== kinds.length || sizes.some((m) => !m) || kinds.some((m) => !m)) return [];

  return sizes.map((sm, i) => {
    const km = kinds[i]!;
    const itemSize = sm![1] as CartItem['size'];
    const itemSleeve: CartItem['sleeve'] = km[3] === 'Pjg' ? 'panjang' : 'pendek';
    const quantity = Math.max(1, parseInt(sm![2], 10) || 1);
    const pricing = calculatePrice(itemSleeve, itemSize);
    return {
      id: `item-${i + 1}`,
      color: km[1] === 'Maroon' ? 'maroon' : 'putih',
      genderCut: km[2] === 'Ladies' ? 'ladies' : 'men',
      size: itemSize,
      sleeve: itemSleeve,
      quantity,
      basePrice: pricing.basePrice,
      sleeveExtra: pricing.sleeveExtra,
      sizeExtra: pricing.sizeExtra,
      unitPrice: pricing.totalPrice,
      subtotal: pricing.totalPrice * quantity,
    };
  });
}

/** Catatan untuk Sheet: tag [DIV:...] dan [ITM:...] di depan catatan asli. */
function buildSheetNotes(order: Order): string {
  const division = order.division?.trim() || 'Bagian Umum';
  let notes = order.notes?.trim() || '';
  if (!notes.includes('[ITM:')) {
    const tag = encodeItemsTag(order);
    if (tag) notes = `${tag}${notes ? ` ${notes}` : ''}`;
  }
  if (!notes.includes('[DIV:')) notes = `[DIV:${division}]${notes ? ` ${notes}` : ''}`;
  return notes;
}

/**
 * URL Google Apps Script Web App yang terhubung ke Google Sheet
 * Diset melalui environment variable GOOGLE_SHEET_URL
 */
const getGoogleSheetUrl = () => process.env.GOOGLE_SHEET_URL;

export function isGoogleSheetConfigured(): boolean {
  const url = getGoogleSheetUrl();
  return Boolean(url && url.trim().startsWith('https://script.google.com'));
}

/**
 * Mengambil semua pesanan dari Google Sheet
 */
export async function fetchOrdersFromSheet(): Promise<Order[] | null> {
  const url = getGoogleSheetUrl();
  if (!url) return null;

  try {
    const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}action=getAll`;
    const res = await fetch(fetchUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
      redirect: 'follow',
    });

    if (!res.ok) {
      console.warn('[GoogleSheet] Fetch failed status:', res.status);
      return null;
    }

    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      const orders = (json.data as any[]).map((raw) => {
        let division = raw.division || '';
        let notes = raw.notes || undefined;

        // Ekstrak tag [DIV:...] jika Google Sheet menyimpan division di dalam catatan
        if (notes && typeof notes === 'string') {
          const match = notes.match(/\[DIV:(.+?)\]/);
          if (match) {
            division = match[1].trim();
            notes = notes.replace(/\[DIV:(.+?)\]\s*/, '').trim() || undefined;
          }
        }

        // Pulihkan warna/potongan/item dari tag [ITM:...]
        let items: CartItem[] = [];
        if (notes && typeof notes === 'string') {
          const m = notes.match(/\[ITM:(.+?)\]/);
          if (m) {
            notes = notes.replace(/\[ITM:(.+?)\]\s*/, '').trim() || undefined;
            items = decodeItemsTag(m[1]);
          }
        }
        // Pesanan multi-item lama: pecah dari ringkasan teks size/sleeve
        if (!items.length) items = decodeLegacySummary(raw.size, raw.sleeve);
        const itemFields: Partial<Order> = items.length
          ? {
              items,
              color: items[0].color,
              genderCut: items[0].genderCut,
              totalQty: items.reduce((s, it) => s + it.quantity, 0),
            }
          : {};

        return {
          ...raw,
          ...itemFields,
          division: division || 'Bagian Umum',
          notes,
        } as Order;
      });

      return orders;
    }
    return null;
  } catch (error) {
    console.error('[GoogleSheet] Gagal mengambil data dari Google Sheet:', error);
    return null;
  }
}

/**
 * Menambahkan pesanan baru ke baris Google Sheet
 */
export async function saveOrderToSheet(order: Order): Promise<boolean> {
  const url = getGoogleSheetUrl();
  if (!url) return false;

  try {
    const orderPayload = {
      ...order,
      division: order.division?.trim() || 'Bagian Umum',
      notes: buildSheetNotes(order),
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'create', order: orderPayload }),
      redirect: 'follow',
    });

    const json = await res.json();
    return json.success === true;
  } catch (error) {
    console.error('[GoogleSheet] Gagal menyimpan pesanan ke Google Sheet:', error);
    return false;
  }
}

/**
 * Memperbarui status pembayaran pesanan di Google Sheet
 */
export async function updateOrderStatusInSheet(
  id: string,
  status: OrderStatus,
  paidAt?: string
): Promise<boolean> {
  const url = getGoogleSheetUrl();
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'updateStatus', id, status, paidAt }),
      redirect: 'follow',
    });

    const json = await res.json();
    return json.success === true;
  } catch (error) {
    console.error('[GoogleSheet] Gagal update status di Google Sheet:', error);
    return false;
  }
}

/**
 * Menghapus baris pesanan dari Google Sheet
 */
export async function deleteOrderFromSheet(id: string): Promise<boolean> {
  const url = getGoogleSheetUrl();
  if (!url) return false;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'delete', id }),
      redirect: 'follow',
    });

    const json = await res.json();
    return json.success === true;
  } catch (error) {
    console.error('[GoogleSheet] Gagal menghapus baris di Google Sheet:', error);
    return false;
  }
}

/**
 * Melakukan sinkronisasi massal seluruh data lokal ke Google Sheet
 */
export async function batchSyncToSheet(orders: Order[]): Promise<{ success: boolean; count?: number }> {
  const url = getGoogleSheetUrl();
  if (!url) return { success: false };

  try {
    const syncedOrders = orders.map((o) => ({
      ...o,
      division: o.division?.trim() || 'Bagian Umum',
      notes: buildSheetNotes(o),
    }));

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'batchSync', orders: syncedOrders }),
      redirect: 'follow',
    });

    const json = await res.json();
    return { success: json.success === true, count: json.count };
  } catch (error) {
    console.error('[GoogleSheet] Gagal batch sync ke Google Sheet:', error);
    return { success: false };
  }
}

