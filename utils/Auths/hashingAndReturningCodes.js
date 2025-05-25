const crypto = require('crypto');

const hashCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
  const codeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

  const hashedCode = crypto.createHash('sha256').update(code).digest('hex');

  return { code, hashedCode, codeExpires };
};

module.exports = { hashCode };
