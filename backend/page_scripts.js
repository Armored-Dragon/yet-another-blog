const internal = require("./core/internal_api");
const bcrypt = require("bcrypt");
const persistent_setting = require("node-persist");
persistent_setting.init({ dir: "data/" });

async function index(request, response) {
  // Check if the master admin has been created
  const is_setup_complete = (await persistent_setting.getItem("SETUP_COMPLETE")) || false;
  if (!is_setup_complete) return response.redirect("/register");

  response.render("index.ejs", { website_name: process.env.WEBSITE_NAME });
}

function register(request, response) {
  response.render("register.ejs", { website_name: process.env.WEBSITE_NAME });
}
function login(request, response) {
  response.render("login.ejs", { website_name: process.env.WEBSITE_NAME });
}

async function registerPost(request, response) {
  const hashedPassword = await bcrypt.hash(request.body.password, 10); // Hash the password for security :^)
  response.json(await internal.registerUser(request.body.username, hashedPassword));
}
async function loginPost(request, response) {
  const login = await internal.loginUser(request.body.username, request.body.password);

  const password_match = await bcrypt.compare(request.body.password, login.data.password);
  if (!password_match) return { success: false, message: "Incorrect password" };

  request.session.user = { username: login.data.username, id: login.data.id };
  response.json({ success: true });
}
module.exports = { index, register, login, registerPost, loginPost };
