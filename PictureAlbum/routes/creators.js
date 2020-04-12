
/* creators.js */
'use strict';
var express = require('express');
var session = require('express-session');
var mysql = require('./MySQL.js');

var router = express.Router();

/* 作者が登録済みかチェック */
function checkCreator(creator) {
  return new Promise((resolve) => {
    mysql.getValue(`SELECT count(*) FROM Creators WHERE creator='${creator}'`, (v) => {
      resolve(v > 0);
    });
  }); 
}

/* 次の id を得る。*/
function getNextId() {
  return new Promise((resolve) => {
    mysql.getValue("SELECT max(id)+1 AS n FROM Creators", (n) => {
      resolve(n);
    });
  });
}

/* 作者追加 */
async function insert_creator(req, res) {
  let {id, creator, marks, info, fav, refcount, titlecount} = req.body;
  if (creator == "") {
    res.render('showInfo', {'title':'エラー', 'message':'作者が空欄です。', 'icon':'cancel.png'});
    return;
  }
  let b = await checkCreator(creator);
  if (b) {
    res.render('showInfo', {'title':'エラー', 'message':'作者がすでに登録済みです。', 'icon':'cancel.png'});
    return;
  }
  id = await getNextId();
  creator = creator.replace(/'/g, "''");
  let sql = `INSERT INTO Creators VALUES(${id}, '${creator}', '${marks}', '${info}', ${fav}, ${refcount}, ${titlecount})`;
  mysql.execute(sql, () => {
    res.render('modify_creator', {'message':'作者 ' + creator + " を追加しました。", 'id':id, 'creator':creator, 'marks':marks, 'info':info, 'fav':fav, 'refcount':refcount, 'titlecount':titlecount});
  });
}

/* 作者情報更新 */
async function update_creator(req, res) {
  let {id, creator, marks, info, fav, refcount, titlecount} = req.body;
  if (isNaN(parseInt(id))) {
    res.render('showInfo', {'title':'エラー', 'message':'id は数でなければなりません。', 'icon':'cancel.png'});
    return;
  }
  if (creator == "") {
    res.render('showInfo', {'title':'エラー', 'message':'作者が空欄です。', 'icon':'cancel.png'});
    return;
  }
  creator = creator.replace(/'/g, "''");
  info = info.replace(/'/g, "''");
  let sql = `UPDATE Creators SET id='${id}', marks='${marks}', info='${info}', fav=${fav}, refcount=${refcount}, titlecount=${titlecount} WHERE creator = '${creator}'`;
  mysql.execute(sql, () => {
    res.render('modify_creator', {'message':'作者 ' + creator + " を更新しました。", 'id':id, 'creator':creator, 'marks':marks, 'info':info, 'fav':fav, 'refcount':refcount, 'titlecount':titlecount});
  });

}


/* 作者一覧表示 */
router.get('/', function(req, res, next) {
  let sql = "SELECT * FROM Creators ORDER BY creator";
  let results = [];
  mysql.query(sql, (row) => {
    if (row == null) {
      res.render('creators', {'title':'作者一覧', 'message':'Ctrl+F で作者の検索ができます。', 'results':results});
    }
    else {
      let acreator = `<a href="/pictures/selectcreator?creator=${row.creator}">${row.creator}</a>`;
      results.push([row.id, acreator, row.marks, row.info, row.fav, row.refcount, row.titlecount]);
    }
  });
});


/* 作者の追加・更新 */
router.get('/modify_creator', function(req, res) {
  res.render('modify_creator', {'message':'id が空欄の場合は追加、数の場合は更新となります。', 'id':'', 'creator':'', 'marks':'', 'info':'', 'fav':'0', 'refcount':'0', 'titlecount':'0'});
});

/* 作者の追加・更新 POST  */
router.post('/modify_creator', function(req, res) {
  let id = req.body.id;
  if (id == "") {
    insert_creator(req, res);
  }
  else {
    update_creator(req, res);
  }
});

/* 作者の追加・更新 データ確認  */
router.get('/confirm_creator', function(req, res) {
  let id = req.query.id;
  if (isNaN(parseInt(id))) {
    res.render('showInfo', {'title':'エラー', 'message':'id は数でなければなりません。', 'icon':'cancel.png'})
  }
  else {
    mysql.getRow("SELECT * FROM Creators WHERE id = " + id, (row) => {
      res.render('modify_creator', {'message':`id ${id} が検索されました。`, 'id':id, 'creator':row.creator, 'marks':row.marks, 'info':row.info, 'fav':row.fav, 'refcount':row.refcount, 'titlecount':row.titlecount})
    });    
  }
});

/* 降順で表示 */
router.get('/desc', function(req, res) {
  let sql = "SELECT * FROM Creators ORDER BY creator DESC";
  let results = [];
  mysql.query(sql, (row) => {
    if (row == null) {
      res.render('creators', {'title':'作者一覧', 'message':'Ctrl+F で作者の検索ができます。', 'results':results});
    }
    else {
      let acreator = `<a href="/pictures/selectcreator?creator=${row.creator}">${row.creator}</a>`;
      results.push([row.id, acreator, row.marks, row.info, row.fav, row.refcount, row.titlecount]);
    }
  });
});

/* 昇順で表示 */
router.get('/asc', function(req, res) {
  let sql = "SELECT * FROM Creators ORDER BY creator ASC";
  let results = [];
  mysql.query(sql, (row) => {
    if (row == null) {
      res.render('creators', {'title':'作者一覧', 'message':'Ctrl+F で作者の検索ができます。', 'results':results});
    }
    else {
      let acreator = `<a href="/pictures/selectcreator?creator=${row.creator}">${row.creator}</a>`;
      results.push([row.id, acreator, row.marks, row.info, row.fav, row.refcount, row.titlecount]);
    }
  });
});


/* エクスポート */
module.exports = router;
  