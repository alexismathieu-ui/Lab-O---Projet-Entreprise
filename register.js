const user = localStorage.getItem("user");

if (user) {
  console.log("Connecté en tant que :", user);

  document.getElementById("userEmail").textContent = user;
}
