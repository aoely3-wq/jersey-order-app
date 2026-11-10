import crypto from 'crypto';
import { Order } from './types';

export function isDokuConfigured(): boolean {
  return Boolean(
    process.env.DOKU_CLIENT_ID &&
      process.env.DOKU_CLIENT_ID.trim() !== '' &&
      process.env.DOKU_SECRET_KEY &&
      process.env.DOKU_SECRET_KEY.trim() !== ''
  );
}

export function getDokuBaseUrl(): string {
  const isProduction = process.env.DOKU_IS_PRODUCTION === 'true';
  return isProduction ? 'https://api.doku.com' : 'https://api-sandbox.doku.com';
}

export interface DokuCheckoutResponse {
  url: string;
  tokenId?: string;
  expiredDate?: string;
  paymentMethodTypes?: string[];
}

export async function createDokuCheckout(
  order: Order,
  callbackUrl?: string
): Promise<DokuCheckoutResponse> {
  const clientId = process.env.DOKU_CLIENT_ID?.trim() || '';
  const secretKey = process.env.DOKU_SECRET_KEY?.trim() || '';
  const baseUrl = getDokuBaseUrl();
  const targetPath = '/checkout/v1/payment';

  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Payload transaksi DOKU Checkout
  // CATATAN PENTING: Jangan kirim additional_info kustom karena menyebabkan DOKU 500 Internal Server Error
  const requestBody: Record<string, any> = {
    order: {
      amount: order.totalPrice,
      invoice_number: order.id,
      currency: 'IDR',
      callback_url: callbackUrl || undefined,
      auto_redirect: true,
      line_items:
        order.items && order.items.length > 0
          ? order.items.map((it, idx) => ({
              id: it.id || `ITEM-${idx + 1}`,
              name: `Jersey ${it.color === 'maroon' ? 'Maroon' : 'Putih'} (${it.genderCut === 'ladies' ? 'Ladies' : 'Men'} ${it.size} - ${it.sleeve === 'panjang' ? 'Pjg' : 'Pdk'})`,
              price: it.unitPrice,
              quantity: it.quantity || 1,
            }))
          : [
              {
                id: `JERSEY-${order.size || 'STD'}-${order.sleeve || 'pendek'}`,
                name: `Jersey Cual DJPb Babel (${order.size || 'L'} - Lengan ${order.sleeve === 'panjang' ? 'Panjang' : 'Pendek'})`,
                price: order.totalPrice,
                quantity: 1,
              },
            ],
    },
    payment: {
      payment_due_date: 60, // 60 menit batas pembayaran
    },
    customer: {
      name: order.name,
      phone: order.phone,
    },
  };

  const bodyString = JSON.stringify(requestBody);
  const digest = crypto.createHash('sha256').update(bodyString).digest('base64');

  const stringToSign =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${targetPath}\n` +
    `Digest:${digest}`;

  const signature =
    'HMACSHA256=' +
    crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');

  const response = await fetch(`${baseUrl}${targetPath}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Client-Id': clientId,
      'Request-Id': requestId,
      'Request-Timestamp': requestTimestamp,
      Signature: signature,
    },
    body: bodyString,
  });

  const responseText = await response.text();
  let data: any = null;

  try {
    data = JSON.parse(responseText);
  } catch {
    console.error('[DOKU Raw Non-JSON Error]:', responseText);
    throw new Error(`DOKU Server Error (${response.status}): ${responseText.substring(0, 100)}`);
  }

  if (!response.ok) {
    console.error('[DOKU API Error]:', data);
    const errorMessage =
      (Array.isArray(data?.message) ? data.message.join(', ') : data?.message) ||
      data?.error?.message ||
      `DOKU API returned status ${response.status}`;
    throw new Error(errorMessage);
  }

  // DOKU bisa meletakkan payment di data.response.payment atau data.payment
  const paymentObj = data?.response?.payment || data?.payment;
  const paymentUrl = paymentObj?.url;

  if (!paymentUrl) {
    console.error('[DOKU Invalid Response]:', data);
    throw new Error('DOKU payment URL tidak ditemukan dalam respon API');
  }

  return {
    url: paymentUrl,
    tokenId: paymentObj?.token_id,
    expiredDate: paymentObj?.expired_date || paymentObj?.expired_datetime,
    paymentMethodTypes: paymentObj?.payment_method_types,
  };
}

