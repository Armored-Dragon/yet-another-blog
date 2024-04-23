const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const sharp = require("sharp");
const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsCommand, DeleteObjectsCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
let s3;
const crypto = require("crypto");
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

  CD_RSS: true,
  CD_JSON: true,

  WEBSITE_NAME: "",
  PLAUSIBLE_URL: "",

  USER_MINIMUM_PASSWORD_LENGTH: 7,

  theme: "default",
};
let use_s3_storage = false;
_initS3Storage();
_getSettings();

// Checks to see if S3 storage is set
function _initS3Storage() {
  if (process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY && process.env.S3_REGION && process.env.S3_ENDPOINT) {
    console.log("S3 Server configured. Proceeding using S3 bucket");
    use_s3_storage = true;
    s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY,
        secretAccessKey: process.env.S3_SECRET_KEY,
      },
      region: process.env.S3_REGION,
      endpoint: process.env.S3_ENDPOINT,
    });
    return;
  } else {
    console.log("S3 Server NOT SET. Media uploads will not work.");
    use_s3_storage = false;
    return;
  }
}

// Users
async function newUser({ username, password, role } = {}) {
  if (!username) return _r(false, "Username not specified");
  if (!password) return _r(false, "Password not specified");

  // Create the account
  try {
    user_database_entry = await prisma.user.create({ data: { username: username, password: password, role: role } });
  } catch (e) {
    let message = "Unknown error";
    return { success: false, message: message };
  }

  // Create the profile page and link
  try {
    user_profile_database_entry = await prisma.profilePage.create({ data: { owner: { connect: { id: user_database_entry.id } } } });
  } catch (e) {
    return { success: false, message: `Error creating profile page for user ${username}` };
  }

  // Master user was created; server initialized
  editSetting({ name: "SETUP_COMPLETE", value: true });
}
async function getUser({ user_id, username }) {
  if (!username && !user_id) return _r(false, "Either a user_id or username is needed.");

  let user;

  if (user_id) user = await prisma.user.findUnique({ where: { id: user_id } });
  else if (username) user = await prisma.user.findUnique({ where: { username: username } });

  if (!user) return _r(false, "No matching user");
  else return { success: true, data: user };
}
async function editUser({ requester_id, user_id, user_content }) {
  let user = await getUser({ user_id: user_id });
  if (!user.success) return _r(false, "User not found");
  user = user.data;

  // TODO:
  // If there was a role change, see if the acting user can make these changes

  // TODO:
  // If there was a password change,
  // check to see if the user can make these changes
  // Hash the password

  // FIXME: Not secure. ASAP!
  let formatted = {};
  formatted[user_content.setting_name] = user_content.value;

  await prisma.user.update({ where: { id: user.id }, data: formatted });
  return _r(true);
}
async function deleteUser({ user_id }) {
  if (!user_id) return _r(false, "User_id not specified.");

  await prisma.user.delete({ where: { id: user_id } }); // TODO: Test
  return _r(true, `User ${user_id} deleted`);
}

