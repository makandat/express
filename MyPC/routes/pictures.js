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
const ENDLIMIT = 10000000;

// pictures アルバム一覧表示
router.get('/', async (req, res) => {
    session.pictures_album = null;
    session.pictures_orderby = null;
    session.pictures_sortdir = null;
    session.pictures_search = null;
    session.pictures_start = 1;
    session.pictures_end = ENDLIMIT;
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
    if (!session.pictures_start) {
        session.pictures_start = 1;
        session.pictures_end = ENDLIMIT;
    }
    let album = req.query.album;
    if (!album) {
        album = 0;
    }
    let albumName = "";
    if (album > 0) {
        title += ` (アルバム=${album})`;
        session.pictures_orderby = "id";
        session.pictures_sortdir = "asc";
        session.pictures_search = null;
        session.pictures_mark = null;
        session.pictures_album = album;
        albumName = await mysql.getValue_p(`SELECT name FROM Album WHERE id = ${album} AND mark='picture'`);
    }
    if (req.query.reset) {
        session.pictures_album = 0;
        session.pictures_orderby = "id";
        session.pictures_sortdir = "asc";
        session.pictures_search = null;
        session.pictures_mark = null;
        session.pictures_start = 1;
        session.pictures_end = ENDLIMIT;
    }
    if (req.query.sortdir) {
        session.pictures_sortdir = req.query.sortdir;
    }
    let dirasc = "●";
    let dirdesc = "";
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
        //console.log(sql);
        let result = await mysql.query_p(sql);
        if (result.length > 0) {
            session.pictures_end = result[result.length - 1].id;
        }
        // 結果を返す。
        res.render('picturelist', {"title":title, "albumName":albumName, "mark":session.pictures_mark, "marks":marks, "result": result, "message": result.length == 0 ? "条件に合う結果がありません。" : "", dirasc:dirasc, dirdesc:dirdesc, search:session.pictures_search});    
    }
    catch (err) {
        res.render('showInfo', {"title":"Fatal Error", "message":"エラー:" + err.message, "icon":"cancel.png"});
    }
});

// サムネール形式で画像一覧を表示する。
router.get("/showthumb", async (req, res) => {
    let path = req.query.path;
    let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${path}'`);
    if (!title) {
        title = path;
    }
    let files = await fso.getFiles_p(path, [".jpg", ".png", ".gif"]);
    if (common.isWindows()) {
        for (let i = 0; i < files.length; i++) {
            files[i] = files[i].replace(/\\/g, "/");
        }
    }
    res.render("showthumb", {title:title, message:"", dir:path, files:files});
});

