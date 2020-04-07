/* pictures.js */
'use strict';
var express = require('express');
var session = require('express-session');
var mysql = require('./MySQL.js');

const VERSION = "0.81";
const LIMIT = 200;

var router = express.Router();
const SELECT = "SELECT id, title, creator, path, mark, info, fav, count, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS DT FROM";

/* SELECT 文構築用 */
class SelectSQL {
  // コンストラクタ
  constructor(p) {
    this.select = SELECT;
    this.from = this.getFrom(p.mark);
    this.where = this.getWhere(p.sn, p.order);
    this.orderby = this.getOrderBy(p.order, p.time);
    this.limit = ` LIMIT ${LIMIT}`;
  }

  // SQL を返す。
  generate() {
    return this.select + this.from + this.where + this.orderby + this.limit;
  }

  // mark による対象テーブルを返す。
  getFrom(mark="") {
    let table = " Pictures";
    if (mark == "") {
      return table;
    }

    switch (mark) {
      case "ALL":
        break;

      case "MANGA":
        table = " PicturesManga";
        break;

      case "HCG":
        table = " PicturesHcg";
        break;

      case "DOUJIN":
        table = " PicturesDoujin";
        break;

      case "PIXIV":
        table = " PicturesPixiv";
        break;

      default:
        break;
    }
    return table;
  }

  // WHERE 句を作成
  getWhere(sn, order) {
    let where = " WHERE";
    let and = false;
    if (order == undefined || sn == undefined) {
      where = "";
    }
    else {
      switch (order) {
        case "1":
          where += ` sn <= ${sn}`;
          break;
        case "2":
          where += ` sn >= ${sn}`;
          break;
        case "3":
          where += ` sn <= ${sn}`;
          break;
        case "4":
          where += ` sn >= ${sn}`;
          break;
        default:
          where = "";
          break;
      }
    }

    return where;
  }

  // ORDER BY を得る。
  getOrderBy(order, time) {
    if (order == undefined && time == undefined) {
      return "";
    }
    let orderby = fromOrderCode(order);
    if (orderby == "")
      return "";
    else
      return " ORDER BY " + orderby;
  }
}

/* SELECT 文を作成する。*/
function makeSQL(p) {
  return new Promise((resolve)=>{
    let selectmaker = new SelectSQL(p);
    let sql;
    if (p.fav != undefined) {
      sql = SELECT + " Pictures WHERE fav <> 0"
    }
    else if (p.word != undefined) {
      sql = SELECT + ` Pictures WHERE title LIKE '%${p.word}%' OR creator LIKE '%${p.word}%' OR path LIKE '%${p.word}%' OR info LIKE '%${p.word}%'`;
    }
    else if (!(p.mark == "" || p.mark == "ALL" || p.mark == "DOUJIN" || p.mark == "HCG" || p.mark == "MANGA" || p.mark == "PIXIV")) {
      sql = SELECT + ` Pictures WHERE mark = '${p.mark}'`;
    }
    else if (p.creator != undefined) {
      sql = SELECT + ` Pictures WHERE creator = '${p.creator}'`;
    }
    else {
      sql = selectmaker.generate();
    }
    resolve(sql);
  });
}

/* マーク一覧を得る。*/
function getMarks() {
  return new Promise((resolve)=>{
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Pictures", (row) => {
      if (row != null) {
        marks.push(row.mark);
      }
      else {
        resolve(marks);
      }
    });
  });
}

/* sn の最大値を得る。*/
function getMaxSN(res, table='Pictures') {
  return new Promise((resolve)=>{
    mysql.getValue(`SELECT max(sn) AS maxSN FROM ${table}`, (v)=>{
      resolve(v);
    });
  })
}

/* id の最小値を得る。*/
function getMinId(res, table='Pictures') {
  return new Promise((resolve)=>{
    mysql.getValue(`SELECT min(id) AS maxSN FROM ${table}`, (v)=>{
      resolve(v);
    });
  })
}

/* id の最大値を得る。*/
function getMaxId(res, table='Pictures') {
  return new Promise((resolve)=>{
    mysql.getValue(`SELECT max(id) AS maxSN FROM ${table}`, (v)=>{
      resolve(v);
    });
  })
}

/* 行数を得る。*/
function getRowCount(res, table='Pictures') {
  return new Promise((resolve)=>{
    mysql.getValue(`SELECT count(id) AS maxSN FROM ${table}`, (v)=>{
      resolve(v);
    });
  })
}

/* テーブル名を得る。*/
function getTableName(mark="") {
  return new Promise((resolve)=>{
    let tableName = "Pictures";
    switch (mark) {
      case "MANGA":
        tableName = "PicturesManga";
        break;
      case "HCG":
        tableName = "PicturesHcg";
        break;
      case "DOUJIN":
        tableName = "PicturesDoujin";
        break;
      case "PIXIV":
        tableName = "PicturesPixiv"
        break;
      default:
        break;
    }
    resolve(tableName);
  });
}

