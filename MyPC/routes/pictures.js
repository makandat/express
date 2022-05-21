/* pictures.js */
'use strict';
const express = require('express');
const session = require('express-session');
const common = require('./Common.js');
const mysql = require('./MySQL.js');
const fso = require('./FileSystem.js');
const os = require("os");
const router = express.Router();
const LIMIT = 1000;
const SELECT = "SELECT `id`, `album`, `title`, `creator`, `path`, `media`, `mark`, `info`, `fav`, `count`, `bindata`, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Pictures";

// pictures アルバム一覧表示
router.get('/', async (req, res) => {
    session.pictures_album = null;
    session.pictures_orderby = null;
    session.pictures_sortdir = null;
    session.pictures_search = null;
    session.pictures_offset = 0;
    res.render('pictures', {title:"画像管理 " + os.hostname(), message:""});
});

// Pictures 項目一覧表示
router.get('/showContent', async (req, res) => {
    let title = "画像フォルダ一覧 ";
    if (req.query.fav) {
        showFavlist(res);
        return;
    }
    if (req.query.creator) {
        showWithCreator(req.query.creator, res);
        return;
    }
    if (!session.pictures_offset) {
        session.pictures_offset = 0;
    }

    let message = "";
    if (req.query.search) {
        message = "検索ワード： " + req.query.search;
    }
    else if (req.query.mark) {
        message = "区分マーク： " + req.query.mark;
    }
    else if (req.query.fav) {
        message = "「お気に入り」フラグがセットされた項目";
    }
    else {
        // そのまま
    }
    let album = req.query.album;
    if (!album) {
        album = 0;
    }
    let albumName = "";
    if (album > 0) {
        title += ` (アルバム=${album})`;
        session.pictures_orderby = "id";
        session.pictures_sortdir = session.pictures_sortdir ? session.pictures_sortdir : "asc";
        session.pictures_search = null;
        session.pictures_mark = null;
        session.pictures_offset = 0;
        session.pictures_album = album;
        const c = await mysql.getValue_p(`SELECT COUNT(name) FROM Album WHERE id = ${album} AND mark='picture'`);
        if (c == 0) {
            albumName = "NOT EXISTS";
        }
        else {
            albumName = await mysql.getValue_p(`SELECT name FROM Album WHERE id = ${album} AND mark='picture'`);
        }
    }
    if (req.query.reset) {
        session.pictures_album = 0;
        session.pictures_orderby = "id";
        session.pictures_sortdir = "desc";
        session.pictures_search = null;
        session.pictures_mark = null;
        session.pictures_offset = 0;
    }
    if (req.query.sortdir) {
        session.pictures_sortdir = req.query.sortdir;
        session.pictures_offset = 0;
    }
    let dirasc = "";
    let dirdesc = "●";
    if (session.pictures_sortdir == "desc") {
        dirasc = "";
        dirdesc = "●";
    }
    else {
        session.pictures_sortdir = "asc";
        dirasc = "●";
        dirdesc = "";
    }
    // マーク一覧を得る。
    try {
        let marks = await mysql.query_p("SELECT DISTINCT mark FROM Pictures");
        // クエリーを行う。
        let sql = await makeSQL(req);
        let result = await mysql.query_p(sql);
        // 結果を返す。
        res.render('picturelist', {"title":title, "albumName":albumName, "mark":session.pictures_mark, "marks":marks, "result": result, "message": result.length == 0 ? "条件に合う結果がありません。" : message, dirasc:dirasc, dirdesc:dirdesc, search:session.pictures_search});
    }
    catch (err) {
        res.render('showInfo', {"title":"Fatal Error", "message":"エラー:" + err.message, "icon":"cancel.png"});
    }
});

// サムネール形式で画像一覧を表示する。
router.get("/showthumb", async (req, res) => {
    let path = req.query.path;
    let sortdir = req.query.sortdir ? req.query.sortdir : "asc";
    session.navdir = sortdir;
    let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${path}'`);
    if (!title) {
        title = path;
    }
    let files = await fso.getFiles_p(path, [".jpg", ".png", ".gif", ".JPG", ".PNG", ".GIF", ".jpeg"]);
    if (common.isWindows()) {
        for (let i = 0; i < files.length; i++) {
            files[i] = files[i].replace(/\\/g, "/");
        }
    }
    let id = await mysql.getValue_p("SELECT id FROM Pictures WHERE path='" + path + "'");
    countup(id);
    res.render("showthumb", {title:title, message:path, dir:path, files:files, sortdir:sortdir});
});

