const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
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
const md = require("markdown-it")()
  .use(require("markdown-it-underline"))
  .use(require("markdown-it-footnote"))
  .use(require("markdown-it-sup"))
  .use(require("markdown-it-anchor"), {
    permalink: require("markdown-it-anchor").permalink.linkInsideHeader({
      placement: "before",
      symbol: `⮺`,
    }),
  });

let settings = {
  SETUP_COMPLETE: false,
  ACCOUNT_REGISTRATION: false,
  HIDE_LOGIN: false,
  BLOG_UPLOADING: false,

  CD_RSS: false,
  CD_AP: false,

  WEBSITE_NAME: "",
  PLAUSIBLE_URL: "",

  USER_MINIMUM_PASSWORD_LENGTH: 7,

  BLOG_MINIMUM_TITLE_LENGTH: 7,
  BLOG_MINIMUM_DESCRIPTION_LENGTH: 7,
  BLOG_MINIMUM_CONTENT_LENGTH: 7,
};
let groups = [];
_getSettings();
_getGroups();

async function registerUser(username, password, options) {
  let user_database_entry;
  let user_profile_database_entry;

  // Create the entry in the database
  try {
    user_database_entry = await prisma.user.create({ data: { username: username, password: password, ...options } });
  } catch (e) {
    let message;

    if (e.code === "P2002") message = "Username already exists";
    else message = "Unknown error";

    return { success: false, message: message };
  }

  // Create a user profile page
  try {
    user_profile_database_entry = await prisma.profilePage.create({ data: { owner: { connect: { id: user_database_entry.id } } } });
  } catch (e) {
    return { success: false, message: `Error creating profile page for user ${username}` };
  }

  // Master user was created; server initialized
  postSetting("SETUP_COMPLETE", true);

  // User has been successfully created
  return { success: true, message: `Successfully created ${username}` };
}
// Posts
async function getBlog({ id, visibility = "PUBLISHED", owner_id, limit = 10, page = 0, tags = [], search_title = false, search_content = false, search }) {
  // If we have an ID, we want a single post
  if (id) {
    // Get the post by the id
    let post = await prisma.blogPost.findUnique({ where: { id: id }, include: { owner: true } });
    if (!post) return { success: false, message: "Post does not exist" };

    // Render the post
    const rendered_post = await _renderPost(post, true);

    // Return the post with valid image urls
    return { data: rendered_post, success: true };
  }
  // Otherwise build WHERE_OBJECT using data we do have
  let rendered_post_list = [];
  let where_object = {
    OR: [
      // Standard discovery: Public, and after the publish date
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

      // User owns the post
      {
        ownerid: owner_id,
      },
    ],
    AND: [],
  };

  // Build the "where_object" object
  if (tags.length > 0) {
  }
  if (search_title) where_object["AND"].push({ title: { contains: search, mode: "insensitive" } });
  if (search_content) where_object["AND"].push({ content: { contains: search, mode: "insensitive" } });

  // Execute search
  const blog_posts = await prisma.blogPost.findMany({
    where: where_object,
    take: limit,
    skip: Math.max(page, 0) * limit,
    include: { owner: true },
    orderBy: [{ publish_date: "desc" }, { created_date: "desc" }],
  });

  // Render each of the posts in the list
  for (post of blog_posts) {
    rendered_post_list.push(await _renderPost(post, true));
  }
  // Calculate pagination
  let pagination = await prisma.blogPost.count({
    where: where_object,
  });
  return { data: rendered_post_list, pagination: _getNavigationList(page, Math.ceil(pagination / limit)), success: true };
}
async function getAuthorPage({ author_id }) {
  // Get the post by the id

  let post = await prisma.profilePage.findUnique({ where: { ownerid: author_id }, include: { owner: true } });
  if (!post) return { success: false, message: "Post does not exist" };

  // Render the post
  const rendered_post = await _renderPost(post, true);

  // Return the post with valid image urls
  return { data: rendered_post, success: true };
}
async function getUser({ id, username } = {}) {
  let user;
  if (id) user = await prisma.user.findUnique({ where: { id: id } });
  else if (username) user = await prisma.user.findUnique({ where: { username: username } });

  if (!user) return { success: false, message: "No matching user" };
  else return { success: true, data: user };
}
async function postBlog(blog_post, owner_id) {
  const user = await getUser({ id: owner_id });
  // Check if user has permissions to upload a blog post

  if (user.data.role !== "ADMIN" && user.data.role !== "AUTHOR") return { success: false, message: "User is not permitted" };

  // Create object without image data to store in the database
  let blog_post_formatted = {
    title: blog_post.title,
    description: blog_post.description,
    content: blog_post.content,
    visibility: blog_post.visibility,
    publish_date: blog_post.publish_date,
  };

  // Save to database
  const database_blog = await prisma.blogPost.create({ data: { ...blog_post_formatted, owner: { connect: { id: owner_id } } } });

  // Init image vars
  let uploaded_images = [];
  let uploaded_thumbnail = "DEFAULT";

  // For Each image, upload to S3
  if (blog_post.images) {
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

  // Update the blog post to include references to our images
  await prisma.blogPost.update({ where: { id: database_blog.id }, data: { images: uploaded_images, thumbnail: uploaded_thumbnail } });
  return { success: true, blog_id: database_blog.id };
}
async function deleteBlog(blog_id, requester_id) {
  const user = await getUser({ id: requester_id });
  const post = await getPost({ id: blog_id });

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
  const post = await getPost({ id: blog_post.id, raw: true });

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
async function deleteImage(image, requester_id) {
  const user = await getUser({ id: requester_id });
  const post = await getPost({ id: image.parent, raw: true });

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
    .webp({ quality: 90, animated: true })
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
async function _renderPost(blog_post, raw, { post_type = "blog" } = {}) {
  if (raw) {
    // Had to do this, only God knows why.
    blog_post.raw_images = [];
    if (blog_post.images) blog_post.images.forEach((image) => blog_post.raw_images.push(image));

    blog_post.raw_thumbnail = blog_post.thumbnail;
    blog_post.raw_content = blog_post.content;
  }

  if (blog_post.images) {
    // Get the image urls for the post
    for (i = 0; blog_post.images.length > i; i++) {
      blog_post.images[i] = await _getImage(blog_post.id, post_type, blog_post.images[i]);
    }
  }

  // get thumbnail URL
  blog_post.thumbnail = await _getImage(blog_post.id, post_type, blog_post.thumbnail);

  // Render the markdown contents of the post
  blog_post.content = md.render(blog_post.content);

  // Replace custom formatting with what we want
  blog_post.content = _format_blog_content(blog_post.content, blog_post.images);

  return blog_post;
}
function _format_blog_content(content, images) {
  // Replace Images
  const image_regex = /{image:([^}]+)}/g;

  // Replace Side-by-side
  const side_by_side = /{sidebyside}(.*?){\/sidebyside}/gs;

  // Replace video links
  const video = /{video:([^}]+)}/g;

  content = content.replace(video, (match, inner_content) => {
    return `<div class='video-embed'><iframe src="${_getVideoEmbed(
      inner_content
    )}" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
  });

  content = content.replace(image_regex, (match, image_name) => {
    for (image of images) {
      if (image.includes(image_name)) {
        return `<div class='image-container'><img src='${image}'></div>`;
      }
    }

    // Unknown image (Image was probably deleted)
    return "";
  });

  content = content.replace(side_by_side, (match, inner_content) => {
    return `<div class='side-by-side'>${inner_content}</div>`;
  });

  // Finished formatting, return!
  return content;

  function _getVideoEmbed(video_url) {
    // YouTube
    if (video_url.includes("youtu.be")) {
      return `https://youtube.com/embed/${video_url.split("/")[3]}`;
    }
    if (video_url.includes("youtube")) {
      let video_id = video_url.split("/")[3];
      video_id = video_id.split("watch?v=").pop();
      return `https://youtube.com/embed/${video_id}`;
    }

    // Odysee
    if (video_url.includes("://odysee.com")) {
      let video_link = `https://${video_url.split("/")[2]}/$/embed/${video_url.split("/")[3]}/${video_url.split("/")[4]}`;
      return video_link;
    }
  }
}
function _getNavigationList(current_page, max_page) {
  current_page = Number(current_page);
  max_page = Number(max_page);

  const pageList = [current_page - 2, current_page - 1, current_page, current_page + 1, current_page + 2].filter((num) => num >= 0 && num < max_page);
  return pageList.slice(0, 5);
}
async function _getSettings() {
  // Go though each object key in our settings to get the value if it exists
  Object.keys(settings).forEach(async (key) => {
    let found_value = await prisma.setting.findUnique({ where: { id: key } });
    if (!found_value) return;

    let value;
    // Parse JSON if possible
    try {
      value = JSON.parse(found_value.value);
    } catch {
      value = found_value.value;
    }

    return (settings[key] = value);
  });
}

async function getSetting(key, { parse = true }) {
  if (!settings[key]) return null;

  if (parse) {
    return JSON.parse(settings[key]);
  }
  return settings[key];
}
async function postSetting(key, value) {
  try {
    if (!Object.keys(settings).includes(key)) return { success: false, message: "Setting not valid" };

    await prisma.setting.upsert({ where: { id: key }, update: { value: value }, create: { id: key, value: value } });
    settings[key] = JSON.parse(value);

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
async function _getGroups() {
  const group_list = await prisma.group.findMany();
}
module.exports = { settings, registerUser, getUser, getAuthorPage, postBlog, updateBlog, getBlog, deleteBlog, deleteImage, postSetting, getSetting };
