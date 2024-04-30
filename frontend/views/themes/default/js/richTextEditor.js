const rich_text_editors = qsa(".rich-text-editor");
let media = [];

function textareaAction(textarea, insert, cursor_position, dual_side = false) {
  textarea = textarea.querySelector("textarea");
  const selectionStart = textarea.selectionStart;
  const selectionEnd = textarea.selectionEnd;

  const textBefore = textarea.value.substring(0, selectionStart);
  const textAfter = textarea.value.substring(selectionEnd);
  const selectedText = textarea.value.substring(selectionStart, selectionEnd);

  let updatedText;

  if (dual_side) updatedText = `${textBefore}${insert}${selectedText}${insert}${textAfter}`;
  else updatedText = `${textBefore}${insert}${selectedText}${textAfter}`;

  textarea.value = updatedText;

  // Set the cursor position after the custom string
  textarea.focus();
  const newPosition = selectionStart + (cursor_position || insert.length);
  textarea.setSelectionRange(newPosition, newPosition);
}

// Go though rich editors and apply image uploading script
rich_text_editors.forEach((editor) => {
  editor.querySelector("#insert-sidebyside").addEventListener("click", () => textareaAction(editor, "{sidebyside}{/sidebyside}", 12));
  editor.querySelector("#insert-video").addEventListener("click", () => textareaAction(editor, "{video:}", 7));
  editor.querySelector("#insert-h1").addEventListener("click", () => textareaAction(editor, "# "));
  editor.querySelector("#insert-h2").addEventListener("click", () => textareaAction(editor, "## "));
  editor.querySelector("#insert-h3").addEventListener("click", () => textareaAction(editor, "### "));
  editor.querySelector("#insert-h4").addEventListener("click", () => textareaAction(editor, "#### "));
  editor.querySelector("#insert-underline").addEventListener("click", () => textareaAction(editor, "_", undefined, true));
  editor.querySelector("#insert-italics").addEventListener("click", () => textareaAction(editor, "*", undefined, true));
  editor.querySelector("#insert-bold").addEventListener("click", () => textareaAction(editor, "__", undefined, true));
  editor.querySelector("#insert-strike").addEventListener("click", () => textareaAction(editor, "~~", undefined, true));
  editor.querySelector("#insert-sup").addEventListener("click", () => textareaAction(editor, "^", undefined, true));

  editor.addEventListener("drop", async (event) => {
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
        content_type: image_object.content_type,
        post_id: window.location.href.split("/")[4],
        parent_type: "posts",
      };

      const image_uploading_request = await request("/api/web/image", "POST", form_data);

      if (image_uploading_request.status == 200) {
        textareaAction(editor, `{image:${image_uploading_request.body}}`);
        media.push(image_uploading_request.body);
      }
    }
  });

  let textarea = editor.querySelector("textarea");
  textarea.addEventListener("input", (e) => {
    textarea.style.height = textarea.scrollHeight + "px";
    textarea.style.minHeight = e.target.scrollHeight + "px";
  });

  // Auto resize on page load
  textarea.style.height = textarea.scrollHeight + "px";
  textarea.style.minHeight = textarea.scrollHeight + "px";
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

async function updateBiography() {
  let form_data = {
    media: media,
    content: qs("#post-content").value,
    id: window.location.href.split("/")[4],
  };

  const post_response = await request("/api/web/biography", "PATCH", form_data);

  if (post_response.body.success) {
    window.location.href = `/post/${post_response.body.post_id}`;
  }
}
