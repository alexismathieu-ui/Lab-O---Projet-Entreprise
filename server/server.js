require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/pulse";
const PORT = process.env.PORT || 3000;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB connecté"))
  .catch((err) => console.error("❌ MongoDB erreur:", err));

// SCHÉMAS 

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});
const User = mongoose.model("User", UserSchema);

const PostSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 140 },
  category: { type: String, enum: ["Aide", "Info", "Détente", "Petites Annonces"], default: "Info" },
  author: { type: String, default: "Anonyme" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});
const Post = mongoose.model("Post", PostSchema);

const AnnonceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  author: { type: String, default: "Anonyme" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  createdAt: { type: Date, default: Date.now },
});
const Annonce = mongoose.model("Annonce", AnnonceSchema);

const MediaSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  type: { type: String, enum: ["pdf", "image"], required: true },
  duration: { type: Number, default: 15 },
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
});
const Media = mongoose.model("Media", MediaSchema);

const CoworkerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  company: { type: String, default: "" },
  floor: { type: String, default: "" },
  bio: { type: String, default: "" },
  contact: { type: String, default: "" },
  website: { type: String, default: "" },
  avatar: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});
const Coworker = mongoose.model("Coworker", CoworkerSchema);

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  active: { type: Boolean, default: true },
  mode: { type: String, enum: ["question", "chat"], default: "question" },
  createdAt: { type: Date, default: Date.now },
});
const Question = mongoose.model("Question", QuestionSchema);

const AlertSchema = new mongoose.Schema({
  message: { type: String, required: true },
  active: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
const Alert = mongoose.model("Alert", AlertSchema);

// UPLOAD ─

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, "uploads")),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Format non supporté (PDF, PNG, JPEG seulement)"));
  },
  limits: { fileSize: 20 * 1024 * 1024 },
});

// AUTH ─

app.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Champs requis." });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email déjà utilisé." });
    const hashed = await bcrypt.hash(password, 10);
    // Premier compte créé = admin automatiquement
    const count = await User.countDocuments();
    const user = new User({ email, password: hashed, role: count === 0 ? "admin" : "user" });
    await user.save();
    res.json({ message: "User saved in DB", role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Champs requis." });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Utilisateur introuvable." });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Mot de passe incorrect." });

    // Correction automatique : si role manquant (ancien compte sans role)
    if (!user.role) {
      const adminCount = await User.countDocuments({ role: "admin" });
      user.role = adminCount === 0 ? "admin" : "user";
      await user.save();
      console.log("🔧 Role corrigé pour " + email + " → " + user.role);
    }

    res.json({ message: "Login success", role: user.role, email: user.email });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// Route utilitaire pour passer un compte en admin manuellement
app.post("/api/make-admin", async (req, res) => {
  const { email, secret } = req.body;
  if (secret !== "pulse-setup-2026") return res.status(403).json({ message: "Acces refuse." });
  try {
    const user = await User.findOneAndUpdate({ email }, { role: "admin" }, { new: true });
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
    res.json({ message: email + " est maintenant admin.", role: user.role });
  } catch (err) {
    res.status(500).json({ message: "Erreur serveur." });
  }
});

// POSTS 

