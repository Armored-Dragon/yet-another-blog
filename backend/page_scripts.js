const external = require("./core/external_api");
const core = require("./core/core");

function getDefaults(req) {
  // TODO: Fix reference to website_name
  return { logged_in_user: req.session.user, website_name: core.settings.WEBSITE_NAME || "Yet-Another-Blog", settings: core.settings };
}

async function index(request, response) {
  // Check if the master admin has been created

  const is_setup_complete = core.settings["SETUP_COMPLETE"];
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
  const blog_list = await core.getBlogList({ owner_id: req.session.user?.id, page: req.query.page || 0 });
  res.render("blogList.ejs", {
    ...getDefaults(req),
    blog_list: blog_list.data,
    pagination: blog_list.pagination,
    current_page: req.query.page || 0,
    loaded_page: req.path,
  });
}
async function blogSingle(req, res) {
  const blog = await core.getBlogList({ id: req.params.blog_id });
  if (blog.success === false) return res.redirect("/blog");
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
  const existing_blog = await core.getBlogList({ id: req.params.blog_id, raw: true });

  let published_time_parts = new Date(existing_blog.publish_date).toLocaleTimeString([], { timeStyle: "short" }).slice(0, 4).split(":");
  const formatted_time = `${published_time_parts[0].padStart(2, "0")}:${published_time_parts[1].padStart(2, "0")}`;
  existing_blog.publish_time = formatted_time;

  let published_date_parts = new Date(existing_blog.publish_date).toLocaleDateString().split("/");
  const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
  existing_blog.publish_date = formatted_date;

  res.render("blogNew.ejs", { ...getDefaults(req), existing_blog: existing_blog });
}
async function admin(request, response) {
  response.render("admin.ejs", { ...getDefaults(request) });
}
async function atom(req, res) {
  res.type("application/xml");
  res.send(await external.getFeed({ type: "atom" }));
}

// Internal API ------------------------------

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
};
