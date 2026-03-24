const express = require("express");
const app = express();

app.use(express.json()); // pour lire le JSON

app.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});

app.get("/photos", (req, res) => {
  res.json([
    { id: 1, liked: false },
    { id: 2, liked: true },
  ]);
});

app.post("/like", (req, res) => {
  const { id } = req.body;

  console.log("Photo likée:", id);

  res.json({ success: true });
});
