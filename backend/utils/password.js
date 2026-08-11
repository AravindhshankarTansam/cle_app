import crypto from 'crypto';

export function hashPassword(password) {
  if (!password) return '';
  const salt = 'cle_call_ap_secret_salt_123!';
  return crypto.pbkdf2Sync(password, salt, 1000, 32, 'sha256').toString('hex');
}
