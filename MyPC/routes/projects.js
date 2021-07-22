/* projects.js */
'use strict';
const express = require('express');
const session = require('express-session');
const mysql = require('./MySQL.js');
const dto = require('./DateTime.js');
const router = express.Router();

// プロジェクトアルバム一覧表示
router.get('/', (req, res) => {
    res.render('projects', {title:"プロジェクト", message:""});
});

// プロジェクトの追加・修正 (GET)
router.get("/projectForm", (req, res) => {
    let value = {
        id: "",
        album: 0,
        title: "",
        version: "0.0.0",
        path: "",
        owner: "",
        mark: "",
        info: "",
        git:"",
        backup: "",
        release: dto.getDateString(),
        bindata: 0
    };
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Projects", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            res.render('projectForm', {message:"", marks:marks, value:value});
        }
    });
});

// プロジェクトの追加・修正 (POST)
router.post("/projectForm", (req, res) => {
    let message = "";
    let id = req.body.id;
    let album = req.body.album ? parseInt(req.body.album) : 0;
    let title = req.body.title.replace(/'/g, "''");
    let version = req.body.revision ? req.body.version : "";
    let path = req.body.path.replace(/'/g, "''").replace(/\\/g, "/");
    let owner = req.body.writer ? req.body.owner : "";
    let mark = req.body.mark ? req.body.mark : "";
    let info = req.body.info ? req.body.info.replace(/'/g, "''") : "";
    let git = req.body.info ? req.body.git.replace(/'/g, "''") : "";
    let backup = req.body.backup ? req.body.backup.replace(/'/g, "''").replace(/\\/g, "/") : "";
    let release = req.body.release ? req.body.release : dto.getDateString();
    let bindata = req.body.bindata ? parseInt(req.body.bindata) : 0;
    let value = {
        id:id,
        album:album,
        title:title,
        version:version,
        path:path,
        owner:owner,
        mark:mark,
        info:info,
        git:git,
        backup:backup,
        release:release,
        bindata:bindata
    };

    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Projects", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            if (id) {
                // 更新
                let update = `UPDATE Projects SET album=${album}, title='${title}', revision='${version}', path='${path}', writer='${owner}', mark='${mark}', info='${info}', git='${git}', backup='${backup}', release='${release}', bindata=${bindata} WHERE id=${id}`;
                mysql.execute(update, (err) => {
                    if (err) {
                        message = err.message;
                    }
                    else {
                        message = `(${id}) "${title}" が更新されました。`;
                    }
                    res.render("projectForm", {message:message, value:value, marks:marks});
                });
            }
            else {
                // 挿入
                let insert = `INSERT INTO Projects VALUES(NULL, ${album}, '${title}', '${version}', '${path}', '${owner}', '${mark}', '${info}', '${git}', '${backup}', '${release}', ${bindata}, CURRENT_DATE())`;
                mysql.execute(insert, (err) => {
                    if (err) {
                        message = err.message;
                    }
                    else {
                        message = `"${title}" が追加されました。`;
                    }
                    res.render("projectForm", {message:message, value:value, marks:marks});
                });
            }
        }
    });
});

// データ確認
router.get("/confirmProject/:id", (req, res) => {
    let id = req.params.id;
    let value = {
        id:id,
        album:0,
        title:"",
        version:"0.0.0",
        path:"",
        owner:"",
        mark:"",
        info:"",
        git:"",
        backup:"",
        release:"",
        bindata:0
    };
    let marks = [];
    mysql.query("SELECT DISTINCT mark FROM Projects", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            if (!id) {
                res.render("projectForm", {message:"id が正しくありません。", value:value});
                return;
            }
            else {
                let sql = `SELECT * FROM Projects WHERE id=${id}`;
                mysql.getRow(sql, (err, row) => {
                    if (err) {
                        res.render("projectForm", {message:err.message, value:value});
                    }
                    else {
                        res.render("projectForm", {message:`id=${id} が検索されました。`, value:row});
                    }
                });
            }
        }
    });
});

// プロジェクトの一覧
router.get("/showContent", (req, res) => {
    let result = [];
    let marks = [];
    let album = req.query.album;
    let message = "";
    mysql.query("SELECT DISTINCT mark FROM Projects", (row) => {
        if (row) {
            if (row.mark) {
                marks.push(row.mark);
            }
        }
        else {
            let sql = "SELECT * FROM Projects";
            if (album) {
                sql += ` WHERE album=${album}`;
            }
            mysql.query(sql, (row) => {
                if (row) {
                    result.push(row);
                }
                else {
                    if (album) {
                        message = "アルバム番号： " + album;
                    }
                    res.render("projectlist", {message:message, result:result, marks:marks});
                }
            });
        }
    });
});


// プロジェクト情報詳細表示
router.get("/infoView/:id", (req, res) => {
    let id = req.params.id;
    mysql.getRow("SELECT * FROM Projects WHERE id=" + id, (err, row) => {
        let version = row.version ? row.version : "0.0.0";
        let message = "Version " + row.version + "/ Release " + dto.getDateString(row.release);
        res.render("projectInfoView", {title:row.title, message:message, info:row.info});
    });
});

// エクスポート
module.exports = router;
