const core = require("./core");
const bcrypt = require("bcrypt");
const validate = require("../form_validation");

async function postRegister(req, res) {
  const { username, password } = req.body; // Get the username and password from the request body

  const form_validation = await validate.registerUser(username, password); // Check form for errors

  // User registration disabled?
  // We also check if the server was setup. If it was not set up, the server will proceed anyways.
  if (!core.settings["ACCOUNT_REGISTRATION"] && core.settings["SETUP_COMPLETE"])
    return res.json({ success: false, message: "Account registrations are disabled" });

  // User data valid?
  if (!form_validation.success) return res.json({ success: false, message: form_validation.message });

  // If setup incomplete, set the user role to Admin. This is the initial user so it will be the master user.
  const role = core.settings["SETUP_COMPLETE"] ? undefined : "ADMIN";

  const hashed_password = await bcrypt.hash(password, 10); // Hash the password for security :^)
  res.json(await core.registerUser(username, hashed_password, { role: role }));
}
async function postLogin(req, res) {
  const { username, password } = req.body; // Get the username and password from the request body

  // Get the user by username
  const existing_user = await core.getUser({ username: username });
  if (!existing_user.success) return res.json({ success: false, message: existing_user.message });

  // Check the password
  const password_match = await bcrypt.compare(password, existing_user.data.password);
  if (!password_match) return res.json({ success: false, message: "Incorrect password" });

  // Send the cookies to the user & return successful
  req.session.user = { username: username, id: existing_user.data.id };
  res.json({ success: true });
}
async function postSetting(request, response) {
  const user = await core.getUser({ id: request.session.user.id });

  // TODO: Permissions for changing settings
  if (!user.success) return response.json({ success: false, message: user.message });
  if (user.data.role !== "ADMIN") return response.json({ success: false, message: "User is not permitted" });

  response.json(await core.postSetting(request.body.setting_name, request.body.value));
}
async function deleteImage(req, res) {
  // TODO: Permissions for deleting image
  return res.json(await core.deleteImage(req.body, req.session.user.id));
}
async function postBlog(req, res) {
  // Get user
  const user = await core.getUser({ id: req.session.user.id });
  if (!user.success) return user;

  // TODO: Permissions for uploading posts
  // Can user upload?
  // const permissions = await permissions.postBlog(user);

  // TODO: Validation for uploading posts
  // Validate blog info
  const valid = await validate.postBlog(req.body);

  // Upload blog post
  return res.json(await core.postBlog(valid.data, req.session.user.id));
}
async function deleteBlog(req, res) {
  // TODO: Permissions for deleting blog
  return res.json(await core.deleteBlog(req.body.id, req.session.user.id));
}
async function patchBlog(req, res) {
  // TODO: Permissions for updating blog
  return res.json(await core.updateBlog(req.body, req.session.user.id));
}

module.exports = { postRegister, postLogin, postSetting, deleteImage, postBlog, deleteBlog, patchBlog };
