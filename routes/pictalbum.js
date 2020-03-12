/* pictalbum.js */
'use strict';
var express = require('express');
var router = express.Router();

var mysql = require('./MySQL.js');
var results = []; // クエリー結果
var page = null;   // HTTP応答ページ
const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, album, title, `path`, creator, info, fav, picturesid, DATE_FORMAT(`date`, '%Y-%m-%d') AS DT FROM PictureAlbum";

/* PictureAlbum テーブルの内容を表示する。*/
function showPictureAlbumList(row, fields) {
  if (row == null) {
    page.render('pictalbum', { "title": '画像アルバム for express4 (PictureAlbum)', "results": results, "message": "" });
  }
  else {
    results.push([row.id, row.album,row.title, row.path, row.creator, row.info, row.fav, row.bindata, row.picturesid, row.DT]);
  }    
}

/* BINDATA テーブルの画像一覧を表示する。*/
function showPictureAlbumThumbs(row, fields) {
  if (row == null) {
  
  }
  else {
      
  }  
}
  
/* セッションの値を初期化する。*/
function initSessionValues(req, force=false) {
  if (req.session.adescend == undefined) {
    req.session.adescend = false;
  }

  if (req.session.aid_min == undefined) {
    req.session.aid_min = 0;
  }

  if (req.session.aid_max == undefined) {
    req.session.aid_max = 1000000;
  }

  if (force) {
    req.session.adescend = false;
    req.session.aid_min = 0;
    req.session.aid_max = 1000000;
  }
}
  
/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where;
  let orderby;

  if (req.session.adecend) {
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
  mysql.query(sql, showPictureAlbumList);
});

/* id を指定して PictureAlbum テーブル一覧 */
router.get('/:album', function(req, res, next) {
  initSessionValues(req);
  page = res;
  let album = req.params.album;
  let sql = `${SELECT0} WHERE album = ${album} LIMIT ${LIMIT}`;
  results = [];
  mysql.query(sql, showPictureAlbumList);
});



module.exports = router;