// ナビゲーション形式で画像表示する。
router.get("/showNavImage", async (req, res) => {
    let path = req.query.path;
    if (path) {
        session.pictures_navdir = fso.getDirectory(path);
        [session.pictures_nav, session.pictures_nfiles] = await getNavIndex(session.pictures_navdir, path);
        let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${session.pictures_navdir}'`);
        res.render("showNavImage", {title:title, dir:session.pictures_navdir, message:(session.pictures_nav+1) + " / " + session.pictures_nfiles, path:path});
    }
    else if (req.query.nav) {
        switch (req.query.nav) {
            case "first":
                session.pictures_nav = 0;
                break;
            case "last":
                session.pictures_nav = session.pictures_nfiles - 1;
                break;
            case "prev":
                if (session.pictures_nav > 0) {
                    session.pictures_nav--;
                }
                else {
                    session.pictures_nav = 0;
                }
                break;
            default: // next
                if (session.pictures_nav < session.pictures_nfiles) {
                    session.pictures_nav++;
                }
                else {
                    session.pictures_nav = session.pictures_nfiles - 1;
                }
                break;
        }
        let files = await fso.getFiles_p(session.pictures_navdir);
        let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${session.pictures_navdir}'`);
        res.render("showNavImage", {title:title, dir:session.pictures_navdir, message:"画像位置：" + (session.pictures_nav+1) + " / " + files.length, path:files[session.pictures_nav]});
    }
    else {
        res.render("showInfo", {icon:"/img/cancel.png", message:"/showNavImage のパラメータが不正です。"});
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
    let sql = "SELECT id, album, title, creator, path, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Pictures WHERE fav > 0 ORDER BY fav DESC";
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
    let sql = "SELECT id, album, title, creator, path, mark, info, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Pictures WHERE creator = '" + creator + "'";
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
    let title = await mysql.getValue_p(`SELECT title FROM Pictures WHERE path='${path}'`);
    let files = await fso.getFiles_p(path, [".jpg", ".png", ".gif", ".JPG", ".PNG", ".GIF"]);
    let result = [];
    for (let i = 0; i < files.length; i++) {
        result.push(files[i].replace(/\\/g, '/'));
    }
    // id を得る。
    mysql.getValue(`SELECT id FROM Pictures WHERE path='${path}'`, (id) =>{
        res.render("showPictures", {title:title, path:path, message:"", result:result});
        // 参照回数を増やす。
        countup(id, res);
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
            let value = {
                id: id,
                album: 0,
                title: "",
                path: "",
                creator: "",
                media: "",
                mark: "",
                info: "",
                fav: 0,
                bindata: 0
            };
            res.render('picturesForm', {message:"エラー： データがありません。", marks:[], value:value});
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
    if (!fso.isDirSync(path)) {
        res.render('picturesForm', {message:path + " が存在しません。", marks:[], value:value});
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

// SQL を構築する。
async function makeSQL(req) {
    // アルバム指定あり？
    if (!session.pictures_album) {
        session.pictures_album = 0;
    }
    // 並び順のフィールド
    if (req.query.orderby) {
        session.pictures_orderby = req.query.orderby;
    }
    else {
        session.pictures_orderby = "id";
    }
    // 並び替えの方向
    if (req.query.sortdir) {
        session.pictures_sortdir = req.query.sortdir;
        if (session.pictures_sortdir == "desc") {
            // 降順
            session.pictures_start = ENDLIMIT;
            session.pictures_end = 1;
        }
        else {
            // 昇順
            session.pictures_start = 1;
            session.pictures_end = ENDLIMIT;
        }
    }
    // 検索文字列
    if (req.query.search) {
        session.pictures_search = req.query.search;
    }
    // 検索開始位置あり
    if (req.query.start) {
        session.pictures_start = req.query.start;
        if (session.pictures_sortdir == "desc") {
            session.pictures_end = 1;
        }
        else {
            session.pictures_end = ENDLIMIT;
        }
    }
    // マーク指定あり
    if (req.query.mark) {
        session.pictures_mark = req.query.mark;
    }
    else {
        session.pictures_mark = "";
    }
    // 最大 id
    let lastid = await mysql.getValue_p("SELECT MAX(id) From Pictures");

    // ページ移動
    if (req.query.move == "first") {
        // 最初のページへ移動
        session.pictures_start = session.pictures_sortdir == "asc" ? 1 : lastid;
        session.pictures_end = ENDLIMIT;
    }
    else if (req.query.move == "last") {
        // 最後のページへ移動
        if (session.pictures_sortdir) {
            if (session.pictures_sortdir == "asc") {
                // 昇順
                session.pictures_start = lastid;
                session.pictures_end = ENDLIMIT;
            }
            else {
                // 降順
                let minId = await mysql.getValue_p("SELECT MIN(id) FROM Pictures");
                session.pictures_start = minId;
                session.pictures_end = minId;
            }
        }
        else {
            session.pictures_sortdir = "asc";
            session.pictures_start = lastid;
            session.pictures_end = ENDLIMIT;
        }
    }
    else if (req.query.move == "prev") {
        // 前のページへ移動
        if (session.pictures_sortdir == "desc") {
            // 降順の場合 (100, 99, 98, ...)
            session.pictures_end = session.pictures_start;
            let rows = await mysql.query_p(`SELECT id FROM Pictures WHERE id > ${session.pictures_start}`);
            if (rows) {
                let i = 0;
                if (rows.length > LIMIT) {
                    for (let a of rows) {
                        if (i == LIMIT - 1) {
                            session.pictures_start = a.id;
                            break;
                        }
                        i++;
                    }
                }
                else {
                    session.pictures_start = lastid;
                    session.pictures_end = 1;
                }
            }
            else {
                session.pictures_end = 1;
            }
        }
        else {
            // 昇順の場合 (1, 2, 3, ...)
            session.pictures_end = session.pictures_start;
            let rows = await mysql.query_p(`SELECT id FROM Pictures WHERE id < ${session.pictures_start}`);
            if (rows) {
                let i = 0;
                if (rows.length > LIMIT) {
                    for (let a of rows) {
                        if (rows.length - LIMIT == i) {
                            session.pictures_start = a.id;
                            break;
                        }
                        i++;
                    }
                }
                else {
                    session.pictures_start = 1;
                }
            }
            else {
                session.pictures_start = 1;
            }
        }
    }
    else if (req.query.move == "next") {
        // 次のページへ移動
        if (session.pictures_sortdir == "desc") {
            // 降順
            session.pictures_start = session.pictures_end;
        }
        else {
            // 昇順
            session.pictures_sortdir = "asc";
            session.pictures_start = session.pictures_end;
        }
    }
    else {
        // その他 そのまま
    }

    // SQL 文作成
    let sql = "SELECT id, `album`, title, creator, `path`, `media`, `mark`, `info`, fav, `count`, bindata, DATE_FORMAT(`date`, '%Y-%m-%d') AS `date` FROM Pictures";
    if (session.pictures_album > 0) {
        // アルバム指定あり
        sql += ` WHERE album=${session.pictures_album}`;
        if (session.pictures_sortdir == "desc") {
            sql += " AND id <= " + session.pictures_start;
        }
        else {
            sql += " AND id >= " + session.pictures_start;
        }
        if (session.pictures_search || session.pictures_mark) {
            sql += " AND " + getCriteria(session.pictures_search, session.pictures_mark);
        }
        else {
            // そのまま
        }
    }
    else {
        // アルバム指定なし
        if (session.pictures_sortdir == "desc") {
            // 降順
            sql += " WHERE id <= " + session.pictures_start;
        }
        else {
            // 昇順
            sql += " WHERE id >= " + session.pictures_start;
        }
        if (session.pictures_search || session.pictures_mark) {
            sql += " AND " + getCriteria(session.pictures_search, session.pictures_mark);
        }
        else {
            // そのまま
        }
    }
    if (session.pictures_orderby) {
        // 並び順指定あり
        sql += " ORDER BY " + session.pictures_orderby;
        if (session.pictures_sortdir) {
            sql += " " + session.pictures_sortdir;
        }
        else {
            // そのまま
        }
    }
    else {
        // 並び順指定なしは id とする。
        sql += " ORDER BY id";
        if (session.pictures_sortdir) {
            sql += " " + session.pictures_sortdir;
        }
        else {
            // そのまま
        }
    }
    sql += ` LIMIT ${LIMIT}`;
    return sql;
}

// 指定された id の fav を ＋１する。
router.get('/favorite/:id', (req, res) => {
    let id = req.params.id;
    mysql.execute(`CALL user.favup(1, ${id})`, (err) => {
        res.redirect(req.get('referer'));
    });
});

// 指定された id の count を ＋１する。
function countup(id, res) {
    mysql.execute(`CALL user.countup(1, ${id})`, (err) => {
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