app.get("/api/posts", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const posts = await Post.find(filter).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post("/api/posts", async (req, res) => {
  try {
    const { text, category, author } = req.body;
    if (!text) return res.status(400).json({ message: "Texte requis." });
    const post = new Post({ text, category, author });
    await post.save();
    io.emit("new-post", post);
    res.json(post);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// Vider le mur
app.post("/api/posts/clear-wall", async (req, res) => {
  try {
    await Post.updateMany({ status: "approved" }, { status: "rejected" });
    io.emit("wall-cleared");
    res.json({ message: "Mur vidé." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.patch("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!post) return res.status(404).json({ message: "Post introuvable." });
    io.emit("post-updated", post);
    res.json(post);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.delete("/api/posts/:id", async (req, res) => {
  try {
    await Post.findByIdAndDelete(req.params.id);
    io.emit("post-deleted", { id: req.params.id });
    res.json({ message: "Post supprimé." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});


// ANNONCES 

app.get("/api/annonces", async (req, res) => {
  try {
    const { status } = req.query;
    const filter = status ? { status } : {};
    const annonces = await Annonce.find(filter).sort({ createdAt: -1 });
    res.json(annonces);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post("/api/annonces", async (req, res) => {
  try {
    const { title, description, author } = req.body;
    if (!title || !description) return res.status(400).json({ message: "Champs requis." });
    const annonce = new Annonce({ title, description, author });
    await annonce.save();
    res.json(annonce);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.patch("/api/annonces/:id", async (req, res) => {
  try {
    const annonce = await Annonce.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!annonce) return res.status(404).json({ message: "Annonce introuvable." });
    res.json(annonce);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.delete("/api/annonces/:id", async (req, res) => {
  try {
    await Annonce.findByIdAndDelete(req.params.id);
    res.json({ message: "Annonce supprimée." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// MÉDIAS ─

app.get("/api/medias", async (req, res) => {
  try {
    const medias = await Media.find().sort({ order: 1, createdAt: -1 });
    res.json(medias);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post("/api/medias/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Fichier requis." });
    const isPdf = req.file.mimetype === "application/pdf";
    const count = await Media.countDocuments();
    const media = new Media({
      filename: req.file.filename,
      originalName: req.file.originalname,
      type: isPdf ? "pdf" : "image",
      duration: parseInt(req.body.duration) || 15,
      order: count,
    });
    await media.save();
    io.emit("media-updated");
    res.json(media);
  } catch (err) { res.status(500).json({ message: "Erreur upload." }); }
});


app.patch("/api/medias/reorder", async (req, res) => {
  try {
    const { order } = req.body; // [{ id, order }]
    for (const item of order) {
      await Media.findByIdAndUpdate(item.id, { order: item.order });
    }
    io.emit("media-updated");
    res.json({ message: "Ordre mis à jour." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.patch("/api/medias/:id", async (req, res) => {
  try {
    const media = await Media.findByIdAndUpdate(req.params.id, req.body, { new: true });
    io.emit("media-updated");
    res.json(media);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});


app.delete("/api/medias/:id", async (req, res) => {
  try {
    const media = await Media.findByIdAndDelete(req.params.id);
    if (media) {
      const fs = require("fs");
      const filepath = path.join(__dirname, "uploads", media.filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    }
    io.emit("media-updated");
    res.json({ message: "Média supprimé." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// COWORKERS (Trombinoscope) 

app.get("/api/coworkers", async (req, res) => {
  try {
    const coworkers = await Coworker.find().sort({ createdAt: -1 });
    res.json(coworkers);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.get("/api/coworkers/random", async (req, res) => {
  try {
    const count = await Coworker.countDocuments();
    if (count === 0) return res.json(null);
    const random = Math.floor(Math.random() * count);
    const coworker = await Coworker.findOne().skip(random);
    res.json(coworker);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post("/api/coworkers", async (req, res) => {
  try {
    const coworker = new Coworker(req.body);
    await coworker.save();
    res.json(coworker);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.patch("/api/coworkers/:id", async (req, res) => {
  try {
    const coworker = await Coworker.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(coworker);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.delete("/api/coworkers/:id", async (req, res) => {
  try {
    await Coworker.findByIdAndDelete(req.params.id);
    res.json({ message: "Coworker supprimé." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// QUESTION DU JOUR / CHAT ──

app.get("/api/question", async (req, res) => {
  try {
    const q = await Question.findOne({ active: true }).sort({ createdAt: -1 });
    res.json(q);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post("/api/question", async (req, res) => {
  try {
    await Question.updateMany({}, { active: false });
    const q = new Question({ text: req.body.text, mode: req.body.mode || "question" });
    await q.save();
    io.emit("question-updated", q);
    res.json(q);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.patch("/api/question/:id", async (req, res) => {
  try {
    const q = await Question.findByIdAndUpdate(req.params.id, req.body, { new: true });
    io.emit("question-updated", q);
    res.json(q);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// ALERTE PRIORITAIRE 

app.get("/api/alert", async (req, res) => {
  try {
    const alert = await Alert.findOne({ active: true });
    res.json(alert);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.post("/api/alert", async (req, res) => {
  try {
    await Alert.updateMany({}, { active: false });
    const alert = new Alert({ message: req.body.message, active: true });
    await alert.save();
    io.emit("alert", alert);
    res.json(alert);
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

app.delete("/api/alert", async (req, res) => {
  try {
    await Alert.updateMany({}, { active: false });
    io.emit("alert-cleared");
    res.json({ message: "Alerte désactivée." });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// LOOP STATUS 

app.get("/api/loop/status", async (req, res) => {
  try {
    const posts = await Post.countDocuments({ status: "approved" });
    const medias = await Media.countDocuments();
    const coworkers = await Coworker.countDocuments();
    const alert = await Alert.findOne({ active: true });
    const question = await Question.findOne({ active: true });
    res.json({ posts, medias, coworkers, alert, question });
  } catch (err) { res.status(500).json({ message: "Erreur serveur." }); }
});

// SOCKET.IO 

io.on("connection", (socket) => {
  console.log("🔌 Client connecté:", socket.id);
  socket.on("disconnect", () => console.log("🔌 Client déconnecté:", socket.id));
});

server.listen(PORT, () => console.log(`🚀 Serveur sur http://localhost:${PORT}`));
