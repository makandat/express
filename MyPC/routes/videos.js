/* videos.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const fso = require('./FileSystem.js');
const router = express.Router();
const LIMIT = 1000;
const SELECT = "SELECT id, album, title, path, media, series, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Videos";

// 動画アルバム一覧表示
router.get('/', async (req, res) => {
    session.videos_album = 0;
    session.videos_orderby = "id";
    session.videos_sortdir = "asc";
    session.videos_search = null;
    session.videos_offset = 0;
    let result = await mysql.query_p("SELECT a.id, a.name, COUNT(v.album) cnt, a.info, a.bindata, a.groupname, a.date FROM Album a, Videos v WHERE a.id = v.album AND a.mark = 'video' GROUP BY a.name ORDER BY cnt DESC");
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
    if (!session.videos_offset) {
        session.videos_offset = 0;
    }
    let album = req.query.album;
    if (!album) {
        album = 0;
    }
    let albumName = "";
    if (album > 0) {
        title += ` (アルバム=${album})`;
        session.videos_orderby = "id";
        session.videos_sortdir = session.videos_sortdir ? session.videos_sortdir : "desc";
        session.videos_search = null;
        session.videos_album = album;
        albumName = await mysql.getValue_p("SELECT name FROM Album WHERE id = " + album + " AND mark='video'");
    }
    if (req.query.reset) {
        session.videos_album = 0;
        session.videos_orderby = "id";
        session.videos_sortdir = "desc";
        session.videos_search = null;
        session.videos_mark = null;
        session.videos_offset = 0;
    }
    if (req.query.sortdir) {
        session.videos_sortdir = req.query.sortdir;
        session.video_offset = 0;
    }
    let dirasc = "";
    let dirdesc = "●";
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
    try {
        let rows = await mysql.query_p("SELECT DISTINCT mark FROM Videos ORDER BY mark");
        let marks = [];
        for (let row of rows) {
            marks.push(row.mark);
        }
        let sql = await makeSQL(req);
        let result = await mysql.query_p(sql);
        if (result.length > 0) {
            session.videos_end = result[result.length - 1].id;
        }
        // 結果を返す。
        res.render('videolist', {"title":title, "albumName":albumName, "marks":marks, "result": result, "message": result.length == 0 ? "条件に合う結果がありません。" : "",
         dirasc:dirasc, dirdesc:dirdesc, search:session.videos_search});    
    }
    catch (err) {
        res.render("showInfo", {"title":"Fatal Error", "icon":"cancel.png", "message":"エラー：" + err.message});
    }
});

// SQL を作成する。
async function makeSQL(req) {
    if (req.query.series) {
        return SELECT + ` WHERE series='${req.query.series}' ORDER BY id DESC`;
    }
    if (req.query.album) {
        return SELECT + ` WHERE album=${req.query.album} ORDER BY id DESC`;        
    }
    if (session.videos_offset == undefined) {
        session.videos_offset = 0;
    }
    if (session.videos_sortdir == undefined) {
        session.videos_sortdir = "desc";
    }

    if (req.query.reset) {
        session.videos_offset = 0;
        session.videos_sortdir = "desc";
        session.videos_mark = undefined;
    }
    if (req.query.move) {
        let sql2 = 'SELECT count(*) AS n FROM Pictures';
        if (session.videos_mark) {
            sql2 += ` WHERE mark='${session.videos_mark}'`;
        }
        let n = await mysql.getValue_p(sql2);
        switch (req.query.move) {
            case 'first':
                session.videos_offset = 0;
                break;
            case 'prev':
                session.videos_offset -= LIMIT;
                if (session.videos_offset < 0) {
                    session.videos_offset = 0;
                }    
                break;
            case 'next':
                session.videos_offset += LIMIT;
                if (session.videos_offset >= n) {
                    session.videos_offset = n - 1;
                }    
                break;
            case 'last':
                session.videos_offset = n - 1;
                break;
            default:  // '0'
                break;
        }
    }
    let sql = SELECT;
    let where = true;
    if (req.query.mark) {
        sql += ` WHERE mark='${req.query.mark}'`;
        session.videos_mark = req.query.mark;
        session.videos_offset = 0;
        session.videos_sortdir = "desc";
        where = false;
    }
    else if (session.videos_mark) {
        sql += ` WHERE mark='${session.videos_mark}'`;
        where = false;
    }
    else {
        // 何もしない。
    }
    if (req.query.search) {
        let search = req.query.search.replace(/'/g, "''");
        if (where) {
            sql += ' WHERE ';
        }
        else {
            sql += ' AND ';
        }
        sql += `(title LIKE '%${search}%' OR path LIKE '%${search}%' OR series LIKE '%${search}%' OR info LIKE '%${search}%')`;        
    }
    sql += ` ORDER BY id ${session.videos_sortdir} LIMIT ${LIMIT} OFFSET ${session.videos_offset}`;
    return sql;
}


// サーチワードからSQLの条件に変換する。
function getCriteria(search, mark) {
    let criteria = "";
    let needAnd = false;
    if (search) {
        criteria += `INSTR(title, '${search}') OR INSTR(path, '${search}') OR INSTR(info, '${search}')`;
        needAnd = true;
    }
    if (mark) {
        if (needAnd) {
            criteria += " AND ";
        }
        criteria += `mark='${mark}'`;
    }
    return criteria;
}

// 「好き」の付いた画像フォルダ一覧
function showFavlist(res) {
    let sql = "SELECT id, album, title, path, media, series, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Videos WHERE fav > 0 ORDER BY fav DESC";
    let result = [];
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('videolist', {"title":"好きな画像フォルダ一覧", "marks":[], "albumName":"N/A", "result": result, "message": "", dirasc:"", dirdesc:"", search:""});
            return;
        }
        else {
            result.push(row);
        }
    });
}

// シリーズごとの動画一覧
function showWithSeries(series, res) {
    let sql = `SELECT id, album, title, path, media, series, mark, info, fav, count, bindata, DATE_FORMAT(date, '%Y-%m-%d') AS date  FROM Videos WHERE series = '${series}'`;
    let result = [];
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('videolist', {"title":series + "の画像フォルダ一覧", "marks":[], "albumName":"N/A", "result": result, "message": "", dirasc:"", dirdesc:"", search:""});
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
    countup(id);
    res.render('videoPlayForm', {source:path, message:"再生中： " + path, title:title});
});

// 指定したパスの動画を表示するためのページを開く。
router.get("/playPath", async (req, res) => {
    let path = req.query.path;
    let title = await mysql.getValue_p(`SELECT title FROM Videos WHERE path = '${path}'`);
    let id = await mysql.getValue_p(`SELECT id FROM Videos WHERE path = '${path}'`);
    title = `(${id}) ` + title;
    countup(id);
    res.render('videoPlayForm', {source:path, message:"再生中： " + path, title:title});
});

// フォルダ内の前の動画を再生する。
router.get("/playPrev", async (req, res) => {
    let path = req.query.path;
    let row = await mysql.getRow_p(`SELECT id, title FROM Videos WHERE path='${path}'`);
    if (!row) {
        res.render("showInfo", {title:"エラー", message:"動画が登録されていません。", icon:"cancel.png"});
        return;
    }
    let title = `(${row.id}) ` + row.title;
    let folder = fso.getDirectory(path);
    let files = await fso.getFiles_p(folder, ['.mp4', '.webm', '.ogg']);
    let i = 0;
    let source = null;
    let message = "";
    for (let p of files) {
        p = p.replace(/\\/g, '/');
        if (p == path) {
            if (i - 1 < 0) {
                message = "前の動画はありません。";
                source = files[0].replace(/\\/g, "/");;
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
    if (!row) {
        res.render("showInfo", {title:"エラー", message:"動画が登録されていません。", icon:"cancel.png"});
        return;
    }
    let title = `(${row.id}) ` + row.title;
    let folder = fso.getDirectory(path);
    let files = await fso.getFiles_p(folder, ['.mp4', '.webm', '.ogg']);
    let i = 0;
    let source = null;
    let message = "";
    for (let p of files) {
        p = p.replace(/\\/g, '/');
        if (p == path) {
            if (i + 1 >= files.length) {
                message = "次の動画はありません。";
                source = files[files.length - 1].replace(/\\/g, "/");;
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

// 指定された id の fav を ＋１する。
router.get('/favorite/:id', (req, res) => {
    let id = req.params.id;
    mysql.execute(`CALL user.favup(2, ${id})`, (err) => {
        res.redirect(req.get('referer'));
    });
});

// 指定された id の count を ＋１する。
function countup(id, res) {
    mysql.execute(`CALL user.countup(2, ${id})`, (err) => {
        // res.render と競合するので不要。
        //res.status(200).send(0);
    });
}


// videos 項目の確認 (GET)
router.get('/confirmVideos/:id', (req, res) => {
    let id = req.params.id;
    let sql = "SELECT * FROM Videos WHERE id = " + id;
    mysql.getRow(sql, (err, row) => {
        if (row) {
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
            res.render('showInfo', {message:"エラー： データがありません。", title:"エラー", icon:"cancel.png"});
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
    let fav = req.body.fav ? req.body.fav : 0;
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
    if (!fso.exists(req.body.path)) {
        res.render('showInfo', {title:"エラー", message:path + " が存在しません。", icon:"cancel.png"});
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
                        res.render('showInfo', {'title':'エラー', 'message':update, 'icon':'cancel.png', 'link':null});
                    }
                    else {
                        res.render('videosForm', {message:`${title} が更新されました。`, marks:marks, value:value});
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
    let sql = "SELECT series, COUNT(series) AS seriecount, SUM(`count`) AS sumplayback, SUM(fav) AS sumfav FROM Videos";
    if (mark) {
        if (mark != "0") {
            sql += ` WHERE mark='${mark}'`;
        }
    }
    sql += " GROUP BY series ORDER BY series";
    mysql.query(sql, (row) => {
        if (row) {
            result.push(row);
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


// エクスポート
module.exports = router;
