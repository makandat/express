TRUNCATE PicturesPixiv;
INSERT INTO PicturesPixiv SELECT * FROM Pictures WHERE mark='PIXIV' ORDER BY id;
CALL PixivSN();
