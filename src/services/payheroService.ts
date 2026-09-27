/**
 * PayHero Kenya (M-Pesa) Direct Payment Service for WATCHD
 * Direct M-Pesa STK push & real-time polling with 0 external popups or iframes.
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
const DEFAULT_CHANNEL_ID = '12072';

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

export type KenyanCarrier = 'safaricom' | 'airtel' | 'telkom' | 'unknown';

/**
 * Detects mobile carrier from Kenyan phone prefix
 */
export function detectKenyanCarrier(phone: string): KenyanCarrier {
  const clean = phone.replace(/\D/g, '');
  let local = '';
  if (clean.startsWith('254') && clean.length === 12) {
    local = '0' + clean.slice(3);
  } else if (clean.startsWith('0') && clean.length === 10) {
    local = clean;
  } else if ((clean.startsWith('7') || clean.startsWith('1')) && clean.length === 9) {
    local = '0' + clean;
  }

  if (!local || local.length < 3) return 'unknown';

  const prefix3 = local.slice(0, 3);
  const prefix4 = local.slice(0, 4);

  // Safaricom prefixes: 070X, 071X, 072X, 0740-0743, 0745-0746, 0748, 0757-0759, 0768-0769, 079X, 0110-0115
  if (['070', '071', '072', '079'].includes(prefix3)) return 'safaricom';
  if (['0740', '0741', '0742', '0743', '0745', '0746', '0748', '0757', '0758', '0759', '0768', '0769'].includes(prefix4)) return 'safaricom';
  if (['0110', '0111', '0112', '0113', '0114', '0115'].includes(prefix4)) return 'safaricom';

  // Airtel prefixes: 073X, 078X, 0750-0756, 0100-0106
  if (['073', '078'].includes(prefix3)) return 'airtel';
  if (['0750', '0751', '0752', '0753', '0754', '0755', '0756'].includes(prefix4)) return 'airtel';
  if (['0100', '0101', '0102', '0103', '0104', '0105', '0106'].includes(prefix4)) return 'airtel';

  // Telkom prefixes: 077X
  if (['077'].includes(prefix3)) return 'telkom';

  return 'unknown';
}

/**
 * Normalizes Kenyan phone numbers to local standard `07XXXXXXXX` or `01XXXXXXXX`
 * and international standard `254XXXXXXXXX`, while detecting network carrier.
 */
export function normalizeKenyanPhone(input: string): {
  local: string;
  international: string;
  isValid: boolean;
  carrier: KenyanCarrier;
  isSafaricom: boolean;
} {
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
  const carrier = detectKenyanCarrier(local);
  const isSafaricom = carrier === 'safaricom';

  return { local, international, isValid, carrier, isSafaricom };
}

/**
 * Initiates direct M-Pesa STK Push payment prompt to the supporter's phone via PayHero API
 */
export async function sendPayHeroStkPush({
  amount,
  phone,
  customerName = 'WATCHD Supporter',
  reference,
}: StkPushRequest): Promise<StkPushResponse> {
  const config = getPayHeroConfig();
  const { local, international, isValid, carrier } = normalizeKenyanPhone(phone);

  if (!isValid) {
    return {
      success: false,
      message: 'Please enter a valid Kenyan Safaricom number (e.g. 0712 345 678 or 0110 345 678)',
    };
  }

  if (carrier === 'airtel' || carrier === 'telkom') {
    return {
      success: false,
      message:
        'Direct STK PIN prompts only work on Safaricom M-Pesa. Please enter a Safaricom number (e.g. 0712..., 0722..., 0110...).',
    };
  }

  const roundedAmount = Math.max(1, Math.round(amount));
  const trackingRef = reference || `WATCHD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const channelNum = Number(config.channelId) || 12072;
  const accountId = config.accountId || DEFAULT_ACCOUNT_ID;

  const payload = {
    amount: roundedAmount,
    phone_number: local || international,
    channel_id: channelNum,
    provider: 'm-pesa',
    external_reference: trackingRef,
    customer_name: customerName,
  };

  // Primary: Direct Account Payments Endpoint (Tested 201 Created)
  // Fallback: v2 Payments with Basic Auth
  const endpoints: Array<{ url: string; headers: Record<string, string> }> = [
    {
      url: `https://backend.payhero.co.ke/api/account/${accountId}/payments`,
      headers: { 'Content-Type': 'application/json' },
    },
    {
      url: 'https://backend.payhero.co.ke/api/v2/payments',
      headers: {
        Authorization: config.authToken,
        'Content-Type': 'application/json',
        'X-AUTH-ACCOUNT-ID': String(accountId),
      },
    },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep.url, {
        method: 'POST',
        headers: ep.headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if ((res.status === 200 || res.status === 201) && data) {
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

      if (data?.message && data.message !== 'Unable to perform request') {
        return {
          success: false,
          status: 'FAILED',
          reference: trackingRef,
          message: data.message,
        };
      }
    } catch (err) {
      console.warn(`PayHero attempt on ${ep.url} failed:`, err);
    }
  }

  return {
    success: false,
    status: 'ERROR',
    message: 'Could not send M-Pesa prompt. Please check your phone number and try again.',
  };
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

  try {
    const res = await fetch(
      `https://backend.payhero.co.ke/api/transaction-status?reference=${encodeURIComponent(reference)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      return { success: false, status: 'PENDING', message: 'Verifying with M-Pesa...' };
    }

    const data = await res.json();

    const status = String(data?.status || '').toUpperCase().trim();

    if (status === 'SUCCESS') {
      return {
        success: true,
        status: 'SUCCESS',
        merchant: data.merchant,
        providerReference: data.third_party_reference || data.payment_reference || data.provider_reference || data.reference,
        amount: data.amount,
      };
    }

    if (
      status === 'FAILED' ||
      status === 'CANCELLED' ||
      status === 'REJECTED' ||
      status === 'DECLINED' ||
      status === 'EXPIRED'
    ) {
      return {
        success: false,
        status: 'FAILED',
        message:
          data.message ||
          data.error_message ||
          'Transaction was cancelled or declined on your phone.',
      };
    }

    // Default to QUEUED / PENDING - awaiting PIN entry
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
