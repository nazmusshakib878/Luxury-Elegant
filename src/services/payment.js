const {
  BASE_URL,
  SSL_LIVE,
  SSL_STORE_ID,
  SSL_STORE_PASS,
  AAMARPAY_LIVE,
  AAMARPAY_STORE_ID,
  AAMARPAY_SIGNATURE,
} = require('../config/env');

/**
 * Initiate online payment transaction through selected gateway.
 */
async function initiatePayment(order, method) {
  // Gateways remain deliberately inactive until a verified merchant setup and
  // signed callback flow are integrated in the Next.js order lifecycle.
  if (process.env.PAYMENTS_ENABLED !== '1' || process.env.NODE_ENV === 'production') {
    throw new Error('Online payments are disabled until merchant integration is verified.');
  }
  const tranId = `ORD${order.id}`;
  const callbackUrl = (statusPath) => `${BASE_URL}/pay/${statusPath}`;

  if (method === 'sslcommerz') {
    const endpoint = SSL_LIVE
      ? 'https://securepay.sslcommerz.com/gwprocess/v4/api.php'
      : 'https://sandbox.sslcommerz.com/gwprocess/v4/api.php';

    const params = new URLSearchParams({
      store_id: SSL_STORE_ID,
      store_passwd: SSL_STORE_PASS,
      total_amount: order.total,
      currency: 'BDT',
      tran_id: tranId,
      success_url: callbackUrl('ssl/success'),
      fail_url: callbackUrl('ssl/fail'),
      cancel_url: callbackUrl('ssl/cancel'),
      cus_name: order.name,
      cus_email: 'customer@example.com',
      cus_add1: order.address,
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      cus_phone: order.phone,
      shipping_method: 'NO',
      product_name: `Order ${tranId}`,
      product_category: 'general',
      product_profile: 'general',
    });

    const res = await fetch(endpoint, { method: 'POST', body: params });
    const data = await res.json();

    if (!data.GatewayPageURL) {
      throw new Error(`SSLCOMMERZ: ${data.failedreason || 'Please check store credentials'}`);
    }
    return data.GatewayPageURL;
  }

  if (method === 'aamarpay') {
    const endpoint = AAMARPAY_LIVE
      ? 'https://secure.aamarpay.com/jsonpost.php'
      : 'https://sandbox.aamarpay.com/jsonpost.php';

    const payload = {
      store_id: AAMARPAY_STORE_ID,
      signature_key: AAMARPAY_SIGNATURE,
      tran_id: tranId,
      amount: String(order.total),
      currency: 'BDT',
      desc: `Order ${tranId}`,
      cus_name: order.name,
      cus_email: 'customer@example.com',
      cus_phone: order.phone,
      cus_add1: order.address,
      cus_city: 'Dhaka',
      cus_country: 'Bangladesh',
      success_url: callbackUrl('aamar/success'),
      fail_url: callbackUrl('aamar/fail'),
      cancel_url: callbackUrl('aamar/cancel'),
      type: 'json',
    };

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();

    if (!data.payment_url) {
      throw new Error('aamarPay: Please check store credentials');
    }
    return data.payment_url;
  }

  throw new Error(`Unsupported payment method: ${method}`);
}

/**
 * Verify payment callback from gateway.
 */
async function verifyPayment(gateway, callbackBody, order) {
  if (process.env.PAYMENTS_ENABLED !== '1' || process.env.NODE_ENV === 'production') return false;
  if (gateway === 'ssl') {
    const endpoint = SSL_LIVE
      ? 'https://securepay.sslcommerz.com/validator/api/validationserverAPI.php'
      : 'https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php';

    const params = new URLSearchParams({
      val_id: callbackBody.val_id || '',
      store_id: SSL_STORE_ID,
      store_passwd: SSL_STORE_PASS,
      format: 'json',
    });

    const res = await fetch(`${endpoint}?${params}`);
    const data = await res.json();

    const isValid = ['VALID', 'VALIDATED'].includes(data.status);
    const amountMatches = Math.abs(parseFloat(data.amount) - order.total) < 1;

    return isValid && amountMatches;
  }

  if (gateway === 'aamar') {
    const endpoint = AAMARPAY_LIVE
      ? 'https://secure.aamarpay.com/api/v1/trxcheck/request.php'
      : 'https://sandbox.aamarpay.com/api/v1/trxcheck/request.php';

    const params = new URLSearchParams({
      request_id: `ORD${order.id}`,
      store_id: AAMARPAY_STORE_ID,
      signature_key: AAMARPAY_SIGNATURE,
      type: 'json',
    });

    const res = await fetch(`${endpoint}?${params}`);
    const data = await res.json();

    return data.pay_status === 'Successful';
  }

  return false;
}

module.exports = {
  initiatePayment,
  verifyPayment,
};