// Posts
async function newPost({ requester_id }) {
  //   const user = await getUser({ id: requester_id });
  const post = await prisma.post.create({ data: { owner: { connect: { id: requester_id } } } });

  // TODO: Validate request (Does user have perms?)
  // TODO: Does server allow new posts?
  return post.id;
}
async function getPost({ requester_id, post_id, visibility = "PUBLISHED" } = {}, { search, search_title, search_content, search_tags } = {}, { limit = 10, page = 0, pagination = true } = {}) {
  // Get a single post
  if (post_id) {
    let post;
    post = await prisma.post.findUnique({ where: { id: post_id }, include: { owner: true, tags: true } });
    if (!post) return _r(false, "Post does not exist");
    post = _stripPrivatePost(post);

    // Tags
    let post_tags = [];
    post.raw_tags = [];
    post.tags.forEach((tag) => {
      post_tags.push(tag.name);
      post.raw_tags.push();
    });
    post.tags = post_tags;

    // Render post
    return { success: true, data: await _renderPost(post) };
  }

  // Otherwise build WHERE_OBJECT using data we do have
  let post_list = [];
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
        ownerid: requester_id,
      },
    ],

    AND: [
      {
        OR: [],
      },
    ],
  };
  // Build the "where_object" object
  if (search) {
    if (search_tags) where_object["AND"][0]["OR"].push({ tags: { some: { name: search?.toLowerCase() } } });
    if (search_title) where_object["AND"][0]["OR"].push({ title: { contains: search, mode: "insensitive" } });
    if (search_content) where_object["AND"][0]["OR"].push({ content: { contains: search, mode: "insensitive" } });
  }
  // Execute search
  let posts = await prisma.post.findMany({
    where: where_object,
    take: limit,
    skip: Math.max(page, 0) * limit,
    include: { owner: true, tags: true },
    orderBy: [{ publish_date: "desc" }, { created_date: "desc" }],
  });

  for (post of posts) {
    post = _stripPrivatePost(post);
    post = await _renderPost(post);
    post_list.push(post);

    let post_tags = [];
    post.tags.forEach((tag) => post_tags.push(tag.name));
    post.tags = post_tags;
  }

  // Calculate pagination
  let post_count = await prisma.post.count({
    where: where_object,
  });

  return { data: post_list, pagination: _getNavigationList(page, Math.ceil(post_count / limit)), success: true };

  function _getNavigationList(current_page, max_page) {
    current_page = Number(current_page);
    max_page = Number(max_page);

    const pageList = [current_page - 2, current_page - 1, current_page, current_page + 1, current_page + 2].filter((num) => num >= 0 && num < max_page);
    return pageList.slice(0, 5);
  }
}
async function editPost({ requester_id, post_id, post_content }) {
  let user = await getUser({ user_id: requester_id });
  let post = await getPost({ post_id: post_id });
  let publish_date = null;

  if (!user.success) return _r(false, post.message || "User not found");
  user = user.data;
  if (!post.success) return _r(false, post.message || "Post not found");
  post = post.data;

  // Check to see if the requester can update the post
  // TODO: Permissions
  let can_update = post.owner.id === user.id || user.role === "ADMIN";

  // FIXME: Unsure if this actually works
  // Check if we already have a formatted publish date
  if (typeof post.publish_date !== "object") {
    const [year, month, day] = post.date.split("-");
    const [hour, minute] = post.time.split(":");
    publish_date = new Date(year, month - 1, day, hour, minute);
  }

  // Handle tags ----
  let database_tag_list = [];
  const existing_tags = post.tags?.map((tag) => ({ name: tag })) || [];

  // Add new tags
  for (let tag_index = 0; post_content.tags.length > tag_index; tag_index++) {
    let tag = post_content.tags[tag_index];

    // Check to see if tag exists, create if necessary,
    let database_tag = await prisma.tag.upsert({ where: { name: tag }, update: {}, create: { name: tag } });

    database_tag_list.push(database_tag);
  }

  // Rebuild the post to save
  let post_formatted = {
    title: post_content.title,
    description: post_content.description,
    content: post_content.content,
    visibility: post_content.visibility || "PRIVATE",
    publish_date: publish_date || post_content.publish_date,
    tags: { disconnect: [...existing_tags], connect: [...database_tag_list] },
    media: [...post.raw_media, ...post_content.media],
  };

  // Save the updated post to the database
  await prisma.post.update({ where: { id: post.id }, data: post_formatted });

  return _r(true);
}
async function deletePost({ requester_id, post_id }) {}
// User Profiles
async function getBiography({ requester_id, author_id }) {
  if (!author_id) return _r(false, "No Author specified.");
  let post = await prisma.profilePage.findFirst({ where: { ownerid: author_id }, include: { owner: true } });

  // Check if it is private
  // TODO

  // HACK:
  // When we render the post and reading from S3, we want the post id
  // The problem is when a user views the biography page, the page shows the account id opposed to the "profile page" id.
  // This causes a incorrect parent_id value and an incorrect key.
  // Replace the "id" to the value it's expecting.
  const original_post_id = post.id;
  let rendering_formatted_post = {};

  rendering_formatted_post = post;
  rendering_formatted_post.id = author_id;

  // Render
  post = _stripPrivatePost(post);
  post = await _renderPost(rendering_formatted_post);

  post.id = original_post_id;

  return { success: true, data: post };
}
async function updateBiography({ requester_id, author_id, biography_content }) {
  let user = await getUser({ user_id: requester_id });
  let biography = await getBiography({ author_id: author_id });

  if (!user.success) return _r(false, user.message || "Author not found");
  user = user.data;

  if (!biography.success) return _r(false, biography.message || "Post not found");
  biography = biography.data;

  let can_update = biography.owner.id === user.id || user.role === "ADMIN";
  if (!can_update) return _r(false, "User not permitted");

  let formatted = {
    content: biography_content.content,
    media: [...biography.raw_media, ...biography_content.media],
  };

  await prisma.profilePage.update({ where: { id: biography.id }, data: formatted });

  return _r(true);
}
// TODO: Replace
async function deleteBlog(blog_id, requester_id) {
  const user = await getUser({ id: requester_id });
  const post = await getBlog({ id: blog_id });

  if (!post.success) return { success: false, message: post.message || "Post does not exist" };

  let can_delete = post.data.owner.id === user.data.id || user.data.role === "ADMIN";

  if (can_delete) {
    await prisma.post.delete({ where: { id: post.data.id } });
    _deleteS3Directory(post.data.id, "blog");
    return { success: true };
  }

  return { success: false, message: "Action not permitted" };
}
async function uploadMedia({ parent_id, file_buffer, file_extension }) {
  if (!use_s3_storage) return null;
  const content_name = crypto.randomUUID();
  let maximum_image_resolution = { width: 1920, height: 1080 };

  // const image_extensions = ["png", "webp", "jpg", "jpeg"];
  // const video_extensions = ["mp4", "webm", "mkv", "avi"];

  // Images
  const compressed_image = await sharp(Buffer.from(file_buffer.split(",")[1], "base64"), { animated: true })
    .resize({ ...maximum_image_resolution, withoutEnlargement: true, fit: "inside" })
    .webp({ quality: 90, animated: true })
    .toBuffer();

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `${process.env.ENVIRONMENT}/posts/${parent_id}/${content_name}.webp`,
    Body: compressed_image,
    ContentType: "image/webp",
  };

  const command = new PutObjectCommand(params);
  await s3.send(command);

  return content_name;
}
async function getMedia({ parent_id, file_name }) {
  if (!use_s3_storage) return null;
  const params = { Bucket: process.env.S3_BUCKET_NAME, Key: `${process.env.ENVIRONMENT}/posts/${parent_id}/${file_name}.webp` };
  return await getSignedUrl(s3, new GetObjectCommand(params), { expiresIn: 3600 });
}
// TODO:
// Will be done automatically in the background.
// Unreferenced images and media will be deleted
async function deleteMedia({ parent_id, file_name }) {}

