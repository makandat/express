/* bindata.js */
'use strict';
var express = require('express');
var router = express.Router();

var mysql = require('./MySQL.js');

const LIMIT = 200;  // 1ページの表示数
const SELECT0 = "SELECT id, title, original, datatype, info, size FROM BINDATA WHERE (datatype='.jpg' OR datatype='.png')";

/* BINDATA テーブルの内容一覧を表示する。*/
function showBINDATAList(req, res) {
  let sql = makeSelect(req);
  let results = [];
  mysql.query(sql, (row) => {
    if (row == null) {
      res.render('bindata', { "title": '画像サムネール一覧 (BINDATA テーブル)', "results": results, "message": "データの挿入や更新はコマンドで行う。詳細はヘルプを参照。" });
    }
    else {
      let aextract = `<img src="/bindata/extract/${row.id}" alt="id=${row.id}" />`;
      results.push([row.id, aextract, row.title, row.original, row.datatype, row.info, row.size]);
    }  
  });
}


/* SELECT 文を作成する。*/
function makeSelect(req) {
  let sql = SELECT0;
  let where;
  let orderby;

  if (req.session.desc) {
    // 降順
    orderby = " ORDER BY id DESC";
    where = " AND sn <= " + req.session.sn;
  }
  else {
    // 昇順
    orderby = " ORDER BY id ASC";
    where = " AND sn >= " + req.session.sn;
  }

  sql = sql + where + orderby + " LIMIT " + LIMIT;
  return sql;
}



/*  リクエストハンドラ */
/* GET BINDATA table listing. */
router.get('/', function(req, res, next) {
  req.session.sn = 0;
  req.session.desc = false;
  showBINDATAList(req, res);
});

/* 逆順で表示 */
router.get('/reverse', function(req, res, next) {
  req.session.desc = !req.session.desc;
  showBINDATAList(req, res);
});

/* 先頭のページへ */
router.get('/first', function(req, res, next) {
  if (req.session.desc) {
    req.session.sn = 1000000;
  }
  else {
    req.session.sn = 0;
  }
  showBINDATAList(req, res);
});

/* 前のページへ */
router.get('/prev', function(req, res, next) {
  if (req.session.desc) {
    req.session.sn += LIMIT;
  }
  else {
    req.session.sn -= LIMIT;
  }
  showBINDATAList(req, res);
});

/* 次のページへ */
router.get('/next', function(req, res, next) {
  if (req.session.desc) {
    req.session.sn -= LIMIT;
  }
  else {
    req.session.sn += LIMIT;
  }
  showBINDATAList(req, res);
});

/* 最後のページへ */
router.get('/last', function(req, res, next) {
  if (req.session.desc) {
    req.session.sn = LIMIT;
    showBINDATAList(req, res);
  }
  else {
    mysql.getValue("SELECT max(sn) FROM BINDATA", (n) =>{
      req.session.sn = n - LIMIT;
      showBINDATAList(req, res);
    });
  }
});


/* 指定 id から表示する。(表示は昇順へもどる) */
router.get('/jump/:id', function(req, res, next) {
  req.session.desc = false;
  mysql.getValue("SELECT sn FROM BINDATA WHERE id=" + req.params.id, (sn) => {
    req.session.sn = sn;
    showBINDATAList(req, res);
  })
});

/* BINDATA テーブルから画像データを得る。 */
router.get('/extract/:id', function(req, res, next){
  let id = req.params.id;
  let sql = "SELECT datatype, data FROM BINDATA WHERE id = " + id;
  mysql.getRow(sql, (row) => {
    let type;
    if (row == undefined) {
      res.send(null);
    }
    else {
      if (row.datatype == undefined) {
        type = 'image/jpeg';
      }
      else if (row.datatype == '.jpg') {
        type = 'image/jpeg';
      }
      else if (row.datatype == '.png') {
        type = 'image/png';
      }
      else {
        type = "image/gif";
      }
      res.set("Content-Type", type);
      res.send(row.data);  
    }
  });
});


/* エクスポート */
module.exports = router;
