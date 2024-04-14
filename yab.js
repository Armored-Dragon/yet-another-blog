// Express
const express = require("express");
const session = require("express-session");
const app = express();

const path = require("path");

// Local modules
const page_scripts = require("./backend/page_scripts");
const internal = require("./backend/core/internal_api");

// Express settings
app.set("view-engine", "ejs");
app.set("views", path.join(__dirname, "frontend/views"));
app.use(express.json({ limit: "500mb" }));
app.use(express.urlencoded({ extended: false }));

// TODO: Does this persist previous themes? May cause security issues!
const refreshTheme = (theme_name) => app.use(express.static(path.join(__dirname, `frontend/views/themes/${theme_name}`)));
refreshTheme("default");

app.use(
  session({
    secret: require("crypto").randomBytes(128).toString("base64"),
    resave: false,
    saveUninitialized: false,
  })
);

// API
app.post("/login", checkNotAuthenticated, internal.postLogin);
app.post("/register", checkNotAuthenticated, internal.postRegister);
app.post("/setting", checkAuthenticated, internal.postSetting);
app.post("/api/web/post", checkAuthenticated, internal.postBlog);
app.post("/api/web/image", checkAuthenticated, internal.postImage);
app.delete("/api/web/post/image", checkAuthenticated, internal.deleteImage);
app.delete("/api/web/post", checkAuthenticated, internal.deleteBlog);
app.patch("/api/web/post", checkAuthenticated, internal.patchBlog);

// app.delete("/logout", page_scripts.logout);

// Endpoints
app.get("/", page_scripts.index);
app.get("/login", page_scripts.login);
app.get("/register", checkNotAuthenticated, page_scripts.register);
app.get("/author/:author_id", page_scripts.author);
app.get("/admin", checkAuthenticated, page_scripts.admin);
app.get("/posts", page_scripts.blogList);
app.get("/post/new", checkAuthenticated, page_scripts.blogNew);
app.get("/post/:blog_id", page_scripts.blogSingle);
app.get("/post/:blog_id/edit", checkAuthenticated, page_scripts.blogEdit);
app.get("/atom", page_scripts.atom);
app.get("/json", page_scripts.jsonFeed);

function checkAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
  if (req.session.user) return res.redirect("/");
  next();
}

app.listen(5004);
