delimiter //
CREATE PROCEDURE user.IncreaseCount(IN pid INT)
BEGIN
  DECLARE xcount INT;
  SELECT count INTO xcount FROM user.Pictures WHERE id = pid;
  SET xcount = xcount + 1;
  UPDATE user.Pictures SET count = xcount WHERE id = pid;
END
//
delimiter ;
