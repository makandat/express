/* index.js */
"use strict";
const VERSION = "1.10";   // バージョン番号
var express = require('express');
var os = require('os');
var router = express.Router();
var mysql = require('./MySQL.js');
var dt = require('./DateTime.js');
const LIMIT = 200;  // 1ページの表示数

const SELECT0 = "SELECT id, name, (SELECT COUNT(album) FROM PictureAlbum GROUP BY album HAVING album=id) AS count, info, bindata, groupname, `date` FROM Album WHERE mark='video'";

/* SQL を作成する。*/
function makeSelect(req) {
    let sql = SELECT0;
    let where;
    let orderby;
  
    if (req.session.desc) {
      // 降順
      orderby = " ORDER BY id DESC";
      if (req.session.groupname == "ALL") {
        where = "";
      }
      else if (req.session.groupname == "NONAME") {
        where = ` WHERE mark='video' AND (groupname = '' OR groupname IS NULL)`;
      }
      else {
        where = ` WHERE mark='video' AND groupname = '${req.session.groupname}'`;
      }
    }
    else {
      // 昇順
      orderby = " ORDER BY id ASC";
      if (req.session.groupname == "ALL") {
        where = "";
      }
      else if (req.session.groupname == "NONAME") {
        where = ` WHERE mark = 'video' AND (groupname = '' OR groupname IS NULL)`;
      }
      else {
        where = ` WHERE mark = 'video' AND groupname = '${req.session.groupname}'`;
      }
    }
  
    sql += (where + orderby + ` LIMIT ${LIMIT}`);
    return sql;  
}

/* アルバム一覧を表示 */
function showAlbum(req, res) {
  let albums = [];
  let sql = makeSelect(req);
  mysql.query(sql, (row) => {
    if (row == null) {
      let albumgroups = [];
      let sql = "SELECT DISTINCT groupname AS grpname FROM Album WHERE mark = 'video'";
      mysql.query(sql, (row) =>{
        if (row == null) {
          res.render('video', {'title':'ビデオアルバム for Express4', 'version':VERSION, 'message':'アルバムグループ：' + req.session.groupname, 'albums':albums, 'albumgroups':albumgroups});
        }
        else {
          if (row.grpname != null) {
            albumgroups.push(row.grpname);
          }
        }
      });  
    }
    else {
      let hid = `<a href="/videoalbum/?album=${row.id}" target="_blank">${row.name}</a>`;
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
    showAlbum(req, res);  
  }
});

/* 逆順で表示 */
router.get('/reverse', function(req, res, next) {
  req.session.desc = ! req.session.desc;
  showAlbum(req, res);
});
  
  
/* アルバムグループの指定 */
router.get('/groupname', function(req, res, next) {
  req.session.groupname = req.query.name;
  showAlbum(req, res);
});


/* ビデオ一覧表示 */
router.get('/videolist', function(req, res, next) {
    let album = req.query.album;
    let results = [];
    let sql = "SELECT * FROM Videos WHERE album = " + album;
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('videolist', {'title':'ビデオ一覧 (album=' + album + ")", 'message':'', 'results':results})
        }
        else {
            results.push([row.id, row.album, row.title, row.path, row.creator, row.series, row.mark, row.info, row.fav, row.count, row.bindata]);
        }
    });
});



/* ビデオを追加 */
function insertVideo(req, res) {
    let {title, album, path, creator, series, mark, info, fav, bindata} = req.body;
    title = title.replace(/'/g, "''").trim();
    path = path.replace(/'/g, "''").trim();
    if (os.platform() == "win32") {
      path = path.replace(/\\/g, "/");
    }
    let sql = `INSERT INTO Videos VALUES(NULL, ${album}, '${title}', '${path}', '${creator}', '${series}', '${mark}', '${info}', '${fav}', 0, ${bindata}, 0)`;
    mysql.execute(sql, () => {
        res.render('modify_video', {'message':title + 'を追加しました。', 'id':'', 'album':album, 'title':title, 'path':path, 'creator':creator, 'series':series, 'mark':mark, 'info':info, 'fav':fav, 'bindata':bindata});
    });
}

/* ビデオを更新 */
function updateVideo(req, res) {
    let {id, album, title, path, creator, series, mark, info, fav, bindata} = req.body;
    title = title.replace(/'/g, "''").trim();
    path = path.replace(/'/g, "''").trim();
    if (os.platform() == "win32") {
      path = path.replace(/\\/g, "/");
    }
    let sql = `UPDATE Videos SET album=${album}, title='${title}', path='${path}', creator='${creator}', series='${series}', mark='${mark}', info='${info}', fav=${fav}, bindata=${bindata} WHERE id = ${id}`;
    mysql.execute(sql, () => {
        res.render('modify_video', {'message':"id = " + id + 'を更新しました。', 'id':id, 'album':album, 'title':title, 'path':path, 'creator':creator, 'series':series, 'mark':mark, 'info':info, 'fav':fav, 'bindata':bindata});
    });
}

/* ビデオの追加・更新 */
router.get('/modify_video', function(req, res, next) {
    res.render('modify_video', {'message':'', 'id':'', 'album':'', 'title':'', 'path':'', 'creator':'', 'series':'', 'mark':'', 'info':'', 'fav':'0', 'bindata':'0'});
});

/* ビデオの追加・更新 POST */
router.post('/modify_video', function(req, res, next) {
    let id = req.body.id;
    if (id == "") {
        insertVideo(req, res);
    }
    else {
        updateVideo(req, res);
    }
});


/* id が存在するかチェックする。*/
function checkId(id) {
    return new Promise((resolve) => {
        mysql.getValue("SELECT count(id) FROM Videos WHERE id=" + id, (n) => {
            resolve(n > 0);
        });
    });
}


/* データ確認 ヘルパ関数 */
async function confirmVideo(req, res) {
    let id = req.params.id;
    let b = await checkId(id);
    if (b == false) {
        res.render('showInfo', {'title':'エラー', 'message':`id = ${id} は存在しません。`, 'icon':'cancel.png', 'link':null});
    }
    else {
        mysql.getRow("SELECT * FROM Videos WHERE id=" + id, (row) => {
            res.render('modify_video', {'message':'id = ' + id + ' が検索されました。', 'id':row.id, 'album':row.album, 'title':row.title, 'path':row.path, 'creator':row.creator, 'mark':row.mark, 'series':row.series, 'info':row.info, 'fav':row.fav, 'bindata':row.bindata});
        });
    }
}

/* ビデオの追加・更新 データ確認 */
router.get('/confirm/:id', function(req, res, next) {
    confirmVideo(req, res);
});



/* エクスポート */
module.exports = router;

