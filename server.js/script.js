const express = require("express");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

let users = [];

app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({
    email,
    password: hashedPassword,
  });

  res.json({ message: "User created" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email);

  if (!user) {
    return res.status(400).json({ message: "User not found" });
  }

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(400).json({ message: "Wrong password" });
  }

  res.json({ message: "Login success" });
});

app.listen(3000, () => console.log("Server running"));
