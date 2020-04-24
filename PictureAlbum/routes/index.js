/* index.js */
"use strict";
var express = require('express');
var fs = require('fs');
var router = express.Router();
var mysql = require('./MySQL.js');
var dt = require('./DateTime.js');

const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, name, mark, (SELECT COUNT(album) FROM PictureAlbum GROUP BY album HAVING album=id) AS count, info, bindata, groupname, `date` FROM Album";

/* package.json からバージョン番号を得る。*/
function getVersion() {
  let pstr = fs.readFileSync("package.json", "utf-8");
  let p = JSON.parse(pstr);
  return p.version;
}


/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where = " WHERE mark='picture'";
  let orderby = "";

  if (req.session.desc) {
    // 降順
    orderby = " ORDER BY id DESC";
    if (req.session.groupname == "ALL") {
    }
    else if (req.session.groupname == "NONAME") {
      where = ` WHERE mark='picture' AND (groupname = '' OR groupname IS NULL)`;
    }
    else {
      where = ` WHERE mark='picture' AND groupname = '${req.session.groupname}'`;
    }
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
    if (req.session.groupname == "ALL") {
    }
    else if (req.session.groupname == "NONAME") {
      where = ` WHERE mark = 'picture' AND (groupname = '' OR groupname IS NULL)`;
    }
    else {
      where = ` WHERE mark = 'picture' AND groupname = '${req.session.groupname}'`;
    }
  }

  sql += (where + orderby + ` LIMIT ${LIMIT}`);
  return sql;
}


/* アルバム一覧を表示 */
function showResults(req, res) {
  let albums = [];
  let sql = makeSelect(req);
  mysql.query(sql, (row) => {
    if (row == null) {
      let albumgroups = [];
      let mark = 'picture';
      if (req.query.mark != undefined) {
        mark = req.query.mark;
      }
      let sql = `SELECT DISTINCT groupname AS grpname FROM Album WHERE mark = '${mark}'`;

      mysql.query(sql, (row) =>{
        if (row == null) {
          res.render('index', {'title':'画像アルバム for Express4', 'version':getVersion(), 'message':'アルバムグループ：' + req.session.groupname, 'albums':albums, 'albumgroups':albumgroups});
        }
        else {
          if (row.grpname != null) {
            albumgroups.push(row.grpname);
          }
        }
      });  
    }
    else {
      let hid = `<a href="/pictalbum/?album=${row.id}" target="_blank">${row.name}</a>`;
      let abin;
      if (row.bindata == null || row.bindata == 0) {
        abin = "";
      }
      else {
        abin = `<img src="/bindata/extract/${row.bindata}" alt="${row.bindata}" />`;
      }
      albums.push([row.id, hid, row.count, row.info, abin, row.groupname, dt.getDateString(row.date)]);
    }
  });
}

/*  リクエストハンドラ */
/* GET home page.  表示リセット */
router.get('/', function(req, res, next) {
  if (req.session.user == undefined) {
    res.redirect('/users');
  }
  else {
    req.session.desc = false;
    req.session.groupname = "ALL";
    showResults(req, res);  
  }
});

/* 逆順で表示 */
router.get('/reverse', function(req, res, next) {
  req.session.desc = ! req.session.desc;
  showResults(req, res);
});


/* アルバムグループの指定 */
router.get('/groupname', function(req, res, next) {
  req.session.groupname = req.query.name;
  showResults(req, res);
});

/* 画像ファイルを送る。*/
router.get("/getimage", function(req, res) {
  res.sendFile(req.query.path);
});



/* エクスポート */
module.exports = router;
