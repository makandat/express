/* index.js */
'use strict';
const express = require('express');
const router = express.Router();
const fs = require('fs');
const os = require('os');
const path = require('path');
const mysql = require("./MySQL.js");
const fso = require("./FileSystem.js");
const dto = require("./DateTime.js");
const com = require("./Common.js");
//const { render } = require('ejs');
const session = require('express-session');
//const { checkServerIdentity } = require('tls');

/* package.json からアプリ名を得る。*/
function getAppName() {
  let pstr = fs.readFileSync("package.json", "utf-8");
  let p = JSON.parse(pstr);
  return p.name;
}

/* package.json からバージョン番号を得る。*/
function getVersion() {
  let pstr = fs.readFileSync("package.json", "utf-8");
  let p = JSON.parse(pstr);
  return p.version;
}

/* package.json からリリース日を得る。*/
function getRelease() {
  let pstr = fs.readFileSync("package.json", "utf-8");
  let p = JSON.parse(pstr);
  return p.release;
}

/* 動作環境のチェック */
async function checkEnv() {
  return new Promise(async (resolve, reject) => {
    // フォルダ
    let mypc = fso.getDirectory(__dirname);
    if (!fso.exists(mypc + "/uploads")) {
      fs.mkdirSync(mypc + "/uploads");
    }
    if (!fso.exists(mypc + "/tmp")) {
      fs.mkdirSync(mypc + "/tmp");
    }
    // DB
    try {
      let myconf = fs.readFileSync(mypc + "/mysql.json", "utf-8");
      let conf = JSON.parse(myconf);
      let sql = "SELECT table_name FROM information_schema.tables WHERE table_schema='" + conf.database +"'";
      let result = await mysql.query_p(sql);
      let n = 0;
      for (let row of result) {
        if (row.table_name) {
          if (row.table_name.toLowerCase() == "pictures") {
            n++;
          }  
        }
        else {
          // row.table_name == undefined の場合のエラー回避策
          n = -1;
        }
      }
      if (n == 0) {
        resolve("データベースのオブジェクトがないか、足りません。");
      }
      // JSON
      let myfolders = fs.readFileSync(mypc + "/folders.json");
      let folders = JSON.parse(myfolders);
      if (com.isWindows()) {
        if (!/"^\w:.*/.test(folders[0])) {
          resolve("folders.json の書式が正しくありません。");
        }
        else {
          resolve("");
        }
      }
      else {
        if (!folders[0].startsWith('"/')) {
          resolve("");
        }
        else {
          resolve("folders.json の書式が正しくありません。");
        }
      }
    }
    catch (err) {
      resolve("エラー：" + err.message);
    }
  });
}

/* GET home page. */
router.get('/', async (req, res, next) => {
  let title = getAppName() + ": " + os.hostname;
  let message = await checkEnv();
  res.render('index', { title: title, version: getVersion(), release_date: getRelease(), message:message});
});

// /img フォルダの表示
router.get('/viewimgfolder', (req, res) => {
  let dir = fso.getDirectory(__dirname).replace(/\\/g, "/") + "/public/img";
  let images = [];
  fso.getFiles(dir, [".jpg", ".png", ".gif"], (files) => {
    let images = [];
    for (let p of files) {
      p = p.replace(/\\/g, "/");
      let fn = fso.getFileName(p);
      images.push(fn);
    }
    res.render("viewimgfolder", {images:images});
  });
});

// アルバム一覧を返す。(markごと)
router.get('/getAlbums/:kind', async (req, res) => {
  let kind = req.params.kind;
  let sql = "SELECT id, `name`, mark, info, bindata, groupname, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Album";
  if (kind) {
    sql +=  ` WHERE mark='${kind}'`;
  }
  let result = await mysql.query_p(sql);
  res.json(result);
});

// プレイリスト一覧を返す。
router.get('/getPlaylists', async (req, res) => {
  let sql = "SELECT id, title, items, info, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Playlists";
  let result = await mysql.query_p(sql);
  res.json(result);
});

// プレイリストを演奏する
router.get("/playlist", (req, res) => {
  let pid = req.query.list;
  mysql.getRow("SELECT id, title, items, info, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Playlists WHERE id=" + pid, (err,row) => {
    let list = row.items.split("\n");
    res.render("playMusic", {title:row.title, items:list});
  });
});

