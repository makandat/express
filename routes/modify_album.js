/* modify_album.js */
var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('modify_albums');
});

module.exports = router;
