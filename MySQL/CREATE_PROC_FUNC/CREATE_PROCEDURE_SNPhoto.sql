delimiter //
CREATE PROCEDURE PhotoSN()
BEGIN
  DECLARE i INT;
  DECLARE xid INT;
  DECLARE xsn INT;
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur CURSOR FOR SELECT id, sn FROM user.PicturesPhoto ORDER BY id ASC;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  SET i = 1;
  read_loop: LOOP
    FETCH cur INTO xid, xsn;
    IF done THEN
      LEAVE read_loop;
    END IF;
    UPDATE user.PicturesPhoto SET sn = i WHERE id = xid;
    SET i = i + 1;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;

