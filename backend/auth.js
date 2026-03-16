const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const db = require("./db");

const SESSION_COOKIE = "poehub_session";
const SESSION_TTL_DAYS = 7;

async function createUser(email, password) {
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await db.pool.execute(
    "INSERT INTO users (email, password_hash) VALUES (?, ?)",
    [email, passwordHash]
  );

  return {
    id: result.insertId,
    email,
    created_at: new Date(),
  };
}

async function findUserByEmail(email) {
  const rows = await db.query(
    "SELECT id, email, password_hash, created_at FROM users WHERE email = ?",
    [email]
  );
  return rows[0] || null;
}

async function createSession(userId) {
  const sessionId = uuidv4();
  await db.pool.execute(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL ? DAY))",
    [sessionId, userId, SESSION_TTL_DAYS]
  );
  return {
    id: sessionId,
    user_id: userId,
  };
}

async function getSession(sessionId) {
  const rows = await db.query(
    `
      SELECT s.id, s.user_id, s.expires_at, u.email
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.id = ?
        AND s.expires_at > NOW()
    `,
    [sessionId]
  );
  return rows[0] || null;
}

async function destroySession(sessionId) {
  await db.query("DELETE FROM sessions WHERE id = ?", [sessionId]);
}

function setSessionCookie(res, sessionId) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

module.exports = {
  SESSION_COOKIE,
  createUser,
  findUserByEmail,
  createSession,
  getSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
};

