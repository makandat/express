delimiter //
CREATE PROCEDURE PicturesSN(IN startId INT)
BEGIN
  DECLARE i INT;
  DECLARE xid INT;
  DECLARE xsn INT;
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur CURSOR FOR SELECT id, sn FROM Pictures WHERE id >= startId ORDER BY id ASC;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  SET i = 1;
  read_loop: LOOP
    FETCH cur INTO xid, xsn;
    IF done THEN
      LEAVE read_loop;
    END IF;
    IF i = 0 THEN
      SET i = xsn;
    END IF;
    UPDATE Pictures SET sn = i WHERE id = xid;
    SET i = i + 1;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;

