const { COURIER_STEADFAST_BASE_URL, COURIER_STEADFAST_API_KEY, COURIER_STEADFAST_SECRET_KEY, COURIER_PATHAO_BASE_URL, COURIER_PATHAO_CLIENT_ID, COURIER_PATHAO_CLIENT_SECRET, COURIER_PATHAO_USERNAME, COURIER_PATHAO_PASSWORD, COURIER_PATHAO_STORE_ID } = require('../config/env');

const config = {
  steadfast: { baseUrl: COURIER_STEADFAST_BASE_URL, credentials: [COURIER_STEADFAST_API_KEY, COURIER_STEADFAST_SECRET_KEY] },
  pathao: { baseUrl: COURIER_PATHAO_BASE_URL, credentials: [COURIER_PATHAO_CLIENT_ID, COURIER_PATHAO_CLIENT_SECRET, COURIER_PATHAO_USERNAME, COURIER_PATHAO_PASSWORD, COURIER_PATHAO_STORE_ID] },
};

function getCourierCapabilities() {
  return {
    manual: { credentialsConfigured: true, liveBookingEnabled: false },
    ...Object.fromEntries(Object.entries(config).map(([provider, value]) => [provider, {
      credentialsConfigured: Boolean(value.baseUrl && value.credentials.every(Boolean)),
      liveBookingEnabled: false,
      reason: 'Provider-specific request and webhook contracts have not been verified in this project.',
    }])),
  };
}

async function createBooking(provider) {
  if (!['steadfast', 'pathao'].includes(provider)) throw new Error('Choose Steadfast or Pathao for courier booking.');
  if (!config[provider].baseUrl || !config[provider].credentials.every(Boolean)) return { mode: 'manual', status: 'manual_required', reason: 'Courier credentials are not configured.' };
  return { mode: 'manual', status: 'manual_required', reason: 'Credentials are configured, but live booking remains disabled until the provider contract is verified.' };
}

module.exports = { getCourierCapabilities, createBooking };
