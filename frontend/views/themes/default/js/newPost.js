let blog_id = window.location.href.split("/")[4];
const post_content_area = qs("#post-content");
let images = [];

// TODO: Support videos

// Text area custom text editor
qs("#insert-sidebyside").addEventListener("click", () => textareaAction("{sidebyside}{/sidebyside}", 12));
qs("#insert-video").addEventListener("click", () => textareaAction("{video:}", 7));
qs("#insert-h1").addEventListener("click", () => textareaAction("# "));
qs("#insert-h2").addEventListener("click", () => textareaAction("## "));
qs("#insert-h3").addEventListener("click", () => textareaAction("### "));
qs("#insert-h4").addEventListener("click", () => textareaAction("#### "));
qs("#insert-underline").addEventListener("click", () => textareaAction("_", undefined, true));
qs("#insert-italics").addEventListener("click", () => textareaAction("*", undefined, true));
qs("#insert-bold").addEventListener("click", () => textareaAction("__", undefined, true));
qs("#insert-strike").addEventListener("click", () => textareaAction("~~", undefined, true));
qs("#insert-sup").addEventListener("click", () => textareaAction("^", undefined, true));

function textareaAction(insert, cursor_position, dual_side) {
  // Insert the custom string at the cursor position
  const selectionStart = post_content_area.selectionStart;
  const selectionEnd = post_content_area.selectionEnd;

  const textBefore = post_content_area.value.substring(0, selectionStart);
  const textAfter = post_content_area.value.substring(selectionEnd);
  const selectedText = post_content_area.value.substring(selectionStart, selectionEnd);

  let updatedText;

  if (dual_side) updatedText = `${textBefore}${insert}${selectedText}${insert}${textAfter}`;
  else updatedText = `${textBefore}${insert}${selectedText}${textAfter}`;

  post_content_area.value = updatedText;

  // Set the cursor position after the custom string
  post_content_area.focus();
  const newPosition = selectionStart + (cursor_position || insert.length);
  post_content_area.setSelectionRange(newPosition, newPosition);
}

// Upload an image to the blog post
post_content_area.addEventListener("drop", async (event) => {
  event.preventDefault();
  const files = event.dataTransfer.files;
  // let image_queue = [];

  for (let i = 0; i < files.length; i++) {
    // Each dropped image will be stored in this formatted object
    const image_object = {
      data_blob: new Blob([await files[i].arrayBuffer()]),
      content_type: files[i].type,
    };
    let form_data = {
      buffer: await _readFile(image_object.data_blob),
      post_id: blog_id,
    };

    const image_uploading_request = await request("/api/web/image", "POST", form_data);

    if (image_uploading_request.status == 200) {
      textareaAction(`{image:${image_uploading_request.body}}`);
      images.push(image_uploading_request.body);
    }
  }
});

// We need to read the file contents in order to convert it to base64 to send to the server
function _readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function publish() {
  let form_data = {
    title: qs("#post-title").value,
    description: qs("#post-description").value,
    tags: [],
    images: images,
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

// Auto resize on page load
post_content_area.style.height = post_content_area.scrollHeight + "px";
post_content_area.style.minHeight = post_content_area.scrollHeight + "px";
// Auto expand blog area
post_content_area.addEventListener("input", (e) => {
  post_content_area.style.height = post_content_area.scrollHeight + "px";
  post_content_area.style.minHeight = e.target.scrollHeight + "px";
});
