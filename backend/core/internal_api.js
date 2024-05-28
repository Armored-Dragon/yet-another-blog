const core = require("./core");
const bcrypt = require("bcrypt");
const validate = require("../form_validation");

async function postRegister(req, res) {
	const { username, password } = req.body; // Get the username and password from the request body

	const form_validation = await validate.newUser({ username: username, password: password }); // Check form for errors

	// User registration disabled?
	// We also check if the server was setup. If it was not set up, the server will proceed anyways.
	if (!core.settings["ACCOUNT_REGISTRATION"] && core.settings["SETUP_COMPLETE"]) return res.json({ success: false, message: "Account registrations are disabled" });

	// User data valid?
	if (!form_validation.success) return res.json({ success: false, message: form_validation.message });

	// If setup incomplete, set the user role to Admin. This is the initial user so it will be the master user.
	const role = core.settings["SETUP_COMPLETE"] ? undefined : "ADMIN";

	const hashed_password = await bcrypt.hash(password, 10); // Hash the password for security :^)
	res.json(await core.newUser({ username: username, password: hashed_password, role: role }));
}
async function postLogin(req, res) {
	const { username, password } = req.body; // Get the username and password from the request body

	// Get the user by username
	const existing_user = await core.getUser({ username: username, include_password: true });
	if (!existing_user.success) return res.json({ success: false, message: existing_user.message });

	// Check the password
	const password_match = await bcrypt.compare(password, existing_user.data.password);
	if (!password_match) return res.json({ success: false, message: "Incorrect password" });

	// Send the cookies to the user & return successful
	req.session.user = { username: username, id: existing_user.data.id };
	res.json({ success: true });
}
async function postSetting(request, response) {
	const user = await core.getUser({ user_id: request.session.user.id });

	if (!user.success) return response.json({ success: false, message: user.message });
	if (user.data.role !== "ADMIN") return response.json({ success: false, message: "User is not permitted" });

	response.json(await core.postSetting(request.body.setting_name, request.body.value));
}
async function postImage(request, response) {
	// TODO: Permissions for uploading images
	// TODO: Verification for image uploading
	return response.json(await core.uploadMedia({ parent_id: request.body.post_id, parent_type: request.body.parent_type, file_buffer: request.body.buffer, content_type: request.body.content_type }));
}
async function deleteImage(req, res) {
	// TODO: Permissions for deleting image
	return res.json(await core.deleteImage(req.body, req.session.user.id));
}
async function deleteBlog(req, res) {
	// TODO: Permissions for deleting blog
	return res.json(await core.deletePost({ post_id: req.body.id, requester_id: req.session.user.id }));
}
async function patchBlog(req, res) {
	return res.json(await core.editPost({ requester_id: req.session.user.id, post_id: req.body.id, post_content: req.body }));
}
async function patchBiography(request, response) {
	// TODO: Validate
	return response.json(await core.updateBiography({ requester_id: request.session.user.id, author_id: request.body.id, biography_content: request.body }));
}
async function patchUser(request, response) {
	return response.json(await core.editUser({ requester_id: request.session.user.id, user_id: request.body.id, user_content: request.body }));
}
async function postTheme(request, response) {
	return response.json(await core.installTheme(request.body.url, { requester_id: request.session.user.id }));
}
async function deleteTheme(request, response) {
	return response.json(await core.deleteTheme(request.body.name, { requester_id: request.session.user.id }));
}

module.exports = { postRegister, patchBiography, postLogin, postSetting, postImage, deleteImage, deleteBlog, patchBlog, patchUser, postTheme, deleteTheme };
