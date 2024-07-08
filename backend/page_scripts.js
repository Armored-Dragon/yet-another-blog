const external = require("./core/external_api");
const core = require("./core/core");
const fs = require("fs");
const path = require("path");

function _getThemePage(page_name) {
	let manifest = require(`../frontend/views/themes/${core.settings.theme}/manifest.json`);
	return `themes/${core.settings.theme}/${manifest.pages[page_name]}`;
}

async function getDefaults(req) {
	// TODO: Fix reference to website_name
	let user;
	if (req.session.user) user = await core.getUser({ user_id: req.session.user.id });
	if (user?.success) user = user.data;
	return { logged_in_user: user, website_name: core.settings.WEBSITE_NAME || "Yet-Another-Blog", settings: core.settings };
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

	response.render(_getThemePage("index"), {
		...(await getDefaults(request)),
		blog_list: blog_list.data,
		pagination: blog_list.pagination,
		current_page: request.query.page || 0,
		loaded_page: request.path,
		tags: tags,
	});
}
async function register(request, response) {
	response.render(_getThemePage("register"), await getDefaults(request));
}
async function login(request, response) {
	response.render(_getThemePage("login"), await getDefaults(request));
}
async function author(req, res) {
	const user = await core.getUser({ user_id: req.params.author_id });
	// FIXME: Bandage fix for author get error
	if (!user.success) return res.redirect("/");
	const profile = await core.getBiography({ author_id: user.data.id });
	// TODO: Check for success
	const posts = await core.getPost({ requester_id: user.data.id });

	res.render(_getThemePage("author"), { ...(await getDefaults(req)), post: { ...profile.data, post_count: posts.data.length } });
}
async function authorEdit(request, response) {
	let author = await core.getBiography({ author_id: request.params.author_id });
	if (!author.success) return response.redirect("/");
	response.render(_getThemePage("authorEdit"), { ...(await getDefaults(request)), profile: author.data });
}
async function blogList(req, res) {
	const blog_list = await core.getPost({ requester_id: req.session.user?.id }, { search: req.query.search, search_title: true, search_tags: true, search_content: true });

	blog_list.data.forEach((post) => {
		let published_date_parts = new Date(post.publish_date).toLocaleDateString().split("/");
		const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
		post.publish_date = formatted_date;
	});

	res.render(_getThemePage("postSearch"), {
		...(await getDefaults(req)),
		blog_list: blog_list.data,
		pagination: blog_list.pagination,
		current_page: req.query.page || 0,
		loaded_page: req.path,
	});
}
async function blogSingle(req, res) {
	const blog = await core.getPost({ requester_id: req.session.user?.id, post_id: req.params.blog_id });
	if (blog.success === false) return res.redirect("/");
	res.render(_getThemePage("post"), { ...(await getDefaults(req)), blog_post: blog.data });
}
async function blogNew(request, response) {
	const new_post = await core.newPost({ requester_id: request.session.user.id });
	return response.redirect(`/post/${new_post}/edit`);
}
async function blogEdit(req, res) {
	let existing_blog = await core.getPost({ post_id: req.params.blog_id });
	if (!existing_blog.success) return res.redirect("/");
	existing_blog = existing_blog.data;

	let published_time_parts = new Date(existing_blog.publish_date).toLocaleTimeString([], { timeStyle: "short" }).slice(0, 4).split(":");
	const formatted_time = `${published_time_parts[0].padStart(2, "0")}:${published_time_parts[1].padStart(2, "0")}`;
	existing_blog.publish_time = formatted_time;

	let published_date_parts = new Date(existing_blog.publish_date).toLocaleDateString().split("/");
	const formatted_date = `${published_date_parts[2]}-${published_date_parts[0].padStart(2, "0")}-${published_date_parts[1].padStart(2, "0")}`;
	existing_blog.publish_date = formatted_date;

	res.render(_getThemePage("postNew"), { ...(await getDefaults(req)), existing_blog: existing_blog });
}
async function admin(request, response) {
	let theme_data = {
		installed: [],
		current: core.settings.theme,
	};

	// Get theme list
	fs.readdir(path.resolve(__dirname, "../frontend/views/themes"), (err, files) => {
		files.forEach((theme) => theme_data.installed.push(theme));
	});

	response.render(_getThemePage("admin-settings"), { ...(await getDefaults(request)), theme_data: theme_data });
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
