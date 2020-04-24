delimiter //
CREATE PROCEDURE user.CreatorsID()
BEGIN
  DECLARE i INT;
  DECLARE xid INT;
  DECLARE xcreator VARCHAR(50);
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur CURSOR FOR SELECT creator FROM user.Creators ORDER BY creator ASC;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

  OPEN cur;
  SET i = 1;
  read_loop: LOOP
    FETCH cur INTO xcreator;
    IF done THEN
      LEAVE read_loop;
    END IF;
    UPDATE user.Creators SET id = i WHERE creator = xcreator;
    SET i = i + 1;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;

