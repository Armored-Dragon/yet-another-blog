//
// Form validation
//
// Preform sanity checks on content
// Format given data in an accessible way
//

// Make sure the user registration data is safe and valid.
function newUser({ username, password } = {}) {
  const core = require("./core/core"); // HACK: Need to require the core module here because the settings don't get set otherwise.

  if (!username) return _r(false, "No username provided");
  if (!password) return _r(false, "No password provided");
  if (password.length < core.settings["USER_MINIMUM_PASSWORD_LENGTH"]) return _r(false, `Password is not long enough. Minimum length is ${core.settings["USER_MINIMUM_PASSWORD_LENGTH"]}`);

  // TODO: Method to block special characters
  if (!_isUrlSafe(username)) return _r(false, "Invalid Username. Please only use a-z A-Z 0-9");

  return _r(true);
}

function patchPost(post_content, user, post) {
  let post_formatted = {}; // The formatted post content object that will be returned upon success
  let publish_date; // Time and date the post should be made public
  let tags = []; // An array of tags for the post

  if (!user.success) return _r(false, "User not found");
  if (!post.success) return _r(false, "Post not found");

  // Get the publish date in a standard format
  const [year, month, day] = post_content.date.split("-");
  const [hour, minute] = post_content.time.split(":");
  publish_date = new Date(year, month - 1, day, hour, minute);

  // Go though tags list, and turn into a pretty array
  post_content.tags.forEach((tag) => {
    // Trimmed
    tag = tag.trim();

    // Lowercase
    tag = tag.toLowerCase();

    // Non-empty
    if (tag.length !== 0) tags.push(tag);
  });

  delete post_content.date;
  delete post_content.time;

  // Format the post content
  post_formatted = {
    // Autofill the given data
    ...post_content,

    // Update tags to our pretty array
    tags: tags,

    // Update date
    publish_date: publish_date,
  };

  return _r(true, null, { post_formatted: post_formatted, user: user.data, post: post.data });
}

function patchBiography(biography_content, user, biography) {
  if (!user.success) return _r(false, "User not found");
  if (!biography.success) return _r(false, "Post not found");

  return _r(true, null, { biography_content: biography_content, user: user.data, biography: biography.data });
}

//  Helper functions --------------------
function _isUrlSafe(str) {
  const pattern = /^[A-Za-z0-9\-_.~]+$/;
  return pattern.test(str);
}
function _r(s, m, d) {
  return { success: s, message: m ? m || "Unknown error" : undefined, data: d };
}

module.exports = { newUser, patchPost, patchBiography };
