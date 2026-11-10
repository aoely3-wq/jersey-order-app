// @ts-expect-error midtrans-client does not have official typescript declarations
import midtransClient from 'midtrans-client';
import { Order } from './types';

export function isMidtransConfigured(): boolean {
  return Boolean(process.env.MIDTRANS_SERVER_KEY && process.env.MIDTRANS_SERVER_KEY.trim() !== '');
}

export function getSnapClient() {
  const isProduction = process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const serverKey = process.env.MIDTRANS_SERVER_KEY || '';
  const clientKey = process.env.MIDTRANS_CLIENT_KEY || '';

  return new midtransClient.Snap({
    isProduction,
    serverKey,
    clientKey,
  });
}

export async function createSnapTransaction(order: Order): Promise<{ token: string; redirect_url: string }> {
  const snap = getSnapClient();

  const parameter = {
    transaction_details: {
      order_id: order.id,
      gross_amount: order.totalPrice,
    },
    customer_details: {
      first_name: order.name,
      phone: order.phone,
    },
    item_details: [
      {
        id: `JERSEY-${order.size}-${order.sleeve}`,
        price: order.totalPrice,
        quantity: 1,
        name: `Jersey ${order.size} (Lengan ${order.sleeve})`,
      },
    ],
    // Fokuskan metode pembayaran langsung ke QRIS / GoPay QRIS
    enabled_payments: ['gopay', 'qris', 'shopeepay'],
  };

  const transaction = await snap.createTransaction(parameter);
  return {
    token: transaction.token,
    redirect_url: transaction.redirect_url,
  };
}
