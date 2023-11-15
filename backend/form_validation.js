const core = require("./core/core");

async function registerUser(username, password) {
  if (!username) return { success: false, message: "No username provided" };
  if (!password) return { success: false, message: "No password provided" };
  if (password.length < core.settings["USER_MINIMUM_PASSWORD_LENGTH"]) return { success: false, message: "Password not long enough" };

  // Check if username only uses URL safe characters
  if (!_isUrlSafe(username)) return { success: false, message: "Username is not URL safe" };

  // All good! Validation complete
  return { success: true };
}

async function postBlog(blog_object) {
  // TODO: Validate blog posts before upload
  // Check title length
  // Check description length
  // Check content length
  // Check valid date
  // Return formatted object

  // Get the publish date in a standard format
  const [year, month, day] = blog_object.date.split("-");
  const [hour, minute] = blog_object.time.split(":");
  let publish_date = new Date(year, month - 1, day, hour, minute);

  // Format our data to save
  let blog_post_formatted = {
    title: blog_object.title,
    description: blog_object.description,
    content: blog_object.content,
    visibility: blog_object.visibility,
    publish_date: publish_date,
  };

  return { success: true, data: blog_post_formatted };
}

function _isUrlSafe(str) {
  const pattern = /^[A-Za-z0-9\-_.~]+$/;
  return pattern.test(str);
}

module.exports = { registerUser, postBlog };
