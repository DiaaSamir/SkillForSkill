const bcrypt = require('bcryptjs');

const compareHashedPasswords = async (ProvidedPassword, storedPassword) => {
  return await bcrypt.compare(ProvidedPassword, storedPassword);
};

module.exports = { compareHashedPasswords };
