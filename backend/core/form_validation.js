const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const core = require("./core");

// Check if user registration is allowed via the settings
function registration() {
  return true;
}

async function userRegistration(username, password) {
  if (!username) return { success: false, message: "No username provided" };
  if (!password) return { success: false, message: "No password provided" };
  // TODO: Admin customizable minimum password length
  if (password.length < 4) return { success: false, message: "Password not long enough" };

  const existing_user = await core.getUser({ username: username });

  if (existing_user.success) return { success: false, message: "Username already exists" };

  return { success: true };
}

async function userLogin(username, password) {
  const existing_user = await core.getUser({ username: username });

  if (!existing_user.success) return { success: false, message: "User does not exist" };
  if (existing_user.role === "LOCKED") return { success: false, message: "Account is locked: Contact your administrator" };

  return { success: true, data: existing_user.data };
}

module.exports = { registration, userRegistration, userLogin };
