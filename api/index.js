const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "./uploads" });
const fs = require("fs");
const salt = bcrypt.genSaltSync(10);
const secret = "fkhasfklhfaddfjhasfahg";
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());
app.use("/uploads", express.static(__dirname + "/uploads"));


// For connect MongoDB
mongoose.connect(
  "mongodb+srv://rafidiya143:Taex8kroacsDBDR7@cluster0.9nybih9.mongodb.net/?retryWrites=true&w=majority"
);

// To Register new user.
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  try {
    const userdoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json({ userdoc });
  } catch (e) {
    res.status(400).json(e);
  }
});


// To login user.
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const userdoc = await User.findOne({ username });
  const passOk = bcrypt.compareSync(password, userdoc.password);
  if (passOk) {
    jwt.sign({ username, id: userdoc._id }, secret, {}, (err, token) => {
      if (err) throw err;
      res.cookie("token", token).json({
        id: userdoc._id,
        username,
      });
    });
  } else {
    res.status(400).json("Wrong Username Or Password");
  }
});


// to get profile
app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err) throw err;
    res.json(info);
  });
});


// To logout User.
app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});


// To post/add new blog
app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  const { originalname, path } = req.file;
  const parts = originalname.split(".");
  const ext = parts[parts.length - 1];
  const newPath = path + "." + ext;
  fs.renameSync(path, newPath);

  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { title, summary, content } = req.body;
    const postDoc = await Post.create({
      title,
      summary,
      content,
      cover: newPath,
      author: info.id,
    });
    res.json(postDoc);
  });
});


// To get all post.
app.get("/post", async (req, res) => {
  const posts = await Post.find()
    .populate("author", ["username"])
    .sort({ createdAt: -1 })
    .limit(20);
  res.json(posts);
});

// To get post by unique id.
app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

// To delete post by unique id
app.delete("/delete/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const product = await Post.deleteOne({ _id: id });
    if (product) {
      res.status(200).json(product);
    }
  } catch (error) {
    res.status(400).json(error);
  }
});

// To edit existing posts.
app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;
  if (req.file) {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    newPath = path + "." + ext;
    fs.renameSync(path, newPath);
  }
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, async (err, info) => {
    if (err) throw err;
    const { id, title, summary, content } = req.body;
    const postDoc = await Post.findById(id);
    const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);
    if (!isAuthor) {
      return res.status(400).json("you are not the author");
    }

    await postDoc.updateOne({
      title,
      summary,
      content,
      cover: newPath ? newPath : postDoc.cover,
    });
    res.json(postDoc);
  });
});
app.listen(4000);
// Taex8kroacsDBDR7
// mongodb+srv://rafidiya143:<Taex8kroacsDBDR7>@cluster0.9nybih9.mongodb.net/?retryWrites=true&w=majority
