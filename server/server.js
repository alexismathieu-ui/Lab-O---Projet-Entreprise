require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 📁 Sert les fichiers HTML/CSS depuis le dossier "public"
app.use(express.static(path.join(__dirname, "public")));

// 🔌 Connexion MongoDB — lit l'URL depuis .env
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/monprojet";
const PORT = process.env.PORT || 3000;

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté :", MONGO_URI))
  .catch((err) => console.error("❌ Erreur MongoDB :", err));

const User = mongoose.model("User", {
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
});

// POST /register
app.post("/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Cet email est déjà utilisé." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashedPassword });
    await user.save();

    res.json({ message: "User saved in DB" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POST /login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email et mot de passe requis." });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Utilisateur introuvable." });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Mot de passe incorrect." });
    }

    res.json({ message: "Login success" });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

app.listen(PORT, () => console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`));
