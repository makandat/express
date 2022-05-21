-- count += 1
-- tablecode 1: Pictures, 2: Videos, 3: Music
-- pid: ID of the record.
DELIMITER //
CREATE PROCEDURE user.countup(IN tablecode INT, IN pid INT)
BEGIN
  DECLARE xc INT;
  CASE tablecode
    WHEN 1 THEN
      SELECT `count` + 1 INTO xc FROM user.Pictures WHERE id = pid;
      UPDATE user.Pictures SET `count` = xc WHERE id = pid;
    WHEN 2 THEN
      SELECT `count` + 1 INTO xc FROM user.Videos WHERE id = pid;
      UPDATE user.Videos SET `count` = xc WHERE id = pid;
    WHEN 3 THEN
      SELECT `count` + 1 INTO xc FROM user.Music WHERE id = pid;
      UPDATE user.Music SET `count` = xc WHERE id = pid;
    END CASE;
END
//
DELIMITER ;

-- fav += 1
DELIMITER //
-- tablecode 1: Pictures, 2: Videos, 3: Music
-- pid: ID of the record.
CREATE PROCEDURE user.favup(IN tablecode INT, IN pid INT)
BEGIN
  DECLARE xc INT;
  CASE tablecode
    WHEN 1 THEN
      SELECT `fav` + 1 INTO xc FROM user.Pictures WHERE id = pid;
      UPDATE user.Pictures SET `fav` = xc WHERE id = pid;
    WHEN 2 THEN
      SELECT `fav` + 1 INTO xc FROM user.Videos WHERE id = pid;
      UPDATE user.Videos SET `fav` = xc WHERE id = pid;
    WHEN 3 THEN
      SELECT `fav` + 1 INTO xc FROM user.Music WHERE id = pid;
      UPDATE user.Music SET `fav` = xc WHERE id = pid;
    END CASE;
END
//
DELIMITER ;
