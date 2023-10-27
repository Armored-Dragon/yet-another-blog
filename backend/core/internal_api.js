const validate = require("./form_validation");
const core = require("./core");
const settings = require("../settings");

async function registerUser(username, password) {
  // Get current and relevant settings
  const s = Promise.all([settings.act("ACCOUNT_REGISTRATION"), settings.act("SETUP_COMPLETE")]);
  const form_valid = await validate.userRegistration(username, password); // Check form for errors

  // Set variables for easy reading
  const registration_allowed = s[0];
  const setup_complete = s[1];

  if (!registration_allowed && setup_complete) return { success: false, message: "Registration is disabled" }; // Registration disabled
  if (!form_valid.success) return form_valid; // Registration details did not validate

  // Does a user using that username exist already?
  const existing_user = await core.getUser({ username: username });
  if (existing_user.success) return { success: false, message: "Username is taken" };

  // Register the user in the database
  const role = setup_complete ? undefined : "ADMIN";
  const registration_status = await core.registerUser(username, password, { role: role });

  if (registration_status.success) return registration_status;
  else return registration_status;
}

async function loginUser(username, password) {
  // Get the user by username
  const existing_user = await core.getUser({ username: username });

  // Check for errors or problems
  if (!existing_user.success) return { success: false, message: "User does not exist" };
  if (existing_user.role === "LOCKED") return { success: false, message: "Account is locked: Contact your administrator" };
  return { success: true, data: { username: existing_user.data.username, id: existing_user.data.id, password: existing_user.data.password } };
}

module.exports = { registerUser, loginUser };
