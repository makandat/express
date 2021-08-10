/* documents.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const dto = require('./DateTime.js');
const fso = require('./FileSystem.js');
const router = express.Router();

// 書棚一覧表示
router.get('/', (req, res) => {
    res.render('documents', {title:"文書(書棚)一覧", message:""});
});

// 文書の追加・修正 (GET)
router.get("/documentForm", (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        revision: "0",
        path: "",
        writer: "",
        mark: "",
        info: "",
        backup: "",
        release: dto.getDateString(),
        bindata: 0
    };
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Documents", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            if (req.query.id) {
                mysql.getRow("SELECT * FROM Documents WHERE id = " + req.query.id, (err, row) => {
                    if (err) {
                        res.render("showInfo", {message:err.message, title:"エラー", icon:"cancel.png"})
                    }
                    else {
                        res.render('documentForm', {message:"", marks:marks, value:row});
                    }
                });
            }
            else {
                res.render('documentForm', {message:"", marks:marks, value:value});
            }
        }
    });
});

// 文書の追加・修正 (POST)
router.post("/documentForm", (req, res) => {
    let message = "";
    let id = req.body.id;
    let album = req.body.album ? parseInt(req.body.album) : 0;
    let title = req.body.title.replace(/'/g, "''");
    let revision = req.body.revision ? req.body.revision : "";
    let path = req.body.path.replace(/'/g, "''").replace(/\\/g, "/");
    let writer = req.body.writer ? req.body.writer : "";
    let mark = req.body.mark ? req.body.mark : "";
    let info = req.body.info ? req.body.info.replace(/'/g, "''") : "";
    let backup = req.body.backup ? req.body.backup.replace(/'/g, "''").replace(/\\/g, "/") : "";
    let release = req.body.release ? req.body.release : dto.getDateString();
    let bindata = req.body.bindata ? parseInt(req.body.bindata) : 0;
    let value = {
        id:id,
        album:album,
        title:title,
        revision:revision,
        path:path,
        writer:writer,
        mark:mark,
        info:info,
        backup:backup,
        release:release,
        bindata:bindata
    };

    if (!fso.exists(req.body.path)) {
        res.render('showInfo', {title:"エラー", message:path + " が存在しません。", icon:"cancel.png"});
        return;
    }
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Documents", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            if (id) {
                // 更新
                let update = `UPDATE Documents SET album=${album}, title='${title}', revision='${revision}', path='${path}', writer='${writer}', mark='${mark}', info='${info}', backup='${backup}', \`release\`=DATE('${release}'), bindata=${bindata} WHERE id=${id}`;
                mysql.execute(update, (err) => {
                    if (err) {
                        message = err.message;
                    }
                    else {
                        message = `(${id}) "${title}" が更新されました。`;
                    }
                    res.render("documentForm", {message:message, value:value, marks:marks});
                });
            }
            else {
                // 挿入
                let insert = `INSERT INTO Documents VALUES(NULL, ${album}, '${title}', '${revision}', '${path}', '${writer}', '${mark}', '${info}', '${backup}', '${release}', ${bindata}, CURRENT_DATE())`;
                mysql.execute(insert, (err) => {
                    if (err) {
                        message = err.message;
                    }
                    else {
                        message = `"${title}" が追加されました。`;
                    }
                    res.render("documentForm", {message:message, value:value, marks:marks});
                });
            }
        }
    });
});

// データ確認
router.get("/confirmDocument", (req, res) => {
    let id = req.query.id;
    let value = {
        id:id,
        album:0,
        title:"",
        revision:"0",
        path:"",
        writer:"",
        mark:"",
        info:"",
        backup:"",
        release:"",
        bindata:0
    };
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Documents", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            if (!id) {
                res.render("showInfo", {message:"id が正しくありません。", title:"エラー", icon:"cancel.png"});
                return;
            }
            else {
                let sql = `SELECT * FROM Documents WHERE id=${id}`;
                mysql.getRow(sql, (err, row) => {
                    if (err) {
                        res.render("showInfo", {message:err.message, title:"エラー", icon:"cancel.png"});
                    }
                    else {
                        if (row) {
                            res.render("documentForm", {message:`id=${id} が検索されました。`, value:row, marks:marks});
                        }
                        else {
                            res.render("showInfo", {message:"不正なパラメータが指定されました。", title:"エラー", icon:"cancel.png"});
                        }
                    }
                });    
            }
        }
    });
});

// 文書の一覧
router.get("/showContent", (req, res) => {
    let result = [];
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Documents", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            let sortasc = "";
            let sortdesc = "";
            let sql = "SELECT * FROM Documents";
            if (req.query.album) {
                sql += ` WHERE album=${req.query.album}`;
            }
            if (req.query.sortdir) {
                session.projects_sortdir = req.query.sortdir;
                if (session.projects_sortdir == "desc") {
                    sortasc = "";
                    sortdesc = "●";   
                }
                else {
                    sortasc = "●";
                    sortdesc = "";
                }
            }
            else {
                session.projects_sortdir = "asc";
                sortasc = "●";
                sortdesc = "";
            }
            sql += " ORDER BY id " + session.projects_sortdir;
            try {
                mysql.query(sql, (row) => {
                    if (row) {
                        result.push(row);
                    }
                    else {
                        res.render("documentlist", {message:"", result:result, marks:marks, sortasc:sortasc, sortdesc:sortdesc});
                    }
                });    
            }
            catch (err) {
                res.render("documentlist", {message:"致命的エラー：" + err.message, result:[], marks:[]});
            }
        }
    });
});

// エクスポート
module.exports = router;
