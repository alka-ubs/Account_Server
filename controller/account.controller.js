const pool = require("../db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require('bcryptjs');
const ALLOWED_FIELDS = [
  'username',
  'recovery_email',
  'is_active',
  'is_verified',
  'is_admin',
  'mailbox_quota',
  'used_quota',
  'two_factor_enabled',
  'failed_login_attempts',
  'last_login',
  'first_name',
  'last_name',
  'mobile',
  'blocked_emails',
  'spammed_emails',
  'language',
  'timezone',
  'RecoveryEmail',
];

const getProfile = async (req, res)=>{
    let userId = req.user.user_id;
    try{
        const userQuery = await pool.query(
            `SELECT 
              email, 
              username, 
              is_active, 
              is_verified, 
              is_admin, 
              mailbox_quota, 
              used_quota, 
              two_factor_enabled, 
              failed_login_attempts, 
              last_login, 
              created_at, 
              updated_at, 
              deleted_at, 
              first_name, 
              last_name, 
              mobile,
              preferences,
              language,
              timezone,
              avatar,
              RecoveryEmail
            FROM users 
            WHERE id = $1`,
            [userId]
          );
      
          if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
          }
      
          const user = userQuery.rows[0];

          let userBody ={
            id: userId,
            email: user.email,
            username: user.username,
            is_active: user.is_active,
            is_verified: user.is_verified,
            is_admin: user.is_admin,
            mailbox_quota: user.mailbox_quota,
            used_quota: user.used_quota,
            two_factor_enabled: user.two_factor_enabled,
            failed_login_attempts: user.failed_login_attempts,
            last_login: user.last_login,
            created_at: user.created_at,
            updated_at: user.updated_at,
            deleted_at: user.deleted_at,
            first_name: user.first_name,
            last_name: user.last_name,
            mobile: user.mobile,
            preferences: user.preferences,
            language: user.language,
            timezone: user.timezone,
            avatar: user.avatar,
            RecoveryEmail: user.RecoveryEmail
          };

          res.status(200).json(userBody)
    }catch(err){
      console.log(err);
    }
  };
const updatePreferences =  async (req, res) => {
  const userId = req.user.user_id; // from auth middleware
  const newPrefs = req.body;

  if (!newPrefs || typeof newPrefs !== 'object') {
    return res.status(400).json({ error: 'Invalid preferences payload.' });
  }

  try {
    // Fetch current preferences
    const { rows } = await pool.query(`SELECT preferences FROM users WHERE id = $1`, [userId]);
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const existingPrefs = rows[0].preferences?.[0] || {};
    const updatedPrefs = { ...existingPrefs, ...newPrefs };

    // Save merged settings as a single-element array
    await pool.query(
      `UPDATE users SET preferences = $1::jsonb WHERE id = $2`,
      [JSON.stringify(updatedPrefs), userId]
    );

    return res.json({ message: 'Preferences updated', preferences: updatedPrefs });
  } catch (err) {
    console.error('Error updating preferences:', err);
    res.status(500).json({ error: 'Server error' });
  }
}
const updateProfile =  async (req, res) => {
  const  userId  = req.user.user_id;
  const { updates } = req.body;
console.log('Request body:', req.body);
console.log('Updates:', updates);
  try {
    // Filter out any fields that shouldn't be updated
    const filteredUpdates = {};
    for (const key in updates) {
      if (ALLOWED_FIELDS.includes(key) && key !== 'preferences') {
        filteredUpdates[key] = updates[key];
      }
    }

    // If no valid fields to update
    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({ 
        error: 'No valid fields provided for update' 
      });
    }

    // Build the SET clause for the SQL query
    const setClause = Object.keys(filteredUpdates)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.values(filteredUpdates);
    values.push(userId); // Add userId as the last parameter

    const queryText = `
      UPDATE users 
      SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
      WHERE id = $${values.length} 
      RETURNING *
    `;

    const { rows } = await pool.query(queryText, values);
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: rows[0] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

const updatePassword = async (req, res) => {
  const userId = req.user.user_id;
  const { currentPassword, newPassword } = req.body;
  console.log("🔥 req.body:", req.body);

  // Validate input
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new passwords are required.' });
  }

  try {
    // Step 1: Get current hashed password from DB
    const userQuery = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);

    if (userQuery.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const storedHashedPassword = userQuery.rows[0].password;

    // Step 2: Compare currentPassword with stored hash
    const isMatch = await bcrypt.compare(currentPassword, storedHashedPassword);
    if (!isMatch) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Step 3: Hash the new password
    const saltRounds = 10;
    const newHashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Step 4: Update the password in the DB
    const updateQuery = `
      UPDATE users
      SET password = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, email, username
    `;

    const { rows } = await pool.query(updateQuery, [newHashedPassword, userId]);

    res.json({ message: 'Password updated successfully', user: rows[0] });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


const checkSession = (req, res) => {
  console.log("Session ID: checking while /users/session", req.sessionID);
  console.log("Session Object:", req.session);
  if ( req.session && req.session?.userId) {
    return res.json({ authenticated: true, email: req.session.email, userId: req.session.userId });
  }
  res.status(401).json({ authenticated: false });
  
};


const deleteAccount = async (req, res) => {
    const userId = req.user?.user_id;

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized or invalid token" });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const userResult = await client.query(`SELECT email FROM users WHERE id = $1`, [userId]);

        if (userResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: "User not found" });
        }

        const email = userResult.rows[0].email;

        await client.query(`DELETE FROM folders WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM organisation WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM labels WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM key_cache WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM user_public_keys WHERE user_id = $1`, [userId]);
        await client.query(`DELETE FROM domain WHERE user_id = $1`, [userId]);

        await client.query(`DELETE FROM users WHERE id = $1`, [userId]);

        await client.query('COMMIT');

        res.status(200).json({
            message: `User with ID ${userId} (${email}) and all associated data have been deleted.`
        });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error deleting user:', err);
        res.status(500).json({ error: "Internal server error", details: err.message });
    } finally {
        client.release();
    }
};

module.exports = {
    getProfile,
    checkSession,
    updateProfile,
    updatePreferences,
    updatePassword,
    deleteAccount
}