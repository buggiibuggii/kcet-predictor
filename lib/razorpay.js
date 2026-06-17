import Razorpay from 'razorpay'
import crypto from 'crypto'

let _client = null
export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET
  if (!keyId || !keySecret) return null
  if (!_client) {
    _client = new Razorpay({ key_id: keyId, key_secret: keySecret })
  }
  return _client
}

export function hasRazorpay() {
  return !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)
}

export function verifyRazorpaySignature({ orderId, paymentId, signature }) {
  const body = `${orderId}|${paymentId}`
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
    .update(body)
    .digest('hex')
  return expected === signature
}
