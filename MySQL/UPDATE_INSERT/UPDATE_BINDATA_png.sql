-- BINDATA.title が .png で終わるものを取り出す。
SELECT id, title AS M FROM BINDATA WHERE (title REGEXP '\.png$') = 1;
-- BINDATA.title の後ろ4文字を削除する。
UPDATE BINDATA SET title=SUBSTRING(title, 1, INSTR(title, '.png')-1) WHERE (title REGEXP '\.png$') = 1 AND id BETWEEN n AND m;
