-- count += 1
DELIMITER //
CREATE PROCEDURE user.countup(IN pid INT)
BEGIN
  DECLARE xc INT;
  SELECT `count` + 1 INTO xc FROM user.Pictures WHERE id = pid;
  UPDATE user.Pictures SET `count` = xc WHERE id = pid;
END
//
DELIMITER ;

-- fav += 1
DELIMITER //
CREATE PROCEDURE user.favup(IN pid INT)
BEGIN
  DECLARE xc INT;
  SELECT `fav` + 1 INTO xc FROM user.Pictures WHERE id = pid;
  UPDATE user.Pictures SET `fav` = xc WHERE id = pid;
END
//
DELIMITER ;
