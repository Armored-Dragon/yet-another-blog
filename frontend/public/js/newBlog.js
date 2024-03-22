const blog_id = window.location.href.split("/")[4];

let existing_images = [];
let pending_images = [];
let pending_thumbnail = {};

const thumbnail_area = qs(".e-thumbnail");
const image_area = qs(".e-image-area");
const text_area = qs(".e-content textarea");

// Style
function stylizeDropArea(element) {
  // Drag over start
  element.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.target.classList.add("drag-over");
  });

  // Drag over leave
  element.addEventListener("dragleave", (e) => {
    e.target.classList.remove("drag-over");
  });
  // Do nothing on drop
  element.addEventListener("drop", (e) => {
    e.preventDefault();
  });
}

// Auto resize on page load
text_area.style.height = text_area.scrollHeight + "px";
text_area.style.minHeight = text_area.scrollHeight + "px";

// Auto expand blog area
text_area.addEventListener("input", (e) => {
  text_area.style.height = text_area.scrollHeight + "px";
  text_area.style.minHeight = e.target.scrollHeight + "px";
});

stylizeDropArea(thumbnail_area);
stylizeDropArea(image_area);

// Upload an image to the blog post
image_area.addEventListener("drop", async (e) => {
  const files = e.dataTransfer.files;

  for (let i = 0; i < files.length; i++) {
    // Each dropped image will be stored in this formatted object
    const image_object = {
      id: crypto.randomUUID(),
      data_blob: new Blob([await files[i].arrayBuffer()]),
      content_type: files[i].type,
    };

    // Add the image's data to the list
    pending_images.push(image_object);
  }

  // Update the displayed images
  updateImages();
});

// Upload an image to the blog post
thumbnail_area.addEventListener("drop", async (e) => {
  const file = e.dataTransfer.files[0];

  // The thumbnail will be stored in this formatted object
  const image_object = {
    id: crypto.randomUUID(),
    data_blob: new Blob([await file.arrayBuffer()]),
    content_type: file.type,
  };

  // Add the image's data to the list
  pending_thumbnail = image_object;

  // Update the visible thumbnail
  qs(".e-thumbnail img").src = URL.createObjectURL(image_object.data_blob);

  // Update the displayed images
  updateImages();
});

// Publish or Update a blog post with the new data
async function publishBlog(unlisted, edit) {
  // Format our request we will send to the server
  let form_data = {
    title: qs("#title").value,
    description: qs("#description").value,
    content: qs("#content").value,
    visibility: unlisted ? "UNLISTED" : "PUBLISHED",
    tags: [],
    date: qs("#date").value,
    time: qs("#time").value,
  };

  // Get our tags, trim them, then shove them into an array
  const tags_value = qs("#tags").value || "";
  if (tags_value.length) {
    let tags_array = qs("#tags").value.split(",");
    tags_array.forEach((tag) => form_data.tags.push(tag.trim()));
  }

  // If we have a thumbnail, read the thumbnail image and store it
  if (pending_thumbnail.data_blob) {
    form_data.thumbnail = { ...pending_thumbnail, data_blob: await _readFile(pending_thumbnail.data_blob) };
  }

  // We have images to upload
  if (pending_images.length + existing_images.length > 0) {
    // Initialize the image array
    form_data.images = [];

    // Read the image, convert to base64, update the existing variable with the base64
    for (let i = 0; pending_images.length > i; i++) {
      form_data.images.push({ ...pending_images[i], data_blob: await _readFile(pending_images[i].data_blob) });
    }
  }

  // We are making edits to a post, not uploading a new one
  if (edit) {
    form_data.id = blog_id;
  }

  // Send the request!
  const method = edit ? "PATCH" : "post";

  const res = await request("/api/web/blog", method, form_data);

  if (res.body.success) {
    window.location.href = `/blog/${res.body.blog_id || blog_id}`;
  }
}

// Send a request to delete an image
async function deleteImage(image_id) {
  const res = await request("/api/web/blog/image", "delete", { id: image_id, parent: blog_id, parent_type: "blog" });
  if (res.body.success) {
    // Remove from existing images (If it exists)
    let image = existing_images.find((item) => item.id === image_id);
    if (image) existing_images.splice(existing_images.indexOf(image), 1);

    image = pending_images.find((item) => item.id === image_id);
    if (image) pending_images.splice(pending_images.indexOf(image), 1);

    updateImages();
  }
}

// We need to read the file contents in order to convert it to base64 to send to the server
function _readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;

    reader.readAsDataURL(file);
  });
}

function customDragString() {
  const images = qsa(".e-image-area .image img");

  images.forEach((image) => {
    image.addEventListener("dragstart", (event) => {
      event.dataTransfer.setData("text/plain", event.target.getAttribute("data-image_id"));
    });
  });
}

function updateImages() {
  const image_div = (img_id, img_url) => `<div class="image"><img data-image_id="${img_id}" src="${img_url}" /><div><a onclick="deleteImage('${img_id}')">X</a></div></div>`;

  // Clear existing listings
  qsa(".e-image-area .image").forEach((entry) => entry.remove());

  // Clear placeholder text
  if (existing_images.length + pending_images.length > 0) if (qs(".e-image-area .placeholder")) qs(".e-image-area .placeholder").remove();

  existing_images.forEach((image) => {
    image_area.insertAdjacentHTML("beforeend", image_div(image.id, image.url));
  });

  // Add new entries based on saved list
  pending_images.forEach((image) => {
    image_area.insertAdjacentHTML("beforeend", image_div(image.id, URL.createObjectURL(image.data_blob)));
  });

  customDragString();
}

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
  const selectionStart = text_area.selectionStart;
  const selectionEnd = text_area.selectionEnd;

  const textBefore = text_area.value.substring(0, selectionStart);
  const textAfter = text_area.value.substring(selectionEnd);
  const selectedText = text_area.value.substring(selectionStart, selectionEnd);

  let updatedText;

  if (dual_side) {
    updatedText = `${textBefore}${insert}${selectedText}${insert}${textAfter}`;
  } else {
    updatedText = `${textBefore}${insert}${selectedText}${textAfter}`;
  }

  text_area.value = updatedText;

  // Set the cursor position after the custom string
  qs(".e-content textarea").focus();
  const newPosition = selectionStart + (cursor_position || insert.length);
  text_area.setSelectionRange(newPosition, newPosition);
}

text_area.addEventListener("drop", (event) => {
  event.preventDefault();

  // Get the custom string from the drag data
  const customString = `\{image:${event.dataTransfer.getData("text/plain")}\}\n`;

  // Insert the custom string at the cursor position
  const selectionStart = text_area.selectionStart;
  const selectionEnd = text_area.selectionEnd;

  const textBefore = text_area.value.substring(0, selectionStart);
  const textAfter = text_area.value.substring(selectionEnd);

  const updatedText = textBefore + customString + textAfter;

  text_area.value = updatedText;

  // Set the cursor position after the custom string
  const newPosition = selectionStart + customString.length;
  text_area.setSelectionRange(newPosition, newPosition);
});

// Load the existing images into our existing_images variable
qsa(".e-image-area img").forEach((image) => {
  existing_images.push({ id: image.getAttribute("data-image_id"), url: image.src });
});

updateImages();
