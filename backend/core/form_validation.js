const settings = require("../settings");

async function userRegistration(username, password) {
  if (!username) return { success: false, message: "No username provided" };
  if (!password) return { success: false, message: "No password provided" };
  // TODO: Admin customizable minimum password length
  if (password.length < 4) return { success: false, message: "Password not long enough" };

  // Check if username only uses URL safe characters
  if (!is_url_safe(username)) return { success: false, message: "Username is not URL safe" };

  // All good! Validation complete
  return { success: true };
}

function is_url_safe(str) {
  const pattern = /^[A-Za-z0-9\-_.~]+$/;
  return pattern.test(str);
}

module.exports = { userRegistration };
