const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const crypto = require("crypto");
const sharp = require("sharp");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3 = new S3Client({
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  region: process.env.S3_REGION,
  endpoint: process.env.S3_ENDPOINT,
});
const settings = require("../settings");
const md = require("markdown-it")();

async function registerUser(username, password, options) {
  const new_user = await prisma.user.create({ data: { username: username, password: password, ...options } });

  if (new_user.id) {
    // If the user was created as an admin, make sure that the server knows the setup process is complete.
    if (options.role === "ADMIN") settings.act("SETUP_COMPLETE", true);

    // Create a user profile page
    const profile_page = await prisma.profilePage.create({ data: { owner: new_user.id } });
    if (!profile_page.id) return { success: false, message: `Error creating profile page for user ${new_user.username}` };

    // User has been successfully created
    return { success: true, message: `Successfully created ${new_user.username}` };
  }

  return { success: false, message: "Unknown error" };
}
async function getUser({ id, username } = {}) {
  if (id || username) {
    let user;
    if (id) user = await prisma.user.findUnique({ where: { id: id } });
    else if (username) user = await prisma.user.findUnique({ where: { username: username } });

    if (!user) return { success: false, message: "No matching user" };
    else return { success: true, data: user };
  }
}
async function postBlog(blog_post, owner_id) {
  // Check if user has permissions to upload a blog post
  const user = await getUser({ id: owner_id });
  if (!user.success) return { success: false, message: "User not found" };
  if (user.data.role !== "ADMIN" && user.data.role !== "AUTHOR") return { success: false, message: "User is not permitted" };

  const [year, month, day] = blog_post.date.split("-");
  const [hour, minute] = blog_post.time.split(":");
  let publish_date = new Date(year, month - 1, day, hour, minute);

  let blog_post_formatted = {
    title: blog_post.title,
    description: blog_post.description,
    content: blog_post.content,
    visibility: blog_post.unlisted ? "UNLISTED" : "PUBLISHED",
    publish_date: publish_date,
  };

  const database_blog = await prisma.blogPost.create({ data: { ...blog_post_formatted, owner: { connect: { id: owner_id } } } });

  let uploaded_images = [];
  let uploaded_thumbnail = "DEFAULT";

  if (blog_post.images) {
    // For Each image, upload to S3
    for (let i = 0; blog_post.images.length > i; i++) {
      const image = blog_post.images[i];
      const image_data = Buffer.from(image.data_blob.split(",")[1], "base64");
      const name = await _uploadImage(database_blog.id, "blog", false, image_data, image.id);
      uploaded_images.push(name);
    }
  }

  // Upload thumbnail to S3
  if (blog_post.thumbnail) {
    const image_data = Buffer.from(blog_post.thumbnail.data_blob.split(",")[1], "base64");
    const name = await _uploadImage(database_blog.id, "blog", true, image_data, blog_post.thumbnail.id);
    uploaded_thumbnail = name;
  }

  await prisma.blogPost.update({ where: { id: database_blog.id }, data: { images: uploaded_images, thumbnail: uploaded_thumbnail } });
  return { success: true, blog_id: database_blog.id };
}
async function deleteBlog(blog_id, requester_id) {
  const user = await getUser({ id: requester_id });
  const post = await getBlogList({ id: blog_id });

  let can_delete = post.owner.id === user.data.id || user.data.role === "ADMIN";

  if (can_delete) {
    await prisma.blogPost.delete({ where: { id: post.id } });
    _deleteS3Directory(post.id, "blog");
    return { success: true };
  }

  return { success: false, message: "Action not permitted" };
}
async function updateBlog(blog_post, requester_id) {
  const user = await getUser({ id: requester_id });
  const post = await getBlogList({ id: blog_post.id, raw: true });

  delete blog_post.id;

  let can_update = post.owner.id === user.data.id || user.data.role === "ADMIN";

  if (!can_update) return { success: false, message: "User not permitted" };

  const [year, month, day] = blog_post.date.split("-");
  const [hour, minute] = blog_post.time.split(":");
  let publish_date = new Date(year, month - 1, day, hour, minute);

  let blog_post_formatted = {
    title: blog_post.title,
    description: blog_post.description,
    content: blog_post.content,
    visibility: blog_post.unlisted ? "UNLISTED" : "PUBLISHED",
    publish_date: publish_date,
  };

  await prisma.blogPost.update({ where: { id: post.id }, data: blog_post_formatted });

  let uploaded_images = [];
  let uploaded_thumbnail = "DEFAULT";

  // For Each image, upload to S3
  if (blog_post.images) {
    for (let i = 0; blog_post.images.length > i; i++) {
      const image = blog_post.images[i];
      const image_data = Buffer.from(image.data_blob.split(",")[1], "base64");
      const name = await _uploadImage(post.id, "blog", false, image_data, image.id);
      uploaded_images.push(name);
    }
  }

  let data_to_update = {
    images: [...post.raw_images, ...uploaded_images],
  };

  if (blog_post.thumbnail) {
    const image_data = Buffer.from(blog_post.thumbnail.data_blob.split(",")[1], "base64");
    const name = await _uploadImage(post.id, "blog", true, image_data, blog_post.thumbnail.id);
    uploaded_thumbnail = name;

    data_to_update.thumbnail = uploaded_thumbnail;
  }

  await prisma.blogPost.update({ where: { id: post.id }, data: data_to_update });

  return { success: true };
}
async function getBlogList({ id, visibility = "PUBLISHED", owner_id, raw = false } = {}, { limit = 10, page = 0 } = {}) {
  if (id) {
    // Get the database entry for the blog post
    let post = await prisma.blogPost.findUnique({ where: { id: id }, include: { owner: true } });

    if (!post) return null;

    if (raw) {
      // Had to do this, only God knows why.
      post.raw_images = [];
      post.images.forEach((image) => post.raw_images.push(image));

      post.raw_thumbnail = post.thumbnail;
      post.raw_content = post.content;
    }

    // Get the image urls for the post
    for (i = 0; post.images.length > i; i++) {
      post.images[i] = await _getImage(post.id, "blog", post.images[i]);
    }

    // get thumbnail URL
    post.thumbnail = await _getImage(post.id, "blog", post.thumbnail);

    // Render the markdown contents of the post
    post.content = md.render(post.content);

    // Replace custom formatting with what we want
    post.content = _format_blog_content(post.content, post.images);

    // Return the post with valid image urls
    return post;
  }

  const where_object = {
    OR: [
      {
        AND: [
          {
            visibility: "PUBLISHED",
          },
          {
            publish_date: {
              lte: new Date(),
            },
          },
        ],
      },

      {
        ownerid: owner_id,
      },
    ],
  };

  const blog_posts = await prisma.blogPost.findMany({
    where: where_object,
    take: limit,
    skip: Math.max(page, 0) * limit,
    include: { owner: true },
    orderBy: [{ publish_date: "desc" }, { created_date: "desc" }],
  });
  // Get the thumbnails
  for (i = 0; blog_posts.length > i; i++) {
    blog_posts[i].thumbnail = await _getImage(blog_posts[i].id, "blog", blog_posts[i].thumbnail);

    // Get the image urls for the post
    for (imgindx = 0; blog_posts[i].images.length > imgindx; imgindx++) {
      blog_posts[i].images[imgindx] = await _getImage(blog_posts[i].id, "blog", blog_posts[i].images[imgindx]);
    }

    // Render the markdown contents of the post
    blog_posts[i].content = md.render(blog_posts[i].content);

    // Replace custom formatting with what we want
    blog_posts[i].content = _format_blog_content(blog_posts[i].content, blog_posts[i].images);
  }
  // Calculate pagination
  let pagination = await prisma.blogPost.count({
    where: where_object,
  });
  return { data: blog_posts, pagination: _getNavigationList(page, Math.ceil(pagination / limit)) };
}
async function deleteImage(image, requester_id) {
  const user = await getUser({ id: requester_id });
  const post = await getBlogList({ id: image.parent, raw: true });

  // Check if post exists
  if (!post) return { success: false, message: "Post does not exist" };

  // Check for permissions
  if (post.owner.id !== user.data.id || user.data.role !== "ADMIN") return { success: false, message: "User is not permitted" };

  let image_index = post.raw_images.indexOf(image.id);

  post.raw_images.splice(image_index, 1);

  await prisma.blogPost.update({ where: { id: post.id }, data: { images: post.raw_images } });

  const request_params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${process.env.ENVIRONMENT}/${image.parent_type}/${image.parent}/${image.id}.webp`,
  };

  const command = new DeleteObjectCommand(request_params);
  await s3.send(command);

  return { success: true };
}
async function _uploadImage(parent_id, parent_type, is_thumbnail, buffer, name) {
  let size = { width: 1920, height: 1080 };
  if (is_thumbnail) size = { width: 300, height: 300 };

  const compressed_image = await sharp(buffer, { animated: true })
    .resize({ ...size, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: 90 })
    .toBuffer();

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${process.env.ENVIRONMENT}/${parent_type}/${parent_id}/${name}.webp`,
    Body: compressed_image,
    ContentType: "image/webp",
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  return name;
}
async function _getImage(parent_id, parent_type, name) {
  let params;
  // Default image
  if (name === "DEFAULT") params = { Bucket: process.env.S3_BUCKET_NAME, Key: `defaults/thumbnail.webp` };
  // Named image
  else params = { Bucket: process.env.S3_BUCKET_NAME, Key: `${process.env.ENVIRONMENT}/${parent_type}/${parent_id}/${name}.webp` };

  return await getSignedUrl(s3, new GetObjectCommand(params), { expiresIn: 3600 });
}
async function _deleteS3Directory(id, type) {
  // logger.verbose(`Deleting entire S3 image directory`);
  // Erase database images from S3 server
  const folder_params = { Bucket: process.env.S3_BUCKET_NAME, Prefix: `${process.env.ENVIRONMENT}/${type}/${id}` };

  // Retrieve a list of objects in the specified directory
  const listed_objects = await s3.send(new ListObjectsCommand(folder_params));

  // If the directory is already empty, return
  if (listed_objects?.Contents?.length === 0 || !listed_objects.Contents) return;

  // Create an object to specify the bucket and objects to be deleted
  const delete_params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Delete: { Objects: [] },
  };

  // Iterate over each object and push its key to the deleteParams object
  listed_objects.Contents.forEach(({ Key }) => {
    delete_params.Delete.Objects.push({ Key });
  });

  // Delete the objects specified in deleteParams
  await s3.send(new DeleteObjectsCommand(delete_params));

  // If there are more objects to delete (truncated result), recursively call the function again
  // if (listed_objects.IsTruncated) await emptyS3Directory(bucket, dir);
}
function _format_blog_content(content, images) {
  // Replace Images
  const image_regex = /{image:([^}]+)}/g;

  // Replace Side-by-side
  const side_by_side = /{sidebyside}(.*?){\/sidebyside}/gs;

  content = content.replace(image_regex, (match, image_name) => {
    for (image of images) {
      if (image.includes(image_name)) {
        return `<div class='image-container'><img src='${image}'></div>`;
      }
    }
  });

  content = content.replace(side_by_side, (match, inner_content) => {
    return `<div class='side-by-side'>${inner_content}</div>`;
  });

  // Finished formatting, return!
  return content;
}
function _getNavigationList(current_page, max_page) {
  current_page = Number(current_page);
  max_page = Number(max_page);

  const pageList = [current_page - 2, current_page - 1, current_page, current_page + 1, current_page + 2].filter((num) => num >= 0 && num < max_page);
  return pageList.slice(0, 5);
}

module.exports = { registerUser, getUser, postBlog, updateBlog, getBlogList, deleteBlog, deleteImage };
