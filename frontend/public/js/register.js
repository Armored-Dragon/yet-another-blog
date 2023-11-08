async function requestRegister() {
  const account_information = {
    username: qs("#username").value,
    password: qs("#password").value,
  };

  const account_response = await request("/register", "POST", account_information);

  // Check response for errors

  // If success, return to account
  console.log(account_response);

  if (account_response.body.success) {
    location.href = "/login";
  }
}