// アルバムの内容一覧を返す。
//    (/music/showContent/?album=... などを使う方がよい)
router.get('/showAlbumContent/:id', async (req, res) => {
  let id = req.params.id;
  let sql = "SELECT mark FROM Album WHERE id=" + id;
  let mark = await mysql.getValue_p(sql);
  let tableName = getTableName(mark);
  sql = `SELECT * FROM ${tableName} WHERE album=${id}`;
  let result = await mysql.query_p(sql);
  res.render('showAlbumContent', {title:"id: " + id + "アルバムの内容一覧", message:"番号" + id + "のアルバム内容が検索されました。", result:result});
});

// アルバムのタイトルを返す。
router.get('/getAlbumTitle/:id' ,async (req, res) => {
  let id = req.params.id;
  let name = "";
  if (id) {
    let sql = "SELECT name FROM Album WHERE id=" + id;
    let name = await mysql.getValue_p(sql);
  }
  res.sendText(name);
});

// 指定したアルバムのデータを返す。
router.get('/getAlbum/:id', async (req, res) => {
  let id = req.params.id;
  let name = "";
  if (id) {
    let sql = "SELECT id, `name`, mark, info, bindata, groupname, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Album WHERE id=" + id;
    let row = await mysql.getRow_p(sql);
    res.json(row);
  }
  else {
    res.json({});
  }
});

// 指定したパスのファイルをダウンロードする。
router.get('/download', async (req, res) => {
  let path = req.query.path;
  let body = await fs.promises.readFile(path);
  let fileName = fso.getFileName(path);
  res.set({'Content-Disposition': `attachment; filename=${fileName}`});
  res.send(body);
});

// アルバム一覧の表示
router.get('/showAlbums/:mark', async (req, res) => {
  let mark = req.params.mark;
  let groupname = req.query.groupname;
  let message = "";
  if (session.album_sortdesc == undefined) {
    session.album_sortdesc = false;
  }
  else if (req.query.reverse) {
    session.album_sortdesc = !session.album_sortdesc;
  }
  let sql = "SELECT id, name, mark, info, bindata, groupname, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Album";
  let markName = "";
  let groupnames = await mysql.query_p("SELECT DISTINCT groupname FROM Album");
  switch (mark) {
    case "0":
      if (groupname) {
        let result = await mysql.query_p(`SELECT id, name, mark, info, bindata, groupname, DATE_FORMAT(date, '%Y-%m-%d') AS date FROM Album WHERE groupname='${groupname}'`);
        res.render('showAlbums', {message:`グループ "${groupname}" が検索されました。`, mark:"", result:result, groupnames:groupnames});
      }
      else {
        res.render('showAlbums', {message:"", mark:"", groupnames:groupnames, result:[]});
      }
      return;
    case "all":
      markName = "すべて";
      break;
    case "picture":
      markName = "画像フォルダ";
      sql += " WHERE mark = 'picture'";
      break;
    case "video":
      markName = "動画";
      sql += " WHERE mark = 'video'";
      break;
    case "music":
      markName = "音楽";
      sql += " WHERE mark = 'music'";
      break;
    case "project":
      markName = "プロジェクト";
      sql += " WHERE mark = 'project'";
      break;
    case "document":
      markName = "文書";
      sql += " WHERE mark = 'document'";
      break;
    default: // other
      markName = "その他";
      sql += " WHERE NOT(mark='picture' OR mark='video' OR mark='music' OR mark='project' OR mark='document')";
      break;
  }
  if (session.album_sortdesc) {
    sql += " ORDER BY id DESC";
  }
  let result = await mysql.query_p(sql);
  if (result.length == 0) {
    message = "アルバムが登録されていません。";
  }
  
  res.render('showAlbums', {message:message, result:result, mark:markName, groupnames:groupnames});
});

// アルバムグループ一覧の表示
router.get('/showAlbumGroups', (req, res) => {
  let groupNames = [];
  mysql.query('SELECT DISTINCT groupname FROM Album ORDER BY groupname', (row, fields) => {
    if (row == null) {
      res.render('showAlbumGroups', {message:"", result:groupNames});
    }
    else {
      if (row.groupname) {
        groupNames.push(row.groupname);
      }
    }
  });
});

