/* creators.js */
'use strict';
var express = require('express');
var session = require('express-session');
var mysql = require('./MySQL.js');
var router = express.Router();

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
 

/* 結果を表示する。*/
async function showResults(res, creator) {
    let tableName = 'Pictures';
    let maxsn = await getMaxSN(res, tableName);
    let maxid = await getMaxId(res, tableName);
    let minid = await getMinId(res, tableName);
    let rowCount = await getRowCount(res, tableName);
    let marks = await getMarks();
    let sql = `SELECT id, title, creator, path, mark, info, fav, count, bindata, DATE_FORMAT(date, '%Y-%m-%d') AS DT FROM Pictures WHERE creator='${creator}'`;
    let results = [];
    mysql.query(sql, (row)=>{
      if (row != null) {
        let atitle = `<a href="/showfolder/?path=${row.path}" target="_blank">${row.title}</a>`;
        let acreator = `<a href="/selectcreator?creator=${row.creator}">${row.creator}</a>`;
        let afav = `<a href="/countup?id=${row.id}">${row.fav}</a>`;
        results.push([row.id, atitle, acreator, row.path, row.mark, row.info, afav, row.count, row.bindata, row.DT]);
      }
      else {
        let message = `テーブル ${tableName} の行数=${rowCount}, id の最小値=${minid}, id の最大値=${maxid}, sn の最大値=${maxsn}`;
        res.render('index', { title:creator, "message":message, "marks":marks, "results":results, 'display_menu0':'none', 'display_menu1':'inline' });
      }
   })
}
  
/* GET /creators */
router.get("/", function(req, res, next) {
    var result = [];
    const SQL = "SELECT id, creator, marks, info, fav, refcount, titlecount FROM Creators ORDER BY id";
    mysql.query(SQL, (row) => {
        if (row == null) {
            res.render('creators', {'title':'作者一覧', 'message':'Ctrl+F を押して作者の検索ができます。', 'result':result});
        }
        else {
            let acreator = `<a href="/creators/list?creator=${row.creator}" target="_blank">${row.creator}</a>`;
            result.push([row.id, acreator, row.marks, row.info, row.fav, row.refcount, row.titlecount]);
        }
    });
});

/* パラメータで指定された作者の作品一覧 */
router.get("/list", function(req, res, next) {
    let creator = req.query.creator.replace(/'/g, "''");
    showResults(res, creator);
});

module.exports = router;
