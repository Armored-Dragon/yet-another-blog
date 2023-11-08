const settings = require("../settings");

async function userRegistration(username, password) {
  const active_settings = settings.getSettings();
  if (!username) return { success: false, message: "No username provided" };
  if (!password) return { success: false, message: "No password provided" };
  if (password.length < active_settings.USER_MINIMUM_PASSWORD_LENGTH) return { success: false, message: "Password not long enough" };

  // Check if username only uses URL safe characters
  if (!_isUrlSafe(username)) return { success: false, message: "Username is not URL safe" };

  // All good! Validation complete
  return { success: true };
}

async function blogPost(blog_object) {
  // TODO: Validate blog posts before upload
  // Check title length
  // Check description length
  // Check content length
  // Check valid date
}

function _isUrlSafe(str) {
  const pattern = /^[A-Za-z0-9\-_.~]+$/;
  return pattern.test(str);
}

module.exports = { userRegistration };
