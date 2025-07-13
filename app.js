const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db");
const userRouter = require("./routes/user.route");
const accountRouter = require("./routes/account.route");
require("dotenv").config();

const app = express();

// Enhanced session configuration
const sessionMiddleware = session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
    pruneSessionInterval: false // or set to a number (in minutes) for automatic cleanup
  }),
  name: 'ub.sid', // Custom session cookie name
  secret: process.env.SESSION_SECRET || 'fallback-secret-for-dev-only', // Always have a fallback for development
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    httpOnly: true, // Important for security
    secure: process.env.NODE_ENV === 'production', // Only HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.NODE_ENV === 'production' ? '.ubshq.com' : undefined
  }
});

// Enhanced CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      "http://localhost:5173",
      "http://173.212.211.19:5173",
      "http://173.212.211.19:8001",
      "https://mail.ubshq.com",
      "https://dev-mail.ubshq.com"
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn("Blocked CORS origin:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));


app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddleware);

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Routes
app.use("/users", userRouter);
app.use("/account", accountRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`UB Account API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
