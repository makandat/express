delimiter //
-- Pictures の指定した id の行を PicturesPixiv に挿入する。
CREATE PROCEDURE InsertPictPixiv(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesPixiv;
  INSERT INTO PicturesPixiv SELECT * FROM Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE PicturesPixiv SET sn = last WHERE id = pid;
END
//
delimiter ;
