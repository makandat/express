/* pictures.js */
var express = require('express');
var router = express.Router();
var mysql = require('./MySQL.js');
var results = []; // クエリー結果
var page = null;   // HTTP応答ページ
const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, title, creator, path, mark, info, fav, count, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS DT FROM Pictures";

/* Pictures テーブルの内容を表示する。*/
function showPictures(row, fields) {
  if (row == null) {
    page.render('pictures', { "title": '画像アルバム for express4 (Pictures)', "results": results, "message": "" });
  }
  else {
    let modifylink = `<a href="/modify_folder/confirm/${row.id}" target="_blank">${row.id}</a>`;
    let showlink = `<a href="/showFolderImages/${row.id}">${row.title}</a>`;
    results.push([modifylink, showlink, row.creator, row.path, row.mark, row.info, row.fav, row.count, row.bindata, row.DT]);
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

/* 先頭の id を指定して表示 */
router.get('/:id', function(req, res, next) {
  initSessionValues(req, true);
  page = res;
  let id = req.params.id;
  req.session.criteria.id = id;
  let sql = makeSelect(req);
  results = [];
  mysql.query(sql, showPictures);
});

/* フォルダ内の画像一覧を表示する。*/
router.get('/showFolderImages', function(req, res, next) {

});

module.exports = router;