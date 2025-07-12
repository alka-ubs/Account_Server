const pool = require("../db");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const bcrypt = require('bcryptjs');

const createUser = async (req, res) => {
  const { email, password, username, recovery_email, first_name, last_name, mobile } = req.body;
  const is_active = true;

  const client = await pool.connect(); // ✅ Use client for transactions

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users 
      (email, password, username, recovery_email, is_active, first_name, last_name, mobile) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
      RETURNING id`,
      [email, hashedPassword, username, recovery_email, is_active, first_name, last_name, mobile]
    );

    const userId = userResult.rows[0].id;

    await client.query(`
      INSERT INTO folders (user_id, name, type, sort_order)
      VALUES 
        ($1, 'Inbox', 'inbox', 1),
        ($1, 'Sent', 'sent', 2),
        ($1, 'Drafts', 'drafts', 3),
        ($1, 'Trash', 'trash', 4),
        ($1, 'Spam', 'spam', 5),
        ($1, 'Archive', 'archive', 6)
    `, [userId]);

    await client.query('COMMIT');
    res.status(201).send({ message: 'User registered successfully' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('User creation failed:', err);

    if (err.code === '23505') {
      res.status(400).send({
        error: 'Registration failed',
        details: 'Email or username already exists'
      });
    } else {
      res.status(500).send({
        error: 'User creation failed',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } finally {
    client.release(); // ✅ Valid
  }
};


const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ 
      error: "Bad Request",
      message: "Email and password are required" 
    });
  }

  try {
    const result = await pool.query(`
      SELECT id, email, password, first_name, last_name 
      FROM users 
      WHERE email = $1 AND is_active = true
    `, [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Invalid credentials" 
      });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Invalid credentials" 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        user_id: user.id,
        email: user.email
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '24h',
        issuer: 'ub-account-service'
      }
    );

    // Set session data (without sensitive information)
    req.session.user = {
      id: user.id,
      email: user.email,
      name: `${user.first_name} ${user.last_name}`
    };
    req.session.auth = {
      loggedInAt: new Date(),
      userAgent: req.headers['user-agent'] || 'unknown',
      ip: req.ip
    };

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`
      }
    });

  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ 
      error: "Internal Server Error",
      message: "Login failed" 
    });
  }
};

const logoutUser = async  (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed");
    res.clearCookie('connect.sid');
    res.send({ success: true });
    
  });
}

module.exports = {
  createUser,         
  loginUser,         
  logoutUser,            
};