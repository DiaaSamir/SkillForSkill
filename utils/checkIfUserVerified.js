
const client = require('../db');

exports.checkIfUserVerified = async (userId) => {
  const id = userId;

  const userQuery = await client.query(
    `SELECT id, is_email_verified FROM users WHERE id= $1`,
    [id]
  );
  const user = userQuery.rows[0];

  return user.is_email_verified === false;
};
