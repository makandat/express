delimiter //
-- Pictures の指定した id の行を PicturesPixiv に挿入する。
CREATE PROCEDURE user.InsertPictPhoto(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM user.PicturesPhoto;
  INSERT INTO user.PicturesPhoto SELECT * FROM user.Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE user.PicturesPhoto SET sn = last WHERE id = pid;
END
//
delimiter ;
