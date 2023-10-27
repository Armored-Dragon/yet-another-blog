let content_images = []; // List of all images to upload

const image_drop_area = qs(".e-image-area");

// Stylize the drop area
image_drop_area.addEventListener("dragover", (event) => {
  event.preventDefault();
  image_drop_area.style.border = "2px dashed #333";
});
image_drop_area.addEventListener("dragleave", () => {
  image_drop_area.style.border = "2px dashed #ccc";
});

image_drop_area.addEventListener("drop", async (e) => {
  e.preventDefault();
  image_drop_area.style.border = "2px dashed #ccc";

  const files = e.dataTransfer.files;

  for (let i = 0; i < files.length; i++) {
    let image_object = { id: crypto.randomUUID(), data_blob: new Blob([await files[i].arrayBuffer()]) };
    content_images.push(image_object);
  }
  updateImages();
  console.log(content_images);
});

function updateImages() {
  // Clear existing listings
  qsa(".e-image-area .image").forEach((entry) => entry.remove());

  // Add new entries based on saved list
  content_images.forEach((image) => {
    image_drop_area.insertAdjacentHTML("beforeend", `<div class="image"><img src="${URL.createObjectURL(image.data_blob)}" /></div>`);
  });
}
