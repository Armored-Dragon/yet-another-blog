const validate = require("./form_validation");
const core = require("./core");
const settings = require("../settings");

async function registerUser(username, password) {
  const registration_allowed = await settings.userRegistrationAllowed(); // Check if user registration is allowed
  const form_valid = await validate.userRegistration(username, password); // Check form for errors

  const is_setup_complete = await settings.setupComplete();
  let role = is_setup_complete ? "ADMIN" : null;

  // Register the user in the database
  if (registration_allowed && form_valid.success) return await core.registerUser(username, password, { role: role });

  // Something went wrong!
  return { success: false, message: form_valid.message };
}

async function loginUser(username, password) {
  const user = await validate.userLogin(username);
  if (!user.success) return user;

  return { success: true, data: { username: user.data.username, id: user.data.id, password: user.data.password } };
}

async function getUser({ id, username } = {}) {
  let user;
  if (id) user = await core.getUser({ id: id });
  else if (username) user = await core.getUser({ username: username });

  // Make sure we only get important identifier and nothing sensitive!
  if (user.success) return { success: true, data: { username: user.data.username, id: user.data.id, role: user.data.role } };

  return { success: false, message: "No user found" };
}

module.exports = { registerUser, loginUser, getUser };
