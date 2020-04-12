TRUNCATE PicturesDoujin;
INSERT INTO PicturesDoujin SELECT * FROM Pictures WHERE mark='DOUJIN' ORDER BY id;
CALL DoujinSN();
