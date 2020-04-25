delimiter //
CREATE PROCEDURE user.VideosSN(IN startId INT)
BEGIN
  DECLARE i INT;
  DECLARE xid INT;
  DECLARE xsn INT;
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur CURSOR FOR SELECT id, sn FROM user.Videos WHERE id >= startId ORDER BY id ASC;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  SET i = 0;
  read_loop: LOOP
    FETCH cur INTO xid, xsn;
    IF done THEN
      LEAVE read_loop;
    END IF;
    IF i = 0 THEN
      IF xsn IS NULL THEN
        SET i = 1;
      ELSE
        SET i = xsn;
      END IF;
    END IF;
    UPDATE user.Videos SET sn = i WHERE id = xid;
    SET i = i + 1;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;

