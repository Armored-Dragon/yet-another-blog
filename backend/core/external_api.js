const feed_lib = require("feed").Feed;
const internal = require("./internal_api");

// TODO: Expose ATOM Feed items
function getBaseFeed() {
  return new feed_lib({
    title: process.env.WEBSITE_NAME,
    description: `${process.env.S3_REGION} RSS Feed`,
    id: process.env.BASE_URL,
    link: process.env.BASE_URL,
    // image: "http://example.com/image.png",
    // favicon: "http://example.com/favicon.ico",
    // copyright: "All rights reserved 2013, John Doe",
    // generator: "awesome", // optional, default = 'Feed for Node.js'
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
  let posts = await internal.getBlogList({}, { limit: 20 });

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
  //   if (type === "json") return feed.json1();
}

module.exports = { getFeed };
