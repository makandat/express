delimiter //
CREATE PROCEDURE user.IncreaseVideoCount(IN pid INT)
BEGIN
  DECLARE xcount INT;
  SELECT count + 1 INTO xcount FROM user.Videos WHERE id = pid;
  UPDATE user.Videos SET count = xcount WHERE id = pid;
END
//
delimiter ;
