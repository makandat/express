/* videos.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const fso = require('./FileSystem.js');
const router = express.Router();
const LIMIT = 1000;
const ENDLIMIT = 1000000;

// 動画アルバム一覧表示
router.get('/', async (req, res) => {
    session.videos_album = 0;
    session.videos_orderby = "id";
    session.videos_sortdir = "asc";
    session.videos_search = null;
    session.videos_start = 1;
    session.videos_end = ENDLIMIT;
    let result = await mysql.query_p("SELECT a.id, a.name, COUNT(v.album) cnt, a.info, a.bindata, a.groupname, a.date FROM album a, videos v where a.id = v.album and a.mark = 'video' GROUP BY a.name ORDER BY cnt DESC");
    res.render('videos', {message:"", result:result});
});

// 動画テーブル内容表示
router.get('/showContent', async (req, res) => {
    let title = "動画一覧 ";
    session.videos_orderby = "id";
    if (req.query.fav) {
        showFavlist(res);
        return;
    }
    if (req.query.series) {
        showWithSeries(req.query.series, res);
        return;
    }
    if (!session.videos_start) {
        session.videos_start = 1;
        session.videos_end = ENDLIMIT;
    }
    let album = req.query.album;
    if (!album) {
        album = 0;
    }
    let albumName = "";
    if (album > 0) {
        title += ` (アルバム=${album})`;
        session.videos_orderby = "id";
        session.videos_sortdir = "asc";
        session.videos_search = "";
        albumName = await mysql.getValue_p("SELECT name FROM Album WHERE id = " + album + " AND mark='video'");
    }
    if (req.query.reset) {
        session.videos_album = 0;
        session.videos_orderby = "id";
        session.videos_sortdir = "asc";
        session.videos_search = "";
    }
    if (req.query.sortdir) {
        session.videos_sortdir = req.query.sortdir;
    }
    let dirasc = "●";
    let dirdesc = "";
    if (session.videos_sortdir == "desc") {
        dirasc = "";
        dirdesc = "●";
    }
    else {
        session.videos_sortdir = "asc";
        dirasc = "●";
        dirdesc = "";    
    }
    // クエリーを行う。
    let sql = await makeSQL(req);
    console.log(sql);
    let result = await mysql.query_p(sql);
    session.videos_end = result[result.length - 1].id;
    // 結果を返す。
    res.render('videolist', {"title":title, "albumName":albumName, "result": result, "message": result.length == 0 ? "条件に合う結果がありません。" : "", dirasc:dirasc, dirdesc:dirdesc, search:session.videos_search});
});

// SQL を構築する。
async function makeSQL(req) {
    session.videos_album = req.query.album;
    // アルバム指定あり？
    if (!session.videos_album) {
        session.videos_album = 0;
    }
    // 並び順のフィールド
    if (req.query.orderby) {
        session.videos_orderby = req.query.orderby;
    }
    else {
        session.videos_orderby = "id";
    }
    // 並び替えの方向
    if (req.query.sortdir) {
        session.videos_sortdir = req.query.sortdir;
        if (session.videos_sortdir == "desc") {
            // 降順
            session.videos_start = ENDLIMIT;
            session.videos_end = 1;
        }
        else {
            // 昇順
            session.videos_start = 1;
            session.videos_end = ENDLIMIT;
        }
    }
    // 検索文字列
    if (req.query.search) {
        session.videos_search = req.query.search;
    }
    // 検索開始位置あり
    if (req.query.start) {
        session.videos_start = req.query.start;
        if (session.videos_sortdir == "desc") {
            session.videos_end = 1;
        }
        else {
            session.videos_end = ENDLIMIT;
        }
    }
    // マーク指定あり
    if (req.query.mark) {
        session.videos_mark = req.query.mark;
    }
    else {
        session.videos_mark = "";
    }
    // 最大 id
    let lastid = await mysql.getValue_p("SELECT MAX(id) From Videos");

    // ページ移動
    if (req.query.move == "first") {
        // 最初のページへ移動
        session.videos_start = session.videos_sortdir == "asc" ? 1 : lastid;
        session.videos_end = ENDLIMIT;
    }
    else if (req.query.move == "last") {
        // 最後のページへ移動
        if (session.videos_sortdir) {
            if (session.videos_sortdir == "asc") {
                // 昇順
                session.videos_start = lastid;
                session.videos_end = ENDLIMIT;    
            }
            else {
                // 降順
                let minId = await mysql.getValue_p("SELECT MIN(id) FROM Videos");
                session.videos_start = minId;
                session.videos_end = minId;    
            }
        }
        else {
            session.videos_sortdir = "asc";
            session.videos_start = lastid;
            session.videos_end = ENDLIMIT;
        }
    }
    else if (req.query.move == "prev") {
        // 前のページへ移動
        if (session.videos_sortdir == "desc") {
            // 降順の場合 (100, 99, 98, ...)
            session.videos_end = session.videos_start;
            let rows = await mysql.query_p(`SELECT id FROM Videos WHERE id > ${session.videos_start}`);
            if (rows) {
                let i = 0;
                if (rows.length > LIMIT) {
                    for (let a of rows) {
                        if (i == LIMIT - 1) {
                            session.videos_start = a.id;
                            break;
                        }
                        i++;
                    }    
                }
                else {
                    session.videos_start = lastid;
                    session.videos_end = 1;
                }
            }
            else {
                session.videos_end = 1;
            }
        }
        else {
            // 昇順の場合 (1, 2, 3, ...)
            session.videos_end = session.videos_start;
            let rows = await mysql.query_p(`SELECT id FROM Videos WHERE id < ${session.videos_start}`);
            if (rows) {
                let i = 0;
                if (rows.length > LIMIT) {
                    for (let a of rows) {
                        if (rows.length - LIMIT == i) {
                            session.videos_start = a.id;
                            break;
                        }
                        i++;
                    }    
                }
                else {
                    session.videos_start = 1;
                }
            }
            else {
                session.videos_start = 1;
            }
        }
    }
    else if (req.query.move == "next") {
        // 次のページへ移動
        if (session.videos_sortdir == "desc") {
            // 降順
            session.videos_start = session.videos_end;
        }
        else {
            // 昇順
            session.videos_sortdir = "asc";
            session.videos_start = session.videos_end;
        }
    }
    else {
        // その他 そのまま
    }

    // SQL 文作成
    let sql = "SELECT * FROM Videos";
    let needWhere = true;
    let needAnd = true;
    if (session.videos_album > 0) {
        // アルバム指定あり
        sql += ` WHERE album=${session.videos_album}`;
        needWhere = false;
        if (session.videos_sortdir == "desc") {
            sql += " AND id <= " + session.videos_start;
        }
        else {
            sql += " AND id >= " + session.videos_start;
        }
        if (session.videos_search || session.videos_mark) {
            sql += " AND " + getCriteria(session.videos_search, session.videos_mark);
        }
        else {
            // そのまま
        }
    }
    else {
        // アルバム指定なし
        if (session.videos_sortdir == "desc") {
            // 降順
            sql += " WHERE id <= " + session.videos_start;
        }
        else {
            // 昇順
            sql += " WHERE id >= " + session.videos_start;
        }
        if (session.videos_search || session.videos_mark) {
            sql += " AND " + getCriteria(session.videos_search, session.videos_mark);
        }
        else {
            // そのまま
        }
    }
    if (session.videos_orderby) {
        // 並び順指定あり
        sql += " ORDER BY " + session.videos_orderby;
        if (session.videos_sortdir) {
            sql += " " + session.videos_sortdir;
        }
        else {
            // そのまま
        }
    }
    else {
        // 並び順指定なしは id とする。
        sql += " ORDER BY id";
        if (session.videos_sortdir) {
            sql += " " + session.videos_sortdir;
        }
        else {
            // そのまま
        }
    }
    sql += ` LIMIT ${LIMIT}`;
    return sql;
}

// サーチワードからSQLの条件に変換する。
function getCriteria(search) {
    return `INSTR(title, '${search}') OR INSTR(path, '${search}') OR INSTR(info, '${search}')`;
}

// 「好き」の付いた画像フォルダ一覧
function showFavlist(res) {
    let sql = "SELECT * FROM Videos WHERE fav > 0 ORDER BY fav DESC";
    let result = [];
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('videolist', {"title":"好きな画像フォルダ一覧", "albumName":"N/A", "result": result, "message": "", dirasc:"", dirdesc:"", search:""});
            return;
        }
        else {
            result.push(row);
        }
    });
}

// シリーズごとの動画一覧
function showWithSeries(series, res) {
    let sql = `SELECT * FROM Videos WHERE series = '${series}'`;
    let result = [];
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('videolist', {"title":series + "の画像フォルダ一覧", "albumName":"N/A", "result": result, "message": "", dirasc:"", dirdesc:"", search:""});
            return;
        }
        else {
            result.push(row);
        }
    });
}

// 指定した id の動画を表示するためのページを開く。
router.get("/playForm/:id", async (req, res) => {
    let id = req.params.id;
    let title = await mysql.getValue_p(`SELECT title FROM Videos WHERE id=${id}`);
    title = `(${id}) ` + title;
    let path = await mysql.getValue_p(`SELECT path FROM Videos WHERE id = ${id}`);
    res.render('videoPlayForm', {source:path, message:"再生中： " + path, title:title});
});

// フォルダ内の前の動画を再生する。
router.get("/playPrev", async (req, res) => {
    let path = req.query.path;
    let row = await mysql.getRow_p(`SELECT id, title FROM Videos WHERE path='${path}'`);
    let title = `(${row.id}) ` + row.title;
    let folder = fso.getDirectory(path);
    let files = await fso.getFiles_p(folder, ['.mp4']);
    let i = 0;
    let source = null;
    let message = "";
    for (let p of files) {
        p = p.replace(/\\/g, '/');
        if (p == path) {
            if (i - 1 < 0) {
                message = "前の動画はありません。";
            }
            else {
                source = files[i - 1].replace(/\\/g, "/");
                row = await mysql.getRow_p(`SELECT id, title FROM Videos WHERE path='${source}'`);
                if (row) {
                    title = `(${row.id}) ` + row.title;
                }
                else {
                    title = "未登録動画";
                }
                message = "再生中：" + source;
            }
            break;
        }
        i++;
    }
    res.render("videoPlayForm", {message:message, source:source, title:title});
});

// フォルダ内の次の動画を再生する。
router.get("/playNext", async (req, res) => {
    let path = req.query.path;
    let row = await mysql.getRow_p(`SELECT id, title FROM Videos WHERE path='${path}'`);
    let title = `(${row.id}) ` + row.title;
    let folder = fso.getDirectory(path);
    let files = await fso.getFiles_p(folder, ['.mp4']);
    let i = 0;
    let source = null;
    let message = "";
    for (let p of files) {
        p = p.replace(/\\/g, '/');
        if (p == path) {
            if (i + 1 >= files.length) {
                message = "次の動画はありません。";
            }
            else {
                source = files[i + 1].replace(/\\/g, "/");
                row = await mysql.getRow_p(`SELECT id, title FROM Videos WHERE path='${source}'`);
                if (row) {
                    title = `(${row.id}) ` + row.title;
                }
                else {
                    title = "未登録動画";
                }
                message = "再生中：" + source;
            }
            break;
        }
        i++;
    }
    res.render("videoPlayForm", {message:message, source:source, title:title});
});

// videos 項目の追加・修正 (GET)
router.get('/videosForm', (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        path: "",
        media: "",
        series: "",
        mark: "",
        info: "",
        fav: 0,
        bindata: 0
    };

    // マーク一覧を得る。
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Videos", (row) => {
        if (row) {
            marks.push(row.mark);
        }
        else {
            res.render('videosForm', {message:"", marks:marks, value:value});   
        }
    });
});

// videos 項目の確認 (GET)
router.get('/confirmVideos/:id', (req, res) => {
    let id = req.params.id;
    let sql = "SELECT * FROM Videos WHERE id = " + id;
    mysql.getRow(sql, (err, row) => {
        if (!err) {
            let value = {
                id: id,
                album: row.album,
                title: row.title,
                path: row.path,
                media: row.media,
                series: row.series,
                mark: row.mark,
                info: row.info,
                fav: row.fav,
                bindata: row.bindata
            };
            // マーク一覧を得る。
            let marks = [];
            mysql.query("SELECT DISTINCT mark FROM Videos", (row) => {
                if (row) {
                    marks.push(row.mark);
                }
                else {
                    res.render('videosForm', {message:`id: ${id} が検索されました。`, marks:marks, value:value});   
                }
            });
        }
        else {
            let value = {
                id: id,
                album: 0,
                title: "",
                path: "",
                media: "",
                series: "",
                mark: "",
                info: "",
                fav: 0,
                bindata: 0
            };
            res.render('videosForm', {message:"エラー： データがありません。", marks:[], value:value});    
        }    
    });
});

// videos 項目の追加・修正 (POST)
router.post('/videosForm', (req, res) => {
    let id = req.body.id;
    let album = req.body.album;
    if (!album) {
        album = 0;
    }
    let title = req.body.title.replace("'", "''");
    let path = req.body.path.replace(/\\/g, "/").replace("'", "''");
    let media = req.body.media;
    let series = req.body.series;
    let mark = req.body.mark;
    let info = req.body.info.replace("'", "''");
    let fav = req.body.fav;
    let bindata = req.body.bindata;
    let value = {
        id: id,
        album: album,
        title: title,
        path: path,
        media: media,
        series: series,
        mark: mark,
        info: info,
        fav: fav,
        bindata: bindata
    };
    if (!fso.isFileSync(path)) {
        res.render('videosForm', {message:path + " が存在しません。", marks:[], value:value});
        return;
    }

    // マーク一覧を得る。
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Videos", (row) => {
        if (row) {
            marks.push(row.mark);
        }
        else {
            // 更新または挿入処理
            if (id) {
                //  更新
                let update = `UPDATE Videos SET album=${album}, title='${title}', path='${path}', media='${media}', series='${series}', mark='${mark}', info='${info}', fav=${fav}, bindata=${bindata} WHERE id=${id}`;
                mysql.execute(update, (c) => {
                    if (c) {
                        res.render('videosForm', {message:`${title} が更新されました。`, marks:marks, value:value});
                    }
                    else {
                        res.render('showInfo', {'title':'エラー', 'message':update, 'icon':'cancel.png', 'link':null});
                    }
                });
            }
            else {
                // 追加
                let insert = `INSERT INTO Videos(id, album, title, path, media, series, mark, info, fav, count, bindata, date) VALUES(NULL, ${album}, '${title}', '${path}', '${media}', '${series}', '${mark}', '${info}', ${fav}, 0, ${bindata}, CURRENT_DATE())`;
                mysql.execute(insert, (c) => {
                    if (c) {
                        res.render('showInfo', {'title':'エラー', 'message':insert, 'icon':'cancel.png', 'link':null});
                    }
                    else {
                        res.render('videosForm', {message:`${title} が追加されました。`, marks:marks, value:value});
                    }  
                });
            }
        }
    });
});

// シリーズ一覧
router.get("/series", (req, res) => {
    let mark = req.query.mark;
    let result = [];
    let sql = "SELECT DISTINCT series FROM Videos";
    if (mark) {
        if (mark != "0") {
            sql += ` WHERE mark='${mark}'`;
        }
    }
    mysql.query(sql, (x) => {
        if (x) {
            result.push(x.series);
        }
        else {
            // マーク一覧を得る。
            let marks = [];
            mysql.query("SELECT DISTINCT mark FROM Videos", (m) => {
                if (m) {
                    marks.push(m.mark);
                }
                else {
                    res.render('videoSeries', {message:"", result:result, marks:marks, mark:mark});
                }
            })
        }
    });
});

// アルバムの作成 (GET)
router.get("/albumForm", (req, res) => {
    let values = {
        id: null,
        name: "",
        mark: "video",
        info: "",
        bindata: 0,
        groupname: ""
      };
      res.render('addModifyAlbum', {message:"", values:values});    
});

// アルバムの作成 (POST)
router.post("/albumForm", (req, res) => {
    let values = {
        id: req.body.id,
        name: req.body.name.replace(/'/g,"''"),
        mark: "video",
        info: req.body.info.replace(/'/g,"''"),
        bindata: req.body.bindata,
        groupname: req.body.groupname
    };
    if (values.id) {
        // 更新
        let update = `UPDATE Album SET name=${values.name}, mark='${values.mark}', info='${values.info}', bindata=${values.bindata}, groupname='${values.groupname}' WHERE id = ${values.id}`;
        mysql.execute(update, (err) => {
          if (err) {
            res.render('addModifyAlbum', {message:err.message, values:values});
          }
          else {
            res.render('addModifyAlbum', {message:values.name + "が更新されました。", values:values});
          }
        });
    }
    else {
        // 新規作成
        let today = dto.getDateString();
        let insert = `INSERT INTO Album VALUES(NULL, '${values.name}', '${values.mark}', '${values.info}', ${values.bindata}, '${values.groupname}', '${today}')`;
        mysql.execute(insert, (err) => {
          if (err) {
            res.render('addModifyAlbum', {message:err.message, values:values});
          }
          else {
            res.render('addModifyAlbum', {message:values.name + "が作成されました。", values:values});
          }
        });
    }    
});


// エクスポート
module.exports = router;