// ナビゲーション形式で画像表示する。
router.get("/showNavImage", async (req, res) => {
    let navfiles = 0; // 対称ファイルの数
    let navidx = 0; // 表示する画像の位置
    let prev = 0;   // 前の画像の位置
    let next = 0;   // 次の画像の位置
    let last = 0;   // 最後の画像の位置
    let path = req.query.path;  // 画像ファイルのパス名 (最初の場合のみ使用)
    let navdir = req.query.dir;    // 画像ファイルのディレクトリ (2回目以降使用)
    let nav = req.query.nav;    // 画像の位置 (2回目以降使用)
    if (nav == undefined) {
        // 位置の指定がない時 (初回)
        navdir = fso.getDirectory(path);
        [navidx, navfiles] = await getNavIndex(navdir, path);
        prev = navidx > 1 ? navidx - 1 : 0;
        next = navidx < navfiles - 1 ? navidx + 1 : navfiles - 1;
        last = navfiles - 1;
        let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${navdir}'`);
        if (title == undefined) {
            res.render("showNavImage", {title:"Error", path:path, dir:navdir, message:"ディレクトリが DB に登録されていません。", prev:prev, next:next, last:last});
        }
        else {
            res.render("showNavImage", {title:title, path:path, dir:navdir, message:(navidx+1) + " / " + navfiles, prev:prev, next:next, last:last});
        }
    }
    else {
        // 位置の指定がある時 (2回目以降)
        let files = await fso.getFiles_p(navdir);
        navidx = parseInt(req.query.nav);
        path = files[navidx];
        navfiles = files.length;
        prev = navidx > 1 ? navidx - 1 : 0;
        next = navidx < navfiles - 1 ? navidx + 1 : navfiles - 1;
        last = navfiles - 1;
        let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${navdir}'`);
        if (title == undefined) {
            res.render("showNavImage", {title:"Error", path:path, dir:navdir, message:"ディレクトリが DB に登録されていません。", prev:prev, next:next, last:last});
        }
        else {
            res.render("showNavImage", {title:title, path:path, dir:navdir, message:(navidx+1) + " / " + navfiles, prev:prev, next:next, last:last});
        }
    }
});

// フォルダ内の画像の位置を返す。
async function getNavIndex(dir, path) {
    let files = await fso.getFiles_p(dir);
    let i = 0;
    for (let p of files) {
        if (p.replace(/\\/g, "/") == path) {
            break;
        }
        i++;
    }
    return [i, files.length];
}

// 「好き」の付いた画像フォルダ一覧
function showFavlist(res) {
    let sql = SELECT + " WHERE fav > 0 ORDER BY fav DESC";
    let result = [];
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('picturelist', {"title":"好きな画像フォルダ一覧", "albumName":"N/A", "result": result, "message": "", "marks":[], "mark":"", "dirasc":"", "dirdesc":"", "search":""});
            return;
        }
        else {
            result.push(row);
        }
    });
}

// 作者ごとの画像フォルダ一覧
function showWithCreator(creator, res) {
    let sql = SELECT + " WHERE creator = '" + creator + "'";
    let result = [];
    mysql.query(sql, (row) => {
        if (row == null) {
            res.render('picturelist', {"title":creator + "の画像フォルダ一覧", "albumName":"N/A", "result": result, "marks":[], "mark":"", "message":"", dirasc:"", dirdesc:"", search:""});
            return;
        }
        else {
            result.push(row);
        }
    });
}

// 作者情報を得る。
router.get("/getCreatorInfo", async (req, res) => {
    let creator = req.query.creator;
    let row = mysql.getRow_p(`SELECT COUNT(id) CountId, COUNT(fav) CountFav FROM Pictures WHERE creator='${creator}'`);
    res.json(row);
});

