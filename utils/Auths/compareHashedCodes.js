const crypto = require('crypto');

const compareCode = (providedCode, storedHashedCode) => {
  const hashedProvidedCode = crypto
    .createHash('sha256')
    .update(providedCode)
    .digest('hex');

  return hashedProvidedCode === storedHashedCode;
};
module.exports = { compareCode };
