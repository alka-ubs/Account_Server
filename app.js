const express = require("express");
const cors = require("cors");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const pool = require("./db");
const userRouter = require("./routes/user.route");
const accountRouter = require("./routes/account.route");
require("dotenv").config();

const app = express();

const sessionMiddileware = session({
  store: new pgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    sameSite: 'none',
    secure: true
  }
});

app.use(cors({
  origin: ["https://localhost:5173", "https://mail.ubshq.com", "https://dev-mail.ubshq.com"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(sessionMiddileware);

app.use("/users", userRouter);
app.use("/account", accountRouter);

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(` UB Account API running on port ${PORT}`);
});
