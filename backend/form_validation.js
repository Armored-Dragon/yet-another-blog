//
// Form validation
//
// Preform sanity checks on content
// Format given data in an accessible way
//

const core = require("./core/core");

// Make sure the user registration data is safe and valid.
function newUser({ username, password } = {}) {
  if (!username) return _r(false, "No username provided");
  if (!password) return _r(false, "No password provided");
  if (password.length < core.settings["USER_MINIMUM_PASSWORD_LENGTH"]) return _r(false, `Password is not long enough. Minimum length is ${core.settings["USER_MINIMUM_PASSWORD_LENGTH"]}`);

  // TODO: Method to block special characters
  if (!_isUrlSafe(username)) return _r(false, "Invalid Username. Please only use a-z A-Z 0-9");

  return _r(true);
}

function patchPost(post_content) {
  let post_formatted = {}; // The formatted post content object that will be returned upon success
  let publish_date; // Time and date the post should be made public
  let tags = []; // An array of tags for the post

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

  return _r(true, null, post_formatted);
}

//  Helper functions --------------------
function _isUrlSafe(str) {
  const pattern = /^[A-Za-z0-9\-_.~]+$/;
  return pattern.test(str);
}
function _r(s, m, d) {
  return { success: s, message: m ? m || "Unknown error" : undefined, data: d };
}

module.exports = { newUser, patchPost };
