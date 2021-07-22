/* MySQL.js v1.30 */
"use strict";
var mysql = require("mysql");
var fs = require("fs");

/* "mysql.json" から接続情報を読み取る。(ヘルパ関数) */
var getConf = () => {
  let confstr = fs.readFileSync("mysql.json", "utf-8");
  let conf = JSON.parse(confstr);
  return conf;
}


/* 結果セットを返すクエリー関数 */
/*  callback は結果の行数回コールされ、最後に null が返される。*/
exports.query = (sql, callback, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  let conn = mysql.createConnection(conf);
  conn.query(sql, (error, results, fields) => {
    if (error) {
       callback(error);
       conn.end();
    }
    else {
       for (let i = 0; i < results.length; i++) {
         callback(results[i], fields);
       }
       callback(null);
       conn.end();
    }
  });
}

/* Promise 結果セットを返すクエリー関数 */
exports.query_p = async (sql, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  return new Promise((resolve, reject) => {
      let conn = mysql.createConnection(conf);
      conn.query(sql, (error, results, fields) => {
       if (error) {
         reject(error);
       }
       else {
         resolve(results);
       }
     });
   });
}

/* コマンドを実行するクエリ関数. INSERT,DELETE,UPDATE などの場合 */
/*  callback は１回だけコールされる。値は何も返さない。*/
exports.execute = (sql, callback, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  let conn = mysql.createConnection(conf);
  conn.query(sql, (error, results, fields)=>{
      if (error) {
         callback(error);
         conn.end();
      }
      else {
         callback(null);
         conn.end();
      }
  });
}

/* Promise: コマンドを実行するクエリ関数. INSERT,DELETE,UPDATE などの場合 */
exports.execute_p = async (sql, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  return new Promise((resolve, reject) => {
    let conn = mysql.createConnection(conf);
    conn.query(sql, (error, results, fields)=>{
      if (error) {
        reject(error);
        conn.end();
      }
      else {
        resolve(null);
        conn.end();
      }
    });
  });
}

/* １つの値（スカラー）を返すクエリ関数. sql は1つの値を返すものであること。 */
exports.getValue = (sql, callback, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  let conn = mysql.createConnection(conf);
  conn.query(sql, (error, results, fields)=>{
      if (error) {
         callback(error);
         conn.end();
      }
      else {
         let row = results[0];
         let key = fields[0].name;
         let value = row[key];
         callback(value);
         conn.end();
      }
  });
}

/* Promise: １つの値（スカラー）を返すクエリ関数. sql は1つの値を返すものであること。 */
exports.getValue_p = async (sql, conf = null) => {
  return new Promise((resolve, reject) => {
      if (conf == null) {
        conf = getConf();
      }
      let conn = mysql.createConnection(conf);
      conn.query(sql, (error, results, fields)=> {
      if (error) {
         reject(error);
         conn.end();
      }
      else {
         let row = results[0];
         let key = fields[0].name;
         let value = row[key];
         resolve(value);
         conn.end();
      }
    });
  });
}


/* １つの行を返すクエリ関数。クエリ結果が複数行の場合は先頭行を返す。*/
exports.getRow = (sql, callback, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  let conn = mysql.createConnection(conf);
  conn.query(sql, (error, results, fields)=>{
      if (error) {
         callback(error, null);
         conn.end();
      }
      else {
         callback(null, results[0]);
         conn.end();
      }
  });
}

/* Promise: １つの行を返すクエリ関数。クエリ結果が複数行の場合は先頭行を返す。*/
exports.getRow_p = async (sql, conf = null) => {
  if (conf == null) {
    conf = getConf();
  }
  let conn = mysql.createConnection(conf);
  return new Promise((resolve, reject) => {
    conn.query(sql, (error, results, fields)=> {
    if (error) {
      reject(error);
      conn.end();
    }
    else {
      resolve(results[0]);
      conn.end();
    }
  });
  });
}