// 指定したフォルダ内の画像一覧を返す。
router.get("/showPictures", async (req, res) => {
    let path = req.query.path;
    if (!fso.exists(path)) {
        res.render("showInfo", {message:"エラー： パスが存在しません。", title:"エラー", icon:"cancel.png"});
        return;
    }
    let sortdir = req.query.sortdir ? req.query.sortdir : "asc";
    session.navdir = sortdir;
    const title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${path}'`);
    if (title == null) {
        res.render("showInfo", {message:"エラー： データが登録されていません。", title:"エラー", icon:"cancel.png"});
        return;
    }
    let files = await fso.getFiles_p(path, [".jpg", ".png", ".gif", ".JPG", ".PNG", ".GIF", ".jpeg"]);
    let result = [];
    if (sortdir == "asc") {
        for (let i = 0; i < files.length; i++) {
            result.push(files[i].replace(/\\/g, '/'));
        }
    }
    else if (sortdir == "desc") {
        for (let i = files.length - 1; i >= 0; i--) {
            result.push(files[i].replace(/\\/g, '/'));
        }
    }
    else {
        throw "Fatal error";
    }
    // id を得る。
    mysql.getValue(`SELECT id FROM Pictures WHERE path='${path}'`, (id) =>{
        res.render("showPictures", {title:title, path:path, message:"", result:result});
        // 参照回数を増やす。
        countup(id);
    });
});

// pictures 項目の追加・修正 (GET)
router.get('/picturesForm', (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        path: "",
        artist: "",
        mark: "",
        info: "",
        fav: 0,
        bindata: 0
    };
    // マーク一覧を得る。
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Pictures", (row) => {
        if (row) {
            marks.push(row.mark);
        }
        else {
            res.render('picturesForm', {message:"", marks:marks, value:value});
        }
    });
});

// pictures 項目の確認 (GET)
router.get('/confirmPictures/:id', (req, res) => {
    let id = req.params.id;
    let sql = "SELECT * FROM Pictures WHERE id = " + id;
    mysql.getRow(sql, (err, row) => {
        if (row) {
            let value = {
                id: id,
                album: row.album,
                title: row.title,
                path: row.path,
                creator: row.creator,
                media: row.media,
                mark: row.mark,
                info: row.info,
                fav: row.fav,
                bindata: row.bindata
            };
            // マーク一覧を得る。
            let marks = [];
            mysql.query("SELECT DISTINCT mark FROM Pictures", (row) => {
                if (row) {
                    marks.push(row.mark);
                }
                else {
                    res.render('picturesForm', {message:`id: ${id} が検索されました。`, marks:marks, value:value});
                }
            });
        }
        else {
            res.render('showInfo', {message:"エラー： データがありません。", title:"エラー", icon:"cancel.png"});
        }
    });
});

// pictures 項目の追加・修正 (POST)
router.post('/picturesForm', (req, res) => {
    let id = req.body.id;
    let album = req.body.album;
    if (!album) {
        album = 0;
    }
    let title = req.body.title.replace("'", "''");
    let path = req.body.path.replace(/\\/g, "/").replace("'", "''");
    let creator = req.body.creator.replace("'", "''");
    let media = req.body.media;
    let mark = req.body.mark;
    let info = req.body.info.replace("'", "''");
    let fav = req.body.fav;
    let bindata = req.body.bindata;
    let value = {
        id: id,
        album: album,
        title: title,
        path: path,
        creator: creator,
        media:media,
        mark: mark,
        info: info,
        fav: fav,
        bindata: bindata
    };
    if (!fso.exists(path)) {
        res.render('showInfo', {title:"エラー", message:path + " が存在しません。", icon:"cancel.png"});
        return;
    }

    if (id) {
        //  更新
        let update = `UPDATE Pictures SET album=${album}, title='${title}', path='${path}', creator='${creator}', media='${media}', mark='${mark}', info='${info}', fav=${fav}, bindata=${bindata} WHERE id=${id}`;
        mysql.execute(update, (err) => {
            if (err) {
                res.render('showInfo', {'title':'エラー', 'message':update, 'icon':'cancel.png', 'link':null});
            }
            else {
                // マーク一覧を得る。
                let marks = [];
                mysql.query("SELECT DISTINCT mark FROM Pictures", (row) => {
                    if (row) {
                        marks.push(row.mark);
                    }
                    else {
                        res.render('picturesForm', {message:`${title} が更新されました。`, marks:marks, value:value});
                    }
                });
            }
        });
    }
    else {
        // 追加
        let insert = `INSERT INTO Pictures(id, album, title, path, media, creator, mark, info, fav, count, bindata, date) VALUES(NULL, ${album}, '${title}', '${path}', '${media}', '${creator}', '${mark}', '${info}', ${fav}, 0, ${bindata}, CURRENT_DATE())`;
        mysql.execute(insert, (err) => {
            if (err) {
                res.render('showInfo', {'title':'エラー', 'message':insert, 'icon':'cancel.png', 'link':null});
            }
            else {
                // マーク一覧を得る。
                let marks = [];
                mysql.query("SELECT DISTINCT mark FROM Pictures", (row) => {
                    if (row) {
                        marks.push(row.mark);
                    }
                    else {
                        res.render('picturesForm', {message:`${title} が追加されました。`, marks:marks, value:value});
                    }
                });
            }
        });
    }
});

