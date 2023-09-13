async function requestRegister() {
  const account_information = {
    username: qs("#username").value,
    password: qs("#password").value,
  };

  const form = new FormData();
  form.append("username", account_information.username);
  form.append("password", account_information.password);

  const account_response = await request("/register", "POST", form);

  // Check response for errors

  // If success, return to account
  console.log(account_response);

  if (account_response.body.success) {
    location.href = "/login";
  }
}
