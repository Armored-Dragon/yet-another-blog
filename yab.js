// Express
const express = require("express");
const session = require("express-session");
const app = express();

const path = require("path");

// Local modules
const page_scripts = require("./backend/page_scripts");

// Express settings
app.set("view-engine", "ejs");
app.set("views", path.join(__dirname, "frontend/views"));
app.use(express.static(path.join(__dirname, "frontend/public")));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: false }));

app.use(
  session({
    secret: require("crypto").randomBytes(128).toString("base64"),
    resave: false,
    saveUninitialized: false,
  })
);

// Account Creation Endpoints
app.get("/login", page_scripts.login);
app.post("/login", checkNotAuthenticated, page_scripts.loginPost);
app.get("/register", checkNotAuthenticated, page_scripts.register);
app.post("/register", checkNotAuthenticated, page_scripts.registerPost);

// Account Required Endpoints
app.post("/setting", checkAuthenticated, page_scripts.settingPost);
app.get("/blog/new", checkAuthenticated, page_scripts.blogNew);
app.post("/api/web/blog", checkAuthenticated, page_scripts.postBlog);
app.delete("/api/web/blog", checkAuthenticated, page_scripts.deleteBlog);
app.patch("/api/web/blog", checkAuthenticated, page_scripts.updateBlog);
app.delete("/api/web/blog/image", checkAuthenticated, page_scripts.deleteImage);
// app.delete("/logout", page_scripts.logout);

// Endpoints
app.get("/", page_scripts.index);
app.get("/author/:author_username", page_scripts.author);
app.get("/admin", checkAuthenticated, page_scripts.admin);
app.get("/blog", page_scripts.blogList);
app.get("/blog/:blog_id", page_scripts.blogSingle);
app.get("/blog/:blog_id/edit", checkAuthenticated, page_scripts.blogEdit);
app.get("/atom", page_scripts.atom);
// app.get("/rss", page_scripts.rss);

function checkAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
  if (req.session.user) return res.redirect("/");
  next();
}

app.listen(8080);