// アルバムの作成・修正 (GET)
router.get('/addModifyAlbum', (req, res) => {
  let values = {
    id: req.query.id ? req.query.id : null,
    name: "",
    mark: req.query.mark ? req.query.mark : "",
    info: "",
    bindata: 0,
    groupname: ""
  };
  let groups = [];
  let sql = "";
  if (values.mark == "") {
    sql = "SELECT DISTINCT groupname FROM Album ORDER BY groupname";
  }
  else {
    sql = `SELECT DISTINCT groupname FROM Album WHERE mark='${values.mark}' ORDER BY groupname`;
  }
  mysql.query(sql, (row) => {
    if (row) {
      groups.push(row.groupname);
    }
    else {
      mysql.getRow("SELECT * FROM Album WHERE id=" + values.id, (err, row) => {
        if (err) {
          res.render('showInfo', {title:"エラー", message:err.message, incon:"cancel.png"});
        }
        else {
          values.name = row.name;
          values.info = row.info ? row.info : "";
          values.bindata = row.bindata ? row.bindata : 0;
          values.groupname = row.groupname ? row.groupname : "";
          res.render('addModifyAlbum', {message:"", values:values, groupnames:groups});
        }
      });
    }
  });
});

// アルバムの作成・修正 (POST)
router.post('/addModifyAlbum', async (req, res) => {
  let values = {
    id: req.body.id,
    name: req.body.name.replace(/'/g,"''"),
    mark: req.body.mark,
    info: req.body.info.replace(/'/g,"''"),
    bindata: req.body.bindata,
    groupname: req.body.groupname
  };
  // グループ名一覧を得る。
  let groups = [];
  mysql.query(`SELECT DISTINCT groupname AS gn FROM Album where mark='${values.mark}' ORDER BY groupname`, (row) => {
    if (row) {
      groups.push(row.gn);
    }
    else {
      if (values.id) {
        // 更新
        let update = `UPDATE Album SET name='${values.name}', mark='${values.mark}', info='${values.info}', bindata=${values.bindata}, groupname='${values.groupname}' WHERE id = ${values.id}`;
        mysql.execute(update, (err) => {
          if (err) {
            res.render('addModifyAlbum', {message:err.message, values:values, groupnames:groups});
          }
          else {
            res.render('addModifyAlbum', {message:"\"" + values.name + "\" が更新されました。", values:values, groupnames:groups});
          }
        });
      }
      else {
        // 新規作成
        let today = dto.getDateString();
        let insert = `INSERT INTO Album VALUES(NULL, '${values.name}', '${values.mark}', '${values.info}', ${values.bindata}, '${values.groupname}', '${today}')`;
        mysql.execute(insert, (err) => {
          if (err) {
            res.render('addModifyAlbum', {message:err.message, values:values, groupnames:groups});
          }
          else {
            res.render('addModifyAlbum', {message:"\"" + values.name + "\" が作成されました。", values:values, groupnames:groups});
          }
        });
      }
    }
  });
});

// アルバムのデータ確認
router.get('/confirmAlbum/:id', async (req, res) => {
  let id = req.params.id;
  let values = {
    id:"",
    name:"",
    mark:"",
    info:"",
    bindata:0,
    groupname:""
  };
  let groups = await mysql.query_p(`SELECT DISTINCT groupname FROM Album where mark='${values.mark}' ORDER BY groupname`);
  let message = "";
  mysql.getRow("SELECT * FROM Album WHERE id=" + id, (err, row) => {
    if (row) {
      values.id = row.id;
      values.name = row.name;
      values.mark = row.mark;
      values.info = row.info;
      values.bindata = row.bindata;
      values.groupname = row.groupname;
    }
    else {
      message = err.message;
    }
    res.render("addModifyAlbum", {message:message, values:values, groupnames:groups});
  });
});

// プレイリストの管理 (GET)
router.get('/addModifyPlaylist/:id', (req, res) => {
  let id = req.params.id;
  res.render('playlistForm', {message:"", result:null});
});

// プレイリストの管理 (POST)
router.post('/addModifyPlaylist', (req, res) => {
  let id = req.body.id;
  let title = req.body.title.replace(/'/g, "''");
  let items = req.body.items.replace(/\\/g, "/").replace(/'/g, "''").replace(/\r\n/g, "\n");
  let info = req.body.info.replace(/'/g, "''");
  let value = {
    id:id,
    title:title,
    items:items,
    info:info
  };

  if (req.body.submit) {
    if (id) {
      let sql = `UPDATE Playlists SET title='${title}', items='${items}', info='${info}' WHERE id = ${id}`;
      mysql.execute(sql, (err) => {
        if (err) {
          res.render('playlistForm', {message:err.message, result:null, value:value});
        }
        else {
          res.render('playlistForm', {message:`${title} が更新されました。`, result:null, value:value});
        }
      });
    }
    else {
      let sql = `INSERT INTO Playlists(title, items, info, date) VALUES('${title}', '${items}', '${info}', CURRENT_DATE())`;
      mysql.execute(sql, (err) => {
        if (err) {
          res.render('playlistForm', {message:err.message, result:null, value:value});  
        }
        else {
          res.render('playlistForm', {message:`${title} が新規作成されました。`, result:null, value:value});  
        }
      });
    } 
  }
  else {
    if (id > 0) {
      let sql = `SELECT * FROM Playlists WHERE id = ${id}`;
      mysql.getRow(sql, (err, row) => {
        if (err) {
          let value = {
            id:"",
            title:"",
            info:"",
            items:""
          };
          res.render('playlistForm', {message: "エラーを検出", value:value, result:[]});  
        }
        else {
          let result = [];
          mysql.query("SELECT * FROM Playlists", (row2) => {
            if (row2) {
              result.push(row2);
            }
            else {
              res.render('playlistForm', {message: `id ${id} が検索されました。`, value:row, result:result});
            }
          });
        }
      });
    }
  }
});

// BINDATA サムネールを取り出す。
router.get("/extract/:id", async (req, res) => {
  let id = req.params.id;
  let sql = "SELECT datatype, data FROM BINDATA WHERE id = " + id;
  let row = await mysql.getRow_p(sql);
  let type = null;
  switch (row.datatype) {
    case ".png":
      type = "image/png";
      break;
    case ".gif":
      type = "image/gif";
      break;
    case ".jpg":
      type = "image/jpeg";
      break;
    default:
      break;
  }
  res.set("Content-Type", type);
  res.send(row.data);
});

// 画像ファイルなどのバイナリーファイルを返す。
router.get("/sendfile", (req, res) => {
  let path = req.query.path;
  res.sendFile(path);
});

// 音声ファイルをダウンロード
router.get('/audio/:id', (req, res) => {
  let id = parseInt(req.params.id);
  let audioFolder = path.join(path.dirname(__dirname), "public/audio").replace(/\\/g, "/");
  switch (id) {
    case 1:
      res.sendFile(audioFolder + "/asa01.wav");
      /*
      let filePath = audiofolder + "/asa01.wav";
      var stat = fs.statSync(filePath);
      res.writeHead(200, {
        'Content-Type': 'audio/wav', 'Content-Length': stat.size
      });
      var readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
      */
      break;
    case 2:
      res.sendFile(audiofolder + "/asa02.wav");
      break;
    case 3:
      res.sendFile(audiofolder + "/asa03.wav");
      break;
    default:
      break;
  }
});

// オブジェクト(.pdfなど)を表示する。
router.get("/objectView", (req, res) => {
  let path = req.query.path;
  let ext = fso.getExtension(path);
  let title = req.query.title;
  switch (ext) {
    case ".pdf":
      res.render("objectView", {title:title, message:"", path:path, mime:"application/pdf"});
      break;
      case ".txt":
        res.render("objectView", {title:title, message:"", path:path, mime:"text/plain"});
        break;
      case ".csv":
        res.render("objectView", {title:title, message:"", path:path, mime:"text/csv"});
        break;
      case ".json":
        res.render("objectView", {title:title, message:"", path:path, mime:"application/json"});
        break;
      default:
        res.render("showInfo", {title:"エラー", icon:"cancel.png", message:"サポートされない形式です。"});
        break;
  }
});

// アルバムの mark からテーブル名に変換する。
function getTableName(mark) {
  let tableName = "";
  switch (mark) {
    case "picture":
      tableName = "Pictures";
      break;
    case "video":
      tableName = "Videos";
      break;
    case "music":
      tableName = "Music";
      break;
    case "project":
      tableName = "Projects";
      break;
    case "document":
      tableName = "Documents";
      break;
    default:
      break;
  }
  return tableName;
}

// 指定されたテーブルの指定された id のレコードを削除する。
router.get("/deleteId", (req, res) => {
  let tableName = req.query.tableName;
  let id = req.query.id;
  let sql = `DELETE FROM ${tableName} WHERE id = ${id}`;
  mysql.execute(sql, (err) => {
    if (err) {
      res.send("NG: " + err.message);
    }
    else {
      res.send("OK: 削除成功 " + id + " on " + tableName);
    }
  });
});

// 指定されたテーブルの指定された path のレコードを削除する。(使用しない)
router.get("/deletePath", (req, res) => {
  let tableName = req.query.tableName;
  let path = req.query.path.replace(/\\/g, "/").replace(/'/g, "''");
  let sql = `DELETE FROM ${tableName} WHERE path = '${path}'`;
  mysql.execute(sql, (err) => {
    if (err) {
      res.json("NG: " + err.message);
    }
    else {
      res.json("OK: 削除成功 " + path + " on " + tableName);
    }
  });
});

// ルータをエクスポート
module.exports = router;
