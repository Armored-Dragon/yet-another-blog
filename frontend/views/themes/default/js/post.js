let post_id = window.location.href.split("/")[4];

async function deletePost() {
  const post_response = await request("/api/web/post", "DELETE", { id: post_id });
}
function editPost() {}
