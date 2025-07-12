const pool = require("../db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require('bcryptjs');

const getProfile = async (req, res) => {
};
const updatePreferences = async (req, res) => {
}
const updateProfile = async (req, res) => {
}

const updatePassword = async (req, res) => {
};

const checkSession = (req, res) => {
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