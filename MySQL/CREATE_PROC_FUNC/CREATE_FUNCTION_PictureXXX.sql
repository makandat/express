delimiter //
-- id が含まれる Pictures の派生テーブルを返す。
CREATE FUNCTION PicturesXXX(pid INT) RETURNS VARCHAR(20)
BEGIN
  DECLARE xcountmanga INT;
  DECLARE xcounthcg INT;
  DECLARE xcountdoujin INT;
  DECLARE xcountpixiv INT;
  DECLARE xcountphoto INT;

  SELECT count(id) INTO xcountmanga FROM PicturesManga WHERE id = pid;
  SELECT count(id) INTO xcounthcg FROM PicturesHcg WHERE id = pid;
  SELECT count(id) INTO xcountdoujin FROM PicturesDoujin WHERE id = pid;
  SELECT count(id) INTO xcountpixiv FROM PicturesPixiv WHERE id = pid;
  SELECT count(id) INTO xcountphoto FROM PicturesPhoto WHERE id = pid;

  IF xcountmanga = 1 THEN
    RETURN 'PicturesManga';
  ELSEIF xcounthcg = 1 THEN
    RETURN 'PicturesHcg';
  ELSEIF xcountdoujin = 1 THEN
    RETURN 'PicturesDoujin';
  ELSEIF xcountpixiv = 1 THEN
    RETURN 'PicturesPixiv';
  ELSEIF xcountphoto = 1 THEN
    RETURN 'PicturesManga';
  ELSE
    RETURN NULL;
  END IF;
END
//
delimiter ;
