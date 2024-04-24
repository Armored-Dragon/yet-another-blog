const external = require("./core/external_api");
const core = require("./core/core");

function getThemePage(page_name) {
  return `themes/${core.settings.theme}/ejs/${page_name}.ejs`;
}
function getDefaults(req) {
  // TODO: Fix reference to website_name
  return { logged_in_user: req.session.user, website_name: core.settings.WEBSITE_NAME || "Yet-Another-Blog", settings: core.settings };
}
async function index(request, response) {
  // Check if the master admin has been created
  // const is_setup_complete = core.settings["SETUP_COMPLETE"];
  // if (!is_setup_complete) return response.redirect("/register");

  const blog_list = await core.getPost({ requester_id: request.session.user?.id }, {}, { page: request.query.page || 0 });
  const tags = await core.getTags();

  blog_list.data.forEach((post) => {
    let published_date_parts = new Date(post.publish_date).toLocaleDateString().split("/");
    const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
    post.publish_date = formatted_date;
  });

  response.render(getThemePage("index"), {
    ...getDefaults(request),
    blog_list: blog_list.data,
    pagination: blog_list.pagination,
    current_page: request.query.page || 0,
    loaded_page: request.path,
    tags: tags,
  });
}
function register(request, response) {
  response.render(getThemePage("register"), getDefaults(request));
}
function login(request, response) {
  response.render(getThemePage("login"), getDefaults(request));
}
async function author(req, res) {
  const user = await core.getUser({ user_id: req.params.author_id });
  // FIXME: Bandage fix for author get error
  if (!user.success) return res.redirect("/");
  const profile = await core.getBiography({ author_id: user.data.id });
  // TODO: Check for success
  // const posts = await core.getBlog({ owner_id: user.data.id, raw: true });
  const posts = await core.getPost({ requester_id: user.data.id });

  res.render(getThemePage("author"), { ...getDefaults(req), post: { ...profile.data, post_count: posts.data.length } });
}
async function authorEdit(request, response) {
  let author = await core.getBiography({ author_id: request.params.author_id });
  if (!author.success) return response.redirect("/");
  response.render(getThemePage("authorEdit"), { ...getDefaults(request), profile: author.data });
}
async function blogList(req, res) {
  const blog_list = await core.getPost({ requester_id: req.session.user?.id }, { search: req.query.search, search_title: true, search_tags: true, search_content: true });

  blog_list.data.forEach((post) => {
    let published_date_parts = new Date(post.publish_date).toLocaleDateString().split("/");
    const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
    post.publish_date = formatted_date;
  });

  res.render(getThemePage("postSearch"), {
    ...getDefaults(req),
    blog_list: blog_list.data,
    pagination: blog_list.pagination,
    current_page: req.query.page || 0,
    loaded_page: req.path,
  });
}
async function blogSingle(req, res) {
  const blog = await core.getPost({ post_id: req.params.blog_id });
  if (blog.success === false) return res.redirect("/");
  res.render(getThemePage("post"), { ...getDefaults(req), blog_post: blog.data });
}
async function blogNew(request, response) {
  const new_post = await core.newPost({ requester_id: request.session.user.id });
  return response.redirect(`/post/${new_post}/edit`);
}
async function blogEdit(req, res) {
  let existing_blog = await core.getPost({ post_id: req.params.blog_id });
  if (existing_blog.success) existing_blog = existing_blog.data; // FIXME: Quickfix for .success/.data issue

  let published_time_parts = new Date(existing_blog.publish_date).toLocaleTimeString([], { timeStyle: "short" }).slice(0, 4).split(":");
  const formatted_time = `${published_time_parts[0].padStart(2, "0")}:${published_time_parts[1].padStart(2, "0")}`;
  existing_blog.publish_time = formatted_time;

  let published_date_parts = new Date(existing_blog.publish_date).toLocaleDateString().split("/");
  const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
  existing_blog.publish_date = formatted_date;

  res.render(getThemePage("postNew"), { ...getDefaults(req), existing_blog: existing_blog });
}
async function admin(request, response) {
  response.render(getThemePage("admin-settings"), { ...getDefaults(request) });
}
async function atom(req, res) {
  res.type("application/xml");
  res.send(await external.getFeed({ type: "atom" }));
}
async function jsonFeed(req, res) {
  res.type("application/json");
  res.send(await external.getFeed({ type: "json" }));
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
  jsonFeed,
  authorEdit,
};
