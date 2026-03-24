fetch("http://localhost:3000/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: emailInput.value,
    password: passwordInput.value,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    if (data.message === "Login success") {
      localStorage.setItem("user", emailInput.value); // 🔥 ICI
      window.location.href = "index.html"; // redirection
    }
  });
