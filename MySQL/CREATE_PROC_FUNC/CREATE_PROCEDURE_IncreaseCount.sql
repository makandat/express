delimiter //
CREATE PROCEDURE user.IncreaseCount(IN pid INT)
BEGIN
  DECLARE xcount INT;
  DECLARE countTotal INT;
  DECLARE xcreator VARCHAR(50);

  SELECT `count` + 1 INTO xcount FROM user.Pictures WHERE id = pid;
  UPDATE user.Pictures SET `count` = xcount WHERE id = pid;

  SELECT creator INTO xcreator FROM user.Pictures WHERE id = pid;
  SELECT `count` INTO countTotal FROM user.Pictures WHERE creator = xcreator;
  UPDATE user.Creators SET `refcount` = countTotal WHERE creator = xcreator;
END
//
delimiter ;