// 作者一覧
router.get("/creators", (req, res) => {
    let mark = req.query.mark;
    let result = [];
    let sql = "SELECT creator, COUNT(creator) AS creatorcount, SUM(`count`) AS sumref, SUM(fav) AS sumfav FROM Pictures";
    if (mark) {
        if (mark != "0") {
            sql += ` WHERE mark='${mark}'`;
        }
    }
    sql += " GROUP BY creator ORDER BY creator";
    mysql.query(sql, (row) => {
        if (row) {
            result.push(row);
        }
        else {
            // マーク一覧を得る。
            let marks = [];
            mysql.query("SELECT DISTINCT mark FROM Pictures", (m) => {
                if (m) {
                    marks.push(m.mark);
                }
                else {
                    res.render('creators', {message:"", result:result, marks:marks, mark:mark});
                }
            })
        }
    });
});


// SQL を作成する。
async function makeSQL(req) {
    if (req.query.creator) {
        return SELECT + ` WHERE creator='${req.query.creator}' ORDER BY id DESC`;
    }
    if (req.query.album) {
        return SELECT + ` WHERE album=${req.query.album} ORDER BY id DESC`;
    }
    if (session.pictures_offset == undefined) {
        session.pictures_offset = 0;
    }
    if (session.pictures_sortdir == undefined) {
        session.pictures_sortdir = "desc";
    }

    if (req.query.reset) {
        session.pictures_offset = 0;
        session.pictures_sortdir = "desc";
        session.pictures_mark = undefined;
    }
    if (req.query.move) {
        let sql2 = 'SELECT count(*) AS n FROM Pictures';
        if (session.pictures_mark) {
            sql2 += ` WHERE mark='${session.pictures_mark}'`;
        }
        let n = await mysql.getValue_p(sql2);
        switch (req.query.move) {
            case 'first':
                session.pictures_offset = 0;
                break;
            case 'prev':
                session.pictures_offset -= LIMIT;
                if (session.pictures_offset < 0) {
                    session.pictures_offset = 0;
                }
                break;
            case 'next':
                session.pictures_offset += LIMIT;
                if (session.pictures_offset >= n) {
                    session.pictures_offset = n - 1;
                }
                break;
            case 'last':
                session.pictures_offset = n - 1;
                break;
            default:  // '0'
                break;
        }
    }
    let sql = SELECT;
    let where = true;
    if (req.query.mark) {
        sql += ` WHERE mark='${req.query.mark}'`;
        session.pictures_mark = req.query.mark;
        session.pictures_offset = 0;
        session.pictures_sortdir = "desc";
        where = false;
    }
    else if (session.pictures_mark) {
        sql += ` WHERE mark='${session.pictures_mark}'`;
        where = false;
    }
    else if (req.query.start) {
        if (session.pictures_sortdir == "asc")
            sql += ` WHERE id >= ${req.query.start}`;
        else
            sql += ` WHERE id <= ${req.query.start}`;
    }
    if (req.query.search) {
        let search = req.query.search.replace(/'/g, "''");
        if (where) {
            sql += ' WHERE ';
        }
        else {
            sql += ' AND ';
        }
        sql += `(title LIKE '%${search}%' OR path LIKE '%${search}%' OR creator LIKE '%${search}%' OR info LIKE '%${search}%')`;
    }
    sql += ` ORDER BY id ${session.pictures_sortdir} LIMIT ${LIMIT} OFFSET ${session.pictures_offset}`;
    return sql;
}


// 指定された id の fav を ＋１する。
router.get('/favorite/:id', (req, res) => {
    let id = req.params.id;
    mysql.execute(`CALL user.favup(${id})`, (err) => {
        res.redirect(req.get('referer'));
    });
});

// 指定された id の count を ＋１する。
function countup(id) {
    mysql.execute(`CALL user.countup(${id})`, (err) => {
        // res.render と競合するので不要。
        //res.status(200).send(0);
    });
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


// ルータをエクスポート
module.exports = router;
