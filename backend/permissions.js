//
// Permissions
//
// Check if a given user has permissions to preform an action
//

// Updating a blog post
function patchPost(post_content, user) {
  // Admins can always update any post
  if (user.role === "ADMIN") return _r(true);

  // User owns the post
  if (post_content.owner.id === user.id) return _r(true);

  // User is not permitted
  return _r(false, "User is not permitted to preform action.");
}
function patchBiography(biography, user) {
  // Biographies are just fancy posts right now.
  return patchPost(biography, user);
}

function _r(s, m, d) {
  return { success: s, message: m ? m || "Unknown error" : undefined, data: d };
}
module.exports = { patchPost, patchBiography };
