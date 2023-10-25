const internal = require("./core/internal_api");
const bcrypt = require("bcrypt");
const settings = require("./settings");

async function index(request, response) {
  // Check if the master admin has been created
  const is_setup_complete = (await settings.setupComplete()) || false;
  if (!is_setup_complete) return response.redirect("/register");

  response.render("index.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME });
}
function register(request, response) {
  response.render("register.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME });
}
function login(request, response) {
  response.render("login.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME });
}
function author(request, response) {
  response.render("author.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME });
}
function blogList(request, response) {
  response.render("blogList.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME });
}
function blogNew(request, response) {
  response.render("blogNew.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME });
}
async function admin(request, response) {
  const reg_allowed = await settings.userRegistrationAllowed();
  response.render("admin.ejs", { user: request.session.user || null, website_name: process.env.WEBSITE_NAME, settings: { registration_enabled: reg_allowed } });
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

async function settingPost(request, response) {
  const user = await internal.getUser({ id: request.session.user.id });

  if (!user.success) return response.json({ success: false, message: user.message });
  if (user.data.role !== "ADMIN") return response.json({ success: false, message: "User is not permitted" });

  if (request.body.setting_name === "ACCOUNT_REGISTRATION") settings.setUserRegistrationAllowed(request.body.value);

  response.json({ success: true });
}
module.exports = { index, register, login, author, blogList, blogNew, admin, registerPost, loginPost, settingPost };
