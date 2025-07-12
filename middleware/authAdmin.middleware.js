require('dotenv').config();

const authenticateAdminOnly = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token missing" });
  try {
    if(token === process.env.ADMIN_SECRET){
        next();
    }
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};

module.exports = authenticateAdminOnly;