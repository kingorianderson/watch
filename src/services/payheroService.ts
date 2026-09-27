/**
 * PayHero Kenya (M-Pesa) Payment Service for WATCHD
 * Handles M-Pesa STK push, status checking, phone normalization, and Lipwa links.
 */

export interface PayHeroConfig {
  apiUsername: string;
  apiPassword: string;
  accountId: number | string;
  authToken: string;
  channelId: number | string;
  lipwaLink?: string;
}

export interface StkPushRequest {
  amount: number;
  phone: string;
  customerName?: string;
  reference?: string;
}

export interface StkPushResponse {
  success: boolean;
  status?: string;
  reference?: string;
  checkoutRequestId?: string;
  message?: string;
  error?: string;
}

export interface TransactionStatusResponse {
  success: boolean;
  status: 'SUCCESS' | 'QUEUED' | 'FAILED' | 'PENDING' | 'UNKNOWN';
  merchant?: string;
  providerReference?: string;
  amount?: number;
  message?: string;
}

const DEFAULT_AUTH_TOKEN =
  'Basic YVVTY09PN0hUemk4NmV3a3dYRnA6WjZXQWdQZnk1NkFmckQ1SUhzSE5HTWcyUEkxMDVMNjRJb0JKMUlvdg==';
const DEFAULT_ACCOUNT_ID = '11932';
const DEFAULT_CHANNEL_ID = '11932';

export function getPayHeroConfig(): PayHeroConfig {
  const authToken =
    import.meta.env.VITE_PAYHERO_AUTH_TOKEN ||
    (import.meta.env.VITE_PAYHERO_API_USERNAME && import.meta.env.VITE_PAYHERO_API_PASSWORD
      ? `Basic ${btoa(`${import.meta.env.VITE_PAYHERO_API_USERNAME}:${import.meta.env.VITE_PAYHERO_API_PASSWORD}`)}`
      : DEFAULT_AUTH_TOKEN);

  return {
    apiUsername: import.meta.env.VITE_PAYHERO_API_USERNAME || 'aUScO07HTzi86ewkwXFp',
    apiPassword:
      import.meta.env.VITE_PAYHERO_API_PASSWORD ||
      'Z6WAgPfy56AfrD5IHsHNGMg2PI105L64IoBJ1Iov',
    accountId: import.meta.env.VITE_PAYHERO_ACCOUNT_ID || DEFAULT_ACCOUNT_ID,
    authToken: authToken.startsWith('Basic ') ? authToken : `Basic ${authToken}`,
    channelId: import.meta.env.VITE_PAYHERO_CHANNEL_ID || DEFAULT_CHANNEL_ID,
    lipwaLink: import.meta.env.VITE_PAYHERO_LIPWA_LINK || 'https://lipwa.link/11932',
  };
}

/**
 * Normalizes Kenyan phone numbers to local standard `07XXXXXXXX` or `01XXXXXXXX`
 * and international standard `254XXXXXXXXX`.
 */
export function normalizeKenyanPhone(input: string): { local: string; international: string; isValid: boolean } {
  const clean = input.replace(/\D/g, '');

  let local = '';
  let international = '';

  if (clean.startsWith('254') && clean.length === 12) {
    international = clean;
    local = '0' + clean.slice(3);
  } else if ((clean.startsWith('07') || clean.startsWith('01')) && clean.length === 10) {
    local = clean;
    international = '254' + clean.slice(1);
  } else if ((clean.startsWith('7') || clean.startsWith('1')) && clean.length === 9) {
    local = '0' + clean;
    international = '254' + clean;
  } else if (clean.startsWith('0') && clean.length === 10) {
    local = clean;
    international = '254' + clean.slice(1);
  }

  const isValid = local.length === 10 && (local.startsWith('07') || local.startsWith('01'));

  return { local, international, isValid };
}

/**
 * Initiates an M-Pesa STK Push payment prompt to the supporter's phone via PayHero API
 */
export async function sendPayHeroStkPush({
  amount,
  phone,
  customerName = 'WATCHD Supporter',
  reference,
}: StkPushRequest): Promise<StkPushResponse> {
  const config = getPayHeroConfig();
  const { local, international, isValid } = normalizeKenyanPhone(phone);

  if (!isValid) {
    return {
      success: false,
      message: 'Please enter a valid Kenyan Safaricom / Airtel number (e.g. 0712 345 678)',
    };
  }

  const roundedAmount = Math.max(1, Math.round(amount));
  const trackingRef = reference || `WATCHD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const channelNum = Number(config.channelId) || 11932;

  const payload = {
    amount: roundedAmount,
    phone_number: local || international,
    channel_id: channelNum,
    provider: 'm-pesa',
    external_reference: trackingRef,
    customer_name: customerName,
    callback_url: `${window.location.origin}/api/payhero/callback`,
  };

  try {
    const res = await fetch('https://backend.payhero.co.ke/api/v2/payments', {
      method: 'POST',
      headers: {
        Authorization: config.authToken,
        'Content-Type': 'application/json',
        'X-AUTH-ACCOUNT-ID': String(config.accountId),
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);

    if (res.ok && data) {
      if (data.success !== false && (data.status === 'QUEUED' || data.success === true || data.reference)) {
        return {
          success: true,
          status: data.status || 'QUEUED',
          reference: data.reference || trackingRef,
          checkoutRequestId: data.CheckoutRequestID || data.checkout_request_id,
          message: 'STK prompt sent to your phone. Please enter your M-Pesa PIN.',
        };
      }
    }

    // Handle unsuccessful response
    const errorMessage =
      data?.message ||
      data?.error ||
      `Payment gateway error (${res.status}). Please check channel configuration.`;

    return {
      success: false,
      status: 'FAILED',
      reference: trackingRef,
      message: errorMessage,
    };
  } catch (err: any) {
    console.error('PayHero STK Push request failed:', err);
    return {
      success: false,
      status: 'ERROR',
      message: err?.message || 'Network connection to PayHero failed. Please check your internet.',
    };
  }
}

/**
 * Polls transaction status from PayHero API using the transaction reference
 */
export async function checkPayHeroTransactionStatus(
  reference: string
): Promise<TransactionStatusResponse> {
  if (!reference) {
    return { success: false, status: 'UNKNOWN' };
  }

  const config = getPayHeroConfig();

  try {
    const res = await fetch(
      `https://backend.payhero.co.ke/api/v2/transaction-status?reference=${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          Authorization: config.authToken,
          'Content-Type': 'application/json',
          'X-AUTH-ACCOUNT-ID': String(config.accountId),
        },
      }
    );

    if (!res.ok) {
      return { success: false, status: 'PENDING', message: 'Verifying with M-Pesa...' };
    }

    const data = await res.json();

    if (data?.status === 'SUCCESS' || data?.success === true) {
      return {
        success: true,
        status: 'SUCCESS',
        merchant: data.merchant,
        providerReference: data.provider_reference || data.third_party_reference,
        amount: data.amount,
      };
    }

    if (data?.status === 'FAILED') {
      return {
        success: false,
        status: 'FAILED',
        message: data.message || 'Transaction was cancelled or declined.',
      };
    }

    return {
      success: false,
      status: 'QUEUED',
      message: 'Awaiting PIN entry on your phone...',
    };
  } catch (err) {
    return {
      success: false,
      status: 'PENDING',
      message: 'Checking transaction status...',
    };
  }
}

