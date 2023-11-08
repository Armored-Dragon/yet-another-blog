const internal = require("./core/internal_api");
const external = require("./core/external_api");
const bcrypt = require("bcrypt");
const settings = require("./settings");

function getDefaults(req) {
  const active_settings = settings.getSettings();
  return { logged_in_user: req.session.user, website_name: process.env.WEBSITE_NAME, settings: active_settings };
}

async function index(request, response) {
  // Check if the master admin has been created
  const is_setup_complete = (await settings.act("SETUP_COMPLETE")) || false;
  if (!is_setup_complete) return response.redirect("/register");

  response.redirect("/blog");
}
function register(request, response) {
  response.render("register.ejs", getDefaults(request));
}
function login(request, response) {
  response.render("login.ejs", getDefaults(request));
}
function author(request, response) {
  response.render("author.ejs", getDefaults(request));
}
async function blogList(req, res) {
  const blog_list = await internal.getBlogList({ owner_id: req.session.user?.id }, { page: req.query.page || 0 });
  res.render("blogList.ejs", {
    ...getDefaults(req),
    blog_list: blog_list.data,
    pagination: blog_list.pagination,
    current_page: req.query.page || 0,
    loaded_page: req.path,
  });
}
async function blogSingle(req, res) {
  const blog = await internal.getBlogList({ id: req.params.blog_id });
  if (blog === null) return res.redirect("/blog");
  res.render("blogSingle.ejs", { ...getDefaults(req), blog_post: blog });
}
function blogNew(request, response) {
  // TODO: Turn date formatting into function
  let existing_blog = {};
  let published_date_parts = new Date().toLocaleDateString().split("/");
  const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
  existing_blog.publish_date = formatted_date;

  let published_time_parts = new Date().toLocaleTimeString([], { timeStyle: "short" }).slice(0, 4).split(":");
  const formatted_time = `${published_time_parts[0].padStart(2, "0")}:${published_time_parts[1].padStart(2, "0")}`;
  existing_blog.publish_time = formatted_time;

  response.render("blogNew.ejs", { ...getDefaults(request), existing_blog: existing_blog });
}
async function blogEdit(req, res) {
  const existing_blog = await internal.getBlogList({ id: req.params.blog_id, raw: true });

  let published_date_parts = new Date(existing_blog.publish_date).toLocaleDateString().split("/");
  const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
  existing_blog.publish_date = formatted_date;

  let published_time_parts = new Date(existing_blog.publish_date).toLocaleTimeString([], { timeStyle: "short" }).slice(0, 4).split(":");
  const formatted_time = `${published_time_parts[0].padStart(2, "0")}:${published_time_parts[1].padStart(2, "0")}`;
  existing_blog.publish_time = formatted_time;

  res.render("blogNew.ejs", { ...getDefaults(req), existing_blog: existing_blog });
}
async function admin(request, response) {
  response.render("admin.ejs", { ...getDefaults(request) });
}
async function atom(req, res) {
  res.type("application/xml");
  res.send(await external.getFeed({ type: "atom" }));
}
// async function rss(req, res) {
//   res.type("application/rss+xml");
//   res.send(await external.getFeed({ type: "rss" }));
// }

async function registerPost(request, response) {
  const hashedPassword = await bcrypt.hash(request.body.password, 10); // Hash the password for security :^)
  response.json(await internal.registerUser(request.body.username, hashedPassword));
}
async function loginPost(request, response) {
  const login = await internal.loginUser(request.body.username, request.body.password);

  if (!login.success) return response.json(login);

  const password_match = await bcrypt.compare(request.body.password, login.data.password);
  if (!password_match) return response.json({ success: false, message: "Incorrect password" });

  request.session.user = { username: login.data.username, id: login.data.id };
  response.json({ success: true });
}
async function settingPost(request, response) {
  const user = await internal.getUser({ id: request.session.user.id });

  if (!user.success) return response.json({ success: false, message: user.message });
  if (user.data.role !== "ADMIN") return response.json({ success: false, message: "User is not permitted" });

  settings.act(request.body.setting_name, request.body.value);

  response.json({ success: true });
}
async function deleteImage(req, res) {
  res.json(await internal.deleteImage(req.body, req.session.user.id));
}

async function postBlog(req, res) {
  return res.json(await internal.postBlog(req.body, req.session.user.id));
}
async function deleteBlog(req, res) {
  return res.json(await internal.deleteBlog(req.body.id, req.session.user.id));
}
async function updateBlog(req, res) {
  return res.json(await internal.updateBlog(req.body, req.session.user.id));
}
module.exports = {
  index,
  register,
  login,
  author,
  blogList,
  blogNew,
  blogEdit,
  blogSingle,
  admin,
  atom,
  // rss,
  registerPost,
  loginPost,
  settingPost,
  postBlog,
  deleteBlog,
  deleteImage,
  updateBlog,
};