/* テーブル名を得る。(同期版) */
function getTableNameSync(mark="") {
  let tableName = "Pictures";
  switch (mark) {
    case "MANGA":
      tableName = "PicturesManga";
      break;
    case "HCG":
      tableName = "PicturesHcg";
      break;
    case "DOUJIN":
      tableName = "PicturesDoujin";
      break;
    case "PIXIV":
      tableName = "PicturesPixiv"
      break;
    case "ALL":
      tableName = "Pictures"
      break;
    default:
      tableName = mark;
      break;
    }
    return tableName;
}

/* 順序コード変換 */
function fromOrderCode(c) {
  let str = "";
  switch (c) {
    case "1":
      str = "id DESC";
      break;
    case "2":
      str = "id ASC";
      break;
    case "3":
      str = "date DESC";
      break;
    case "4":
      str = "date ASC";
      break;
    default:
      break;
  }
  return str;

}


/* 結果を表示する。*/
async function showResults(res, p = {}) {
  if (p.mark == undefined) {
    p.mark = "";
  }
  let tableName = await getTableName(p.mark);
  let title = tableName;
  let maxsn = await getMaxSN(res, tableName);
  let maxid = await getMaxId(res, tableName);
  let minid = await getMinId(res, tableName);
  let rowCount = await getRowCount(res, tableName);
  let marks = await getMarks();
  let sql = await makeSQL(p);
  console.log(sql);
  let menu0 = 'inline';
  let menu1 = 'none';
  if (!(p.word == undefined && p.fav == undefined)) {
    menu0 = 'none';
    menu1 = 'inline';
  }
  if (p.title != undefined) {
    title = p.title;
  }
  let results = [];
  mysql.query(sql, (row)=>{
    if (row != null) {
      let atitle = `<a href="/showfolder/?path=${row.path}" target="_blank">${row.title}</a>`;
      let acreator = `<a href="/pictures/selectcreator?creator=${row.creator}">${row.creator}</a>`;
      let afav = `<a href="/pictures/countup?id=${row.id}">${row.fav}</a>`;
      let athumb;
      if (row.bindata == null || row.bindata == 0) {
        athumb = "";
      }
      else {
        athumb = `<img src="/bindata/extract/${row.bindata}" alt="${row.bindata}" />`;
      }
      results.push([row.id, atitle, acreator, row.path, row.mark, row.info, afav, row.count, athumb, row.DT]);
    }
    else {
      let message = `テーブル ${tableName} の行数=${rowCount}, id の最小値=${minid}, id の最大値=${maxid}, sn の最大値=${maxsn}`;
      res.render('pictures', { title:title, "message":message, "marks":marks, "results":results, 'display_menu0':menu0, 'display_menu1':menu1 });
    }
  })
}

/* お気に入り数を増やす。*/
function favincrease(res, id) {
  mysql.execute("CALL increaseFav(" + id +")", ()=>{
    showInfo(res, "お気に入り数", "お気に入り数を１増やしました。表示は自動的に更新されないのでリロードしてください。","info.jpg");
  });
};

/* 情報を表示する。*/
function showInfo(res, title, message, icon="info.jpg") {
  res.render('showInfo', {'title':title, 'message':message, 'icon':icon});
}


/* デフォルトの表示 */
router.get('/', function(req, res, next) {
  req.session.status = "";  // normal
  req.session.order = "1";  // id desc
  mysql.getValue("SELECT max(sn) FROM Pictures", (n)=>{
    req.session.sn = n;
    req.session.mark = "ALL";
    showResults(res, {'order':"1", 'title':'画像フォルダ一覧 (Pictures テーブル) ' + VERSION});
  });
});

/* /favorites: お気に入りが 0 以外の項目をリスト表示 */
router.get('/favorites', function(req, res, next) {
  req.session.status = "favorites";
  showResults(res, {'fav':true, 'title':'お気に入り一覧'})
});


/* 作者一覧表示 */
router.get('/creators', function(req, res, next) {
  let sql = "SELECT * FROM Creators ORDER BY creator";
  let results = [];
  mysql.query(sql, (row) => {
    if (row == null) {
      res.render('creators', {'title':'作者一覧', 'message':'Ctrl+F で作者の検索ができます。', 'results':results});
    }
    else {
      let acreator = `<a href="/pictures/selectcreator?creator=${row.creator}">${row.creator}</a>`;
      results.push([row.id, acreator, row.info, row.fav, row.refcount, row.titlecount]);
    }
  });
});

/* /orderby/:order  指定した順序のリスト表示 */
router.get('/orderby/:order', function(req, res, next) {
  req.session.status = "";  // normal
  req.session.order = req.params.order;
  switch (req.session.order) {
    case "1":
      req.session.sn = 1000000;
      break;
    case "2":
      req.session.sn = 0;
      break;
    case "3":
      req.session.sn = 1000000;
      break;
    case "4":
      req.session.sn = 0;
      break;
    default:
      break;
  }
  showResults(res, {'order':req.params.order, 'mark':req.session.mark})
});

