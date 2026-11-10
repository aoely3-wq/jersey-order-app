import { Order, OrderStatus } from './types';

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

        return {
          ...raw,
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
    const division = order.division?.trim() || 'Bagian Umum';
    let sheetNotes = order.notes?.trim() || '';
    if (!sheetNotes.includes('[DIV:')) {
      sheetNotes = `[DIV:${division}]${sheetNotes ? ` ${sheetNotes}` : ''}`;
    }

    const orderPayload = {
      ...order,
      division,
      notes: sheetNotes,
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
    const syncedOrders = orders.map((o) => {
      const division = o.division?.trim() || 'Bagian Umum';
      let sheetNotes = o.notes?.trim() || '';
      if (!sheetNotes.includes('[DIV:')) {
        sheetNotes = `[DIV:${division}]${sheetNotes ? ` ${sheetNotes}` : ''}`;
      }
      return {
        ...o,
        division,
        notes: sheetNotes,
      };
    });

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

