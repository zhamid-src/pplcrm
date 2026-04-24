async function run() {
  const loginRes = await fetch("http://localhost:3000/trpc/auth.login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "zee@peoplecrm.com", password: "password" })
  });
  console.log("Login status:", loginRes.status);
  
  // if this doesn't work, we don't have the password, we can't test via HTTP.
}
run();
