const validate = require("./form_validation");
const core = require("./core");

async function registerUser(username, password) {
  const registration_allowed = validate.registration(); // Check if user registration is allowed
  const form_valid = await validate.userRegistration(username, password); // Check form for errors

  // Register the user in the database
  if (registration_allowed && form_valid.success) return await core.registerUser(username, password);

  // Something went wrong!
  return { success: false, message: form_valid.message };
}

async function loginUser(username, password) {
  const user = await validate.userLogin(username);
  if (!user.success) return user;

  return { success: true, data: { username: user.data.username, id: user.data.id, password: user.data.password } };
}

module.exports = { registerUser, loginUser };