export function verifyDokuSignature(
  clientIdHeader: string,
  requestIdHeader: string,
  timestampHeader: string,
  signatureHeader: string,
  targetPath: string,
  rawBody: string
): boolean {
  try {
    const secretKey = process.env.DOKU_SECRET_KEY?.trim() || '';
    const digest = crypto.createHash('sha256').update(rawBody).digest('base64');

    const stringToSign =
      `Client-Id:${clientIdHeader}\n` +
      `Request-Id:${requestIdHeader}\n` +
      `Request-Timestamp:${timestampHeader}\n` +
      `Request-Target:${targetPath}\n` +
      `Digest:${digest}`;

    const expectedSignature =
      'HMACSHA256=' +
      crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');

    return signatureHeader === expectedSignature;
  } catch (err) {
    console.error('Error verifying DOKU signature:', err);
    return false;
  }
}

export interface DokuOrderStatusResult {
  isPaid: boolean;
  status: string;
  raw?: any;
}

/**
 * Pengecekan aktif status pembayaran langsung ke DOKU API Server.
 * Endpoint: GET /orders/v1/status/{invoice_number}
 * Digunakan untuk auto-konfirmasi real-time tanpa hanya bergantung pada Webhook.
 */
export async function checkDokuOrderStatus(
  invoiceNumber: string
): Promise<DokuOrderStatusResult> {
  if (!isDokuConfigured()) {
    return { isPaid: false, status: 'NOT_CONFIGURED' };
  }

  const clientId = process.env.DOKU_CLIENT_ID?.trim() || '';
  const secretKey = process.env.DOKU_SECRET_KEY?.trim() || '';
  const baseUrl = getDokuBaseUrl();
  const targetPath = `/orders/v1/status/${invoiceNumber}`;

  const requestId = crypto.randomUUID();
  const requestTimestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');

  // Khusus GET request di DOKU: stringToSign tidak menyertakan Digest
  const stringToSign =
    `Client-Id:${clientId}\n` +
    `Request-Id:${requestId}\n` +
    `Request-Timestamp:${requestTimestamp}\n` +
    `Request-Target:${targetPath}`;

  const signature =
    'HMACSHA256=' +
    crypto.createHmac('sha256', secretKey).update(stringToSign).digest('base64');

  try {
    const response = await fetch(`${baseUrl}${targetPath}`, {
      method: 'GET',
      headers: {
        'Client-Id': clientId,
        'Request-Id': requestId,
        'Request-Timestamp': requestTimestamp,
        Signature: signature,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn(`[DOKU Check Status] HTTP ${response.status} for invoice ${invoiceNumber}`);
      return { isPaid: false, status: `HTTP_${response.status}` };
    }

    const data = await response.json();
    const transactionStatus = (data?.transaction?.status || '').toUpperCase();
    const orderStatus = (data?.order?.status || '').toUpperCase();

    // DOKU mengindikasikan sukses di transaction.status === 'SUCCESS' atau 'SETTLED'
    // atau order.status === 'PAID' / 'SUCCESS'
    const isPaid =
      transactionStatus === 'SUCCESS' ||
      transactionStatus === 'SETTLED' ||
      orderStatus === 'PAID' ||
      orderStatus === 'SUCCESS';

    return {
      isPaid,
      status: transactionStatus || orderStatus || 'PENDING',
      raw: data,
    };
  } catch (err) {
    console.error(`[DOKU Check Status] Error fetching status for ${invoiceNumber}:`, err);
    return { isPaid: false, status: 'ERROR' };
  }
}