async function getTags({ order = "count" } = {}) {
  if (order == "count") {
    return await prisma.tag.findMany({
      include: { _count: { select: { posts: true } } },
      where: {
        posts: {
          some: {},
        },
      },
      take: 15,
      orderBy: {
        posts: {
          _count: "desc",
        },
      },
    });
  }
}

// TODO:
// Will be done automatically in the background
async function deleteTag({ tag_id }) {}

// async function deleteImage(image, requester_id) {
//   const user = await getUser({ id: requester_id });
//   const post = await getBlog({ id: image.parent, raw: true });

//   // Check if post exists
//   if (!post) return { success: false, message: "Post does not exist" };

//   // Check for permissions
//   if (post.owner.id !== user.data.id || user.data.role !== "ADMIN") return { success: false, message: "User is not permitted" };

//   let image_index = post.raw_images.indexOf(image.id);

//   post.raw_images.splice(image_index, 1);

//   await prisma.post.update({ where: { id: post.id }, data: { images: post.raw_images } });

//   const request_params = {
//     Bucket: process.env.S3_BUCKET_NAME,
//     Key: `${process.env.ENVIRONMENT}/${image.parent_type}/${image.parent}/${image.id}.webp`,
//   };

//   const command = new DeleteObjectCommand(request_params);
//   await s3.send(command);

//   return { success: true };
// }
async function _deleteS3Directory(id, type) {
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

async function _renderPost(post) {
  post.raw_media = [];
  post.raw_content = post.content;

  // For some reason Node does not like to set a variable and leave it.
  post.media.forEach((media) => post.raw_media.push(media));

  if (post.media) {
    for (i = 0; post.media.length > i; i++) {
      post.media[i] = await getMedia({ parent_id: post.id, file_name: post.media[i] });
    }
  }

  if (post.content) {
    // Render the markdown contents of the post
    post.content = md.render(post.content);

    // Replace custom formatting with what we want
    post.content = _formatBlogContent(post.content, post.media);
  }
  return post;

  function _formatBlogContent(content, media_list) {
    // Replace Images
    const image_regex = /{image:([^}]+)}/g;

    // Replace Side-by-side
    const side_by_side = /{sidebyside}(.*?){\/sidebyside}/gs;

    // Replace video links
    const video = /{video:([^}]+)}/g;

    content = content.replace(video, (match, inner_content) => {
      return `<div class='video-embed'><iframe src="${_getVideoEmbed(inner_content)}" frameborder="0" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe></div>`;
    });

    // Replace Images
    content = content.replace(image_regex, (match, image_name) => {
      for (media of media_list) {
        if (media.includes(image_name)) {
          return `<div class='image-container'><img src='${media}'></div>`;
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
// TODO: Replace
async function getSetting(key, { parse = true }) {
  if (!settings[key]) return null;

  if (parse) {
    return JSON.parse(settings[key]);
  }
  return settings[key];
}
// TODO: Replace
async function postSetting(key, value) {
  try {
    if (!Object.keys(settings).includes(key)) return { success: false, message: "Setting not valid" };

    await prisma.setting.upsert({ where: { id: key }, update: { value: value }, create: { id: key, value: value } });
    try {
      settings[key] = JSON.parse(value);
    } catch {
      settings[key] = value;
    }

    return { success: true };
  } catch (e) {
    return { success: false, message: e.message };
  }
}
// TODO: Replace
async function editSetting({ name, value }) {
  if (!Object.keys(settings).includes(name)) return _r(false, "Setting is not valid");

  await prisma.setting.upsert({ where: { id: key }, update: { value: value }, create: { id: key, value: value } });
  try {
    settings[key] = JSON.parse(value);
  } catch {
    settings[key] = value;
  }

  return _r(true);
}

function _stripPrivatePost(post) {
  if (!post) return;
  if (post.owner) delete post.owner.password;
  return post;
}
const _r = (s, m) => {
  return { success: s, message: m };
};

module.exports = { settings, newUser, getUser, editUser, getPost, newPost, editPost, getBiography, updateBiography, uploadMedia, deleteBlog, getTags, postSetting, getSetting };
