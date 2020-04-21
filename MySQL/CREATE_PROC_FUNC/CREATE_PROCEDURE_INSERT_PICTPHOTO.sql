delimiter //
-- Pictures の指定した id の行を PicturesPixiv に挿入する。
CREATE PROCEDURE InsertPictPhoto(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesPhoto;
  INSERT INTO PicturesPhoto SELECT * FROM Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE PicturesPhoto SET sn = last WHERE id = pid;
END
//
delimiter ;
