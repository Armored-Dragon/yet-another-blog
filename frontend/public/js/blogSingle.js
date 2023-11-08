const delete_post_btn = qs("#delete-post");

if (delete_post_btn) {
  delete_post_btn.addEventListener("click", async () => {
    let req = await request("/api/web/blog", "DELETE", { id: window.location.href.split("/")[4] });
    if (req.body.success) location.reload();
  });
}
