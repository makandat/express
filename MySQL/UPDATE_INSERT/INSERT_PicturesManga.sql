TRUNCATE PicturesManga;
INSERT INTO PicturesManga SELECT * FROM Pictures WHERE mark='MANGA' ORDER BY id;
CALL MangaSN();
