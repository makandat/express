/* index.js */
"use strict";
const VERSION = "0.51";   // バージョン番号
var express = require('express');
var router = express.Router();
var mysql = require('./MySQL.js');
var dt = require('./DateTime.js');

var albums = [];  // Albums クエリー結果
var albumgroups = [];  // Albums.name 一覧結果
var page = null;   // HTTP応答ページ
const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, name, (SELECT COUNT(album) FROM PictureAlbum GROUP BY album HAVING album=id) AS count, info, bindata, groupname, `date` FROM Album";

/* アルバムグループ一覧を得る。*/
function getAlbumGroups(row) {
  if (row == null) {
    page.render('index', { "title": '画像アルバム for express4', "version": VERSION, "albums": albums, "albumgroups": albumgroups, "message": "" });
  }
  else {
    if (row.grpname == null) {
      albumgroups.push("");
    }
    else {
      albumgroups.push(row.grpname);
    }
  }
}

/* アルバム一覧を表示する。*/
function showAlbums(row) {
  if (row == null) {
    let sql2 = "SELECT DISTINCT groupname AS grpname FROM Album";
    mysql.query(sql2, getAlbumGroups);
  }
  else {
    let hid = "<a href=\"/pictalbum/" + row.id + "\">" + row.name + "</a>"
    albums.push([row.id, hid, row.count, row.info, row.bindata, row.groupname, dt.getDateString(row.date)]);
  }
}

/* セッションの値を初期化する。*/
function initSessionValues(req, force=false) {
  if (req.session.descend == undefined) {
    req.session.descend = false;
  }

  if (req.session.id_min == undefined) {
    req.session.id_min = 0;
  }

  if (req.session.id_max == undefined) {
    req.session.id_max = 1000000;
  }

  if (req.session.groupname == undefined) {
    req.session.groupname = "ALL";
  }

  if (force) {
    req.session.descend = false;
    req.session.id_min = 0;
    req.session.id_max = 1000000;
    req.session.groupname = "ALL";
  }
}

/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where;
  let orderby;

  if (req.session.descend) {
    // 降順
    orderby = " ORDER BY id DESC";
    if (req.session.groupname == "ALL") {
      where = ` WHERE id < ${req.session.id_max}`;
    }
    else if (req.session.groupname == "NONAME") {
      where = ` WHERE groupname = '' AND id < ${req.session.id_max}`;
    }
    else {
      where = ` WHERE groupname = '${req.session.groupname}' AND id > ${req.session.id_max}`;
    }
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
    if (req.session.groupname == "ALL") {
      where = ` WHERE id > ${req.session.id_min}`;
    }
    else if (req.session.groupname == "NONAME") {
      where = ` WHERE groupname = '' AND id > ${req.session.id_min}`;
    }
    else {
      where = ` WHERE groupname = '${req.session.groupname}' AND id > ${req.session.id_min}`;
    }
  }

  sql += (where + orderby + ` LIMIT ${LIMIT}`);
  return sql;
}


/*  リクエストハンドラ */
/* GET home page.  表示リセット */
router.get('/', function(req, res, next) {
  initSessionValues(req, true);
  page = res;
  let sql = SELECT0 + " LIMIT " + LIMIT;
  albums = [];
  albumgroups = [];
  mysql.query(sql, showAlbums);
});

/* 逆順で表示 */
router.get('/reverse', function(req, res, next) {
  initSessionValues(req);
  req.session.descend = ! req.session.descend;
  page = res;
  let sql = makeSelect(req);
  albums = [];
  albumgroups = [];
  mysql.query(sql, showAlbums);
});

/* ページの最初へ */
router.get('/first', function(req, res, next) {
  res.render('index', { "title": '画像アルバム for express4', "albums (first)": albums, "albumgroups": albumgroups });
});

/* 前のページのへ */
router.get('/prev', function(req, res, next) {
  res.render('index', { "title": '画像アルバム for express4', "albums (prev)": albums, "albumgroups": albumgroups });
});

/* 次のページのへ */
router.get('/next', function(req, res, next) {
  res.render('index', { "title": '画像アルバム for express4', "albums (next)": albums, "albumgroups": albumgroups });
});

/* ページの最後へ */
router.get('/last', function(req, res, next) {
  res.render('index', { "title": '画像アルバム for express4 (last)', "albums": albums, "albumgroups": albumgroups });
});

/* 指定された id を先頭として表示 */
router.get('/jump/:id', function(req, res, next) {
  res.render('index', { "title": '画像アルバム for express4 (last)', "albums": albums, "albumgroups": albumgroups });
});


/*  他のページから参照されるハンドラ */
/* 指定された画像ファイルをレスポンスとして返す。パラメータ path */
router.get("/sendImage", function(req, res, next) {
  res.sendFile(req.query.path);
});

/* BINDATA テーブルから画像を取り出してレスポンスとして返す。パラメータ BINDATA の id */
router.get("/extractImage", function(req, res, next) {
  var id = req.query.id;
  mysql.getValue("SELECT data FROM BINDATA WHERE id=" + id, (data) => {
    res.send(data);
  });
});

module.exports = router;
