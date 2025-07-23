// 前端密码哈希工具
// 使用SHA-256进行密码哈希，增加传输安全性

// 使用统一的salt（与后端保持一致）
const UNIFIED_SALT = 'your_fixed_salt_here'; // 应该与后端环境变量PASSWORD_SALT保持一致

// 使用SHA-256哈希密码
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + UNIFIED_SALT);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

// 哈希密码用于传输
export async function hashPasswordForTransmission(password) {
  const hashedPassword = await hashPassword(password);
  return {
    hashedPassword,
    salt: UNIFIED_SALT
  };
} 