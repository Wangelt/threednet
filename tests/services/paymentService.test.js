const crypto = require('crypto');
const {
  isRazorpayConfigured,
  getPublicKeyId,
  verifyPaymentSignature,
  verifyWebhookSignature,
} = require('../../src/services/paymentService');

// These match the values set in tests/setup.js
const KEY_SECRET = 'testsecretkeyvalue';
const WEBHOOK_SECRET = 'testwebhooksecretvalue';

function hmac(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

describe('isRazorpayConfigured', () => {
  test('returns true when key ID and secret are present', () => {
    expect(isRazorpayConfigured()).toBe(true);
  });
});

describe('getPublicKeyId', () => {
  test('returns the configured key ID', () => {
    expect(getPublicKeyId()).toBe('rzp_test_testkey');
  });
});

describe('verifyPaymentSignature', () => {
  const razorpayOrderId = 'order_test123';
  const razorpayPaymentId = 'pay_test456';

  function validSignature() {
    return hmac(KEY_SECRET, `${razorpayOrderId}|${razorpayPaymentId}`);
  }

  test('returns true for a correctly signed payload', () => {
    expect(verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: validSignature(),
    })).toBe(true);
  });

  test('returns false when the signature is wrong', () => {
    expect(verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature: 'deadbeefdeadbeef',
    })).toBe(false);
  });

  test('returns false when the order ID is tampered', () => {
    const sig = validSignature();
    expect(verifyPaymentSignature({
      razorpayOrderId: 'order_tampered',
      razorpayPaymentId,
      razorpaySignature: sig,
    })).toBe(false);
  });

  test('returns false when the payment ID is tampered', () => {
    const sig = validSignature();
    expect(verifyPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId: 'pay_tampered',
      razorpaySignature: sig,
    })).toBe(false);
  });
});

describe('verifyWebhookSignature', () => {
  const body = JSON.stringify({ event: 'payment.captured', payload: {} });

  test('returns true for a valid webhook signature', () => {
    const sig = hmac(WEBHOOK_SECRET, body);
    expect(verifyWebhookSignature(body, sig)).toBe(true);
  });

  test('returns false when the body is tampered after signing', () => {
    const sig = hmac(WEBHOOK_SECRET, body);
    const tampered = JSON.stringify({ event: 'payment.captured', payload: {}, injected: true });
    expect(verifyWebhookSignature(tampered, sig)).toBe(false);
  });

  test('returns false for a completely wrong signature', () => {
    expect(verifyWebhookSignature(body, 'badsignature')).toBe(false);
  });
});
