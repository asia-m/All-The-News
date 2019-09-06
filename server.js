const express = require("express");
const cheerio = require("cheerio");
const axios = require("axios");
const mongoose = require("mongoose");
var logger = require("morgan");

var app = express();
var db = require("./models");
var PORT = process.env.PORT || 3000;

app.use(logger("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
var MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost/all-the-news";

mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true
});

app.get("/scrape", function (req, res) {
    axios.get("https://news.ycombinator.com/").then(response => {
        var $ = cheerio.load(response.data);

        $("a.storylink").each(function (i, element) {
            var result = {};

            result.title = $(this).text();
            result.link = $(this).attr("href");

            db.Article.create(result)
                .then(function (dbArticle) {
                    console.log(dbArticle);
                })
                .catch(function (err) {
                    console.log(err);
                });
        });

        res.redirect("/");
    });
});

app.get("/articles", function (req, res) {
    db.Article.find({})
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.get("/articles/:id", function (req, res) {
    db.Article.findOne({ _id: req.params.id })
        .populate("comment")
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.post("/articles/:id", function (req, res) {
    db.Comment.create(req.body)
        .then(function (dbComment) {
            return db.Article.findOneAndUpdate(
                { _id: req.params.id },
                { comment: dbComment._id },
                { new: true }
            );
        })
        .then(function (dbArticle) {
            res.json(dbArticle);
        })
        .catch(function (err) {
            res.json(err);
        });
});

app.listen(PORT, function () {
    console.log("Running on port " + PORT);
});