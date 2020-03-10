/* pictures.js */
var express = require('express');
var router = express.Router();
var mysql = require('./MySQL.js');
var results = []; // クエリー結果
var page = null;   // HTTP応答ページ
const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, title, creator, path, mark, info, fav, count, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS DT FROM Pictures";

/* Pictures テーブルの内容を表示する。*/
function showPictures(row) {
  if (row == null) {
    page.render('pictalbum', { "title": '画像アルバム for express4 (Pictures)', "results": results, "message": "" });
  }
  else {
    results.push([row.id, row.title, row.creator, row.path, row.mark, row.info, row.fav, row.count, row.bindata, row.DT]);
  }    
}

/* Pictures テーブルの画像一覧を表示する。*/
function showPictureAlbumThumbs(row) {
  if (row == null) {
  
  }
  else {
      
  }  
}
  
/* セッションの値を初期化する。*/
function initSessionValues(req, force=false) {
  if (req.session.pdescend == undefined) {
    req.session.pdescend = false;
  }

  if (req.session.criteria == undefined) {
    req.session.criteria = {};
  }

  if (req.session.pid_min == undefined) {
    req.session.pid_min = 0;
  }

  if (req.session.pid_max == undefined) {
    req.session.pid_max = 1000000;
  }

  if (force) {
    req.session.adescend = false;
    req.session.criteria = {};
    req.session.aid_min = 0;
    req.session.aid_max = 1000000;
  }
}
  
/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where;
  let orderby;

  if (req.session.pdecend) {
    // 降順
    orderby = " ORDER BY id DESC";
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
  }
}



/*  リクエストハンドラ */

/* デフォルトハンドラ */
router.get('/', function(req, res, next) {
  initSessionValues(req, true);
  page = res;
  let sql = `${SELECT0} LIMIT ${LIMIT}`;
  results = [];
  mysql.query(sql, showPictures);
});

router.get('/:id', function(req, res, next) {
  initSessionValues(req, true);
  page = res;
  let id = req.params.id;
  req.session.criteria.id = id;
  let sql = makeSelect(req);
  results = [];
  mysql.query(sql, showPictures);
});

module.exports = router;