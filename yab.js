// Multer file handling
// REVIEW: Look for a way to drop this dependency?
const multer = require("multer");
const multer_storage = multer.memoryStorage();
const upload = multer({ storage: multer_storage });

// Express
const express = require("express");
const session = require("express-session");
const app = express();

const path = require("path");

// Security and encryption
const bcrypt = require("bcrypt");
const crypto = require("crypto");

// Local modules
const page_scripts = require("./backend/page_scripts");

// Express settings
app.set("view-engine", "ejs");
app.set("views", path.join(__dirname, "frontend/views"));
app.use(express.static(path.join(__dirname, "frontend/public")));
const bodyParser = require("body-parser");
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(upload.array());

app.use(
  session({
    secret: crypto.randomBytes(128).toString("base64"),
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
// app.get("/blog/new", checkAuthenticated, page_scripts.blogNew);
// app.post("/blog", checkAuthenticated, page_scripts.postBlog);
// app.delete("/logout", page_scripts.logout);

// Image Endpoints
// app.post("/api/image", checkAuthenticated, upload.fields([{ name: "image" }]), page_scripts.uploadImage);

// Endpoints
app.get("/", page_scripts.index);
// app.get("/blog", page_scripts.blogList);
// app.get("/blog/:id", page_scripts.blogSingle);
// app.get("/projects", page_scripts.projectList);

function checkAuthenticated(req, res, next) {
  if (req.session.user) return next();
  res.redirect("/login");
}

function checkNotAuthenticated(req, res, next) {
  if (req.session.user) return res.redirect("/");
  next();
}

app.listen(8080);
