// PoeHUB backend skeleton - Node/Express
// - Serves the static frontend from /public
// - Provides placeholder API routes for auth and hub configuration

const path = require("path");
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const db = require("./db");
const auth = require("./auth");

const app = express();
const PORT = process.env.PORT || 8080;

// Basic middlewares
app.use(express.json());
app.use(cookieParser());

// Static frontend (PoeHUB)
const publicDir = path.join(__dirname, "..", "public");
app.use(express.static(publicDir));

// Simple health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", app: "PoeHUB" });
});

// --- Auth middleware ---

async function attachUser(req, res, next) {
  try {
    const sessionId = req.cookies[auth.SESSION_COOKIE];
    if (!sessionId) {
      req.user = null;
      return next();
    }

    const session = await auth.getSession(sessionId);
    if (!session) {
      req.user = null;
      return next();
    }

    req.user = { id: session.user_id, email: session.email };
    return next();
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Error in attachUser middleware", err);
    req.user = null;
    return next();
  }
}

app.use(attachUser);

// --- Auth routes ---

// POST /api/register
app.post("/api/register", (req, res) => {
  (async () => {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email et mot de passe sont requis." });
    }

    try {
      const existing = await auth.findUserByEmail(email.toLowerCase());
      if (existing) {
        return res.status(409).json({ error: "Un compte existe déjà avec cet e-mail." });
      }

      const user = await auth.createUser(email.toLowerCase(), password);
      const session = await auth.createSession(user.id);
      auth.setSessionCookie(res, session.id);

      return res.status(201).json({
        id: user.id,
        email: user.email,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error in /api/register", err);
      return res.status(500).json({ error: "Erreur interne lors de l'inscription." });
    }
  })();
});

// POST /api/login
app.post("/api/login", (req, res) => {
  (async () => {
    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email et mot de passe sont requis." });
    }

    try {
      const user = await auth.findUserByEmail(email.toLowerCase());
      if (!user) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }

      const ok = await bcrypt.compare(password, user.password_hash);
      if (!ok) {
        return res.status(401).json({ error: "Identifiants invalides." });
      }

      const session = await auth.createSession(user.id);
      auth.setSessionCookie(res, session.id);

      return res.json({ id: user.id, email: user.email });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error in /api/login", err);
      return res.status(500).json({ error: "Erreur interne lors de la connexion." });
    }
  })();
});

// POST /api/logout
app.post("/api/logout", (req, res) => {
  (async () => {
    const sessionId = req.cookies[auth.SESSION_COOKIE];
    if (sessionId) {
      try {
        await auth.destroySession(sessionId);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Error destroying session", err);
      }
    }
    auth.clearSessionCookie(res);
    res.status(204).end();
  })();
});

// --- Hub routes (placeholders) ---

// GET /api/hub - return current user's hub config
app.get("/api/hub", (req, res) => {
  (async () => {
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifié." });
    }

      try {
        const rows = await db.query(
          `
          SELECT id, user_id, layout_json, updated_at
          FROM hubs
          WHERE user_id = ?
        `,
          [req.user.id]
        );

        if (rows.length === 0) {
        return res.json({ layout: null });
      }

        const hub = rows[0];
      return res.json({ layout: hub.layout_json, updatedAt: hub.updated_at });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error in GET /api/hub", err);
      return res.status(500).json({ error: "Erreur interne lors du chargement du hub." });
    }
  })();
});

// PUT /api/hub - save current user's hub config
app.put("/api/hub", (req, res) => {
  (async () => {
    if (!req.user) {
      return res.status(401).json({ error: "Non authentifié." });
    }

    const { layout } = req.body || {};
    if (layout === undefined) {
      return res.status(400).json({ error: "Le champ 'layout' est requis." });
    }

    try {
      await db.query(
        `
          INSERT INTO hubs (user_id, layout_json)
          VALUES (?, ?)
          ON DUPLICATE KEY UPDATE layout_json = VALUES(layout_json), updated_at = CURRENT_TIMESTAMP
        `,
        [req.user.id, JSON.stringify(layout)]
      );

      return res.status(204).end();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error in PUT /api/hub", err);
      return res.status(500).json({ error: "Erreur interne lors de la sauvegarde du hub." });
    }
  })();
});

// Fallback to index.html for direct navigation to root
app.get("*", (req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`PoeHUB backend listening on port ${PORT}`);
});

