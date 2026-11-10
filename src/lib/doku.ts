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
      line_items: [
        {
          id: `JERSEY-${order.size}-${order.sleeve}`,
          name: `Jersey Cual DJPb Babel (${order.size} - Lengan ${order.sleeve === 'panjang' ? 'Panjang' : 'Pendek'})`,
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
