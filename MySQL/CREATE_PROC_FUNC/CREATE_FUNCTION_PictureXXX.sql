delimiter //
SET GLOBAL log_bin_trust_function_creators = 1;
-- id が含まれる Pictures の派生テーブルを返す。
CREATE FUNCTION user.PicturesXXX(pid INT) RETURNS VARCHAR(20)
BEGIN
  DECLARE xcountmanga INT;
  DECLARE xcounthcg INT;
  DECLARE xcountdoujin INT;
  DECLARE xcountpixiv INT;
  DECLARE xcountphoto INT;
  DECLARE xtable VARCHAR(20);

  SELECT count(id) INTO xcountmanga FROM user.PicturesManga WHERE id = pid;
  SELECT count(id) INTO xcounthcg FROM user.PicturesHcg WHERE id = pid;
  SELECT count(id) INTO xcountdoujin FROM user.PicturesDoujin WHERE id = pid;
  SELECT count(id) INTO xcountpixiv FROM user.PicturesPixiv WHERE id = pid;
  SELECT count(id) INTO xcountphoto FROM user.PicturesPhoto WHERE id = pid;

  IF xcountmanga = 1 THEN
    SET xtable = 'PicturesManga';
  ELSEIF xcounthcg = 1 THEN
    SET xtable = 'PicturesHcg';
  ELSEIF xcountdoujin = 1 THEN
    SET xtable = 'PicturesDoujin';
  ELSEIF xcountpixiv = 1 THEN
    SET xtable = 'PicturesPixiv';
  ELSEIF xcountphoto = 1 THEN
    SET xtable = 'PicturesManga';
  ELSE
    SET xtable = NULL;
  END IF;
  RETURN xtable;
END
//
delimiter ;
