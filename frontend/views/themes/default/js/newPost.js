let blog_id = window.location.href.split("/")[4];

async function publish(visibility) {
  let form_data = {
    title: qs("#post-title").value,
    description: qs("#post-description").value,
    tags: [],
    media: media,
    visibility: visibility,
    content: qs("#post-content").value,
    date: qs("#date").value,
    time: qs("#time").value,
    id: blog_id,
  };

  // Get our tags, trim them, then shove them into an array
  const tags_value = qs("#post-tags").value || "";
  if (tags_value.length) {
    let tags_array = qs("#post-tags").value.split(",");
    tags_array.forEach((tag) => form_data.tags.push(tag.trim()));
  }
  const post_response = await request("/api/web/post", "PATCH", form_data);

  if (post_response.body.success) {
    window.location.href = `/post/${post_response.body.post_id}`;
  }
}
