fetch("http://localhost:3000/register", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    email: emailInput.value,
    password: passwordInput.value,
  }),
})
  .then((res) => res.json())
  .then((data) => {
    alert(data.message);

    window.location.href = "login.html";
  });
