/* modify_picture.js */
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('modify_picture');
});

module.exports = router;
