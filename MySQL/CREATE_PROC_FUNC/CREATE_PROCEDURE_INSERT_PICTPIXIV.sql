delimiter //
-- Pictures の指定した id の行を PicturesPixiv に挿入する。
CREATE PROCEDURE user.InsertPictPixiv(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM user.PicturesPixiv;
  INSERT INTO user.PicturesPixiv SELECT * FROM user.Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE user.PicturesPixiv SET sn = last WHERE id = pid;
END
//
delimiter ;
