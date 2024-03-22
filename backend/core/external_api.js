const feed_lib = require("feed").Feed;
const core = require("./core");

// TODO: Expose ATOM Feed items
function getBaseFeed() {
  return new feed_lib({
    title: process.env.WEBSITE_NAME,
    description: `${process.env.WEBSITE_NAME} RSS Feed`,
    id: process.env.BASE_URL,
    link: process.env.BASE_URL,
    favicon: `${process.env.BASE_URL}/favicon.ico`,
    feedLinks: {
      json: `${process.env.BASE_URL}/json`,
      atom: `${process.env.BASE_URL}/atom`,
    },
  });
}

async function getFeed({ type = "rss" }) {
  // Get the base feed
  let feed = getBaseFeed();

  // Get posts
  let posts = await core.getBlog({ limit: 20 }); // internal.getBlogList({}, { limit: 20 });

  // For each post, add a formatted object to the feed
  posts.data.forEach((post) => {
    let formatted = {
      title: post.title,
      description: post.description,
      id: post.id,
      link: `${process.env.BASE_URL}/blog/${post.id}`,
      content: post.content,
      date: new Date(post.publish_date),
      image: post.thumbnail,
      author: [
        {
          name: post.owner.username,
          link: `${process.env.BASE_URL}/author/${post.owner.username}`,
        },
      ],
    };

    feed.addItem(formatted);
  });
  //   if (type === "rss") return feed.rss2();
  if (type === "atom") return feed.atom1();
  if (type === "json") return feed.json1();
}

module.exports = { getFeed };
