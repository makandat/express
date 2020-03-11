/* modify_folders.js */
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('modify_folders');
});

module.exports = router;