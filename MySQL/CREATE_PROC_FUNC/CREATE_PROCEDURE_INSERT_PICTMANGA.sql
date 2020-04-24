delimiter //
-- Pictures の指定した id の行を PicturesManga に挿入する。
CREATE PROCEDURE user.InsertPictManga(IN pid INT)
BEGIN
  DECLARE last INT;
  SELECT MAX(sn) INTO last FROM PicturesManga;
  INSERT INTO user.PicturesManga SELECT * FROM user.Pictures WHERE id = pid;
  SET last = last + 1;
  UPDATE user.PicturesManga SET sn = last WHERE id = pid;
END
//
delimiter ;