/* /jump/:id 指定した id を先頭としてリスト表示 */
router.get('/jump/:id', function(req, res, next) {
  let tableName = getTableNameSync(req.session.mark);
  let pid = req.params.id;
  req.session.status = "";  // normal
  let sql = `SELECT count(id) FROM ${tableName} WHERE id=${pid}`;
  console.log(sql);
  mysql.getValue(sql, (n)=>{
    if (n == 0) {
      showInfo(res, 'エラー', '指定した id は存在しないため不正です。', 'cancel.png');
    }
    else {
      sql = `SELECT sn FROM ${tableName} WHERE id=${pid}`;
      mysql.getValue(sql, (n)=>{
        req.session.sn = n;
        showResults(res, {'mark':req.session.mark, 'sn':n, 'order':req.session.order});  
      });
    }
  });
});

/* /find/:word 指定したワードでフィルタリング表示 */
router.get('/find/:word', function(req, res, next) {
  req.session.mark = "ALL";
  req.session.order = "2";
  req.session.status = "find";
  showResults(res, {'word':req.params.word, 'mark':''})
});

/* /mark/:m  指定したマークでフィルタリング表示 */
router.get('/mark/:m', function(req, res, next) {
  req.session.status = "";
  req.session.mark = req.params.m;
  req.session.order = "1";
  let tableName = getTableNameSync(req.params.m);
  mysql.getValue("SELECT max(sn) FROM " + tableName, (n) => {
    req.session.sn = n;
    showResults(res, {'mark':req.params.m, 'sn':n, 'order':'1'});
  });
});

/* /first: 先頭のリストページ */
router.get('/first', function(req, res, next) {
  if (req.session.status == "") {
    switch (req.session.order) {
      case "1":
        req.session.sn = 1000000;
        break;
      case "2":
        req.session.sn = 1;
        break;
      case "3":
        req.session.sn = 1000000;
        break;
      case "4":
        req.session.sn = 1;
        break;
      default:
        break;
    }
    showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
  }
});

/* /prev: 前のリストページ */
router.get('/prev', function(req, res, next) {
  if (req.session.status == "") {
    switch (req.session.order) {
      case "1":
        req.session.sn += LIMIT;
        break;
      case "2":
        req.session.sn -= LIMIT;
        break;
      case "3":
        req.session.sn += LIMIT;
        break;
      case "4":
        req.session.sn -= LIMIT;
        break;
      default:
        break;
    }
    showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
  }
});

/* /next: 次のリストページ */
router.get('/next', function(req, res, next) {
  if (req.session.status == "") {
    switch (req.session.order) {
      case "1":
        req.session.sn -= LIMIT;
        break;
      case "2":
        req.session.sn += LIMIT;
        break;
      case "3":
        req.session.sn -= LIMIT;
        break;
      case "4":
        req.session.sn += LIMIT;
        break;
      default:
        break;
    }
    showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
  }
});

/* /last: 最後のリストページ */
router.get('/last', function(req, res, next) {
  let sql = "";
  let tableName = getTableNameSync(req.session.mark);
  if (req.session.status == "") {
    switch (req.session.order) {
      case "1":
        sql = `SELECT min(sn) FROM ${tableName}`;
        mysql.getValue(sql, (n)=>{
          req.session.sn = n + LIMIT;
          showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
        });
        break;
      case "2":
        sql = `SELECT max(sn) FROM ${tableName}`;
        mysql.getValue(sql, (n)=>{
          session.sn = n - LIMIT;
          showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
        });
        break;
      case "3":
        sql = `SELECT max(sn) FROM ${tableName}`;
        mysql.getValue(sql, (n)=>{
          req.session.sn = n - LIMIT;
          showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
        });
        break;
      case "4":
        sql = `SELECT max(sn) FROM ${tableName}`;
        mysql.getValue(sql, (n)=>{
          req.session.sn = n - LIMIT;
          showResults(res, {'mark':req.session.mark, 'sn':req.session.sn, 'order':req.session.order});
        });
        break;
      default:
        break;
    }
  }
});

/* /showfolder?path=dir: タイトルをクリックしたときそのフォルダの画像一覧表示 */
//    To showfolderRouter 

/* /selectcreator?creator=name: 作者をクリックしたとき、その作者の画像リスト */
router.get('/selectcreator', function(req, res, next) {
  showResults(res, {'creator':req.query.creator});
});

/* /countup?id=n: お気に入りをクリックしたとき、その画像のお気に入りカウントを増やす。*/
router.get('/countup', function(req, res, next) {
  favincrease(res, req.query.id);
});




/* エクスポート */
module.exports = router;
