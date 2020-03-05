"use strict";
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  let albums = [[0, "title",0, "",null,"group","2019-03-05"]];
  let albumgroups = [];
  res.render('index', { "title": '画像アルバム for express4', "albums": albums, "albumgroups": albumgroups });
});

module.exports = router;
