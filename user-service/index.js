const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const JWT_SECRET = "secret123";

const users = [];
let idCounter = 1;

// STATUS
app.get("/status", (req, res) => {
  res.json({ service: "user-service", status: "OK" });
});

// REGISTER
app.post("/users/register", async (req, res) => {
  const { name, email, password } = req.body;

  const existing = users.find(u => u.email === email);
  if (existing) {
    return res.status(409).json({ error: "Email already exists" });
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: idCounter++,
    name,
    email,
    password: hashed
  };

  users.push(user);

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

  res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email }
  });
});

// LOGIN
app.post("/users/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

  res.json({ token });
});

// AUTH
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No token" });

  try {
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

// ME
app.get("/users/me", auth, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: "User not found" });

  res.json({
    id: user.id,
    name: user.name,
    email: user.email
  });
});

app.listen(8001, () => {
  console.log("user-service running on port 8001");
});