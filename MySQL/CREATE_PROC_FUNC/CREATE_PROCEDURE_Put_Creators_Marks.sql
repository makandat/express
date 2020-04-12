delimiter //
CREATE PROCEDURE user.Put_Creators_Marks()
BEGIN
  DECLARE xcreator VARCHAR(100);
  DECLARE xmark VARCHAR(20);
  DECLARE done INT DEFAULT FALSE;
  DECLARE cur CURSOR FOR SELECT `creator` FROM user.Creators;
  DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;
  OPEN cur;
  read_loop: LOOP
    FETCH cur INTO xcreator;
    IF done THEN
      LEAVE read_loop;
    END IF;
    SELECT MIN(mark) INTO xmark FROM user.Pictures WHERE creator = xcreator;
    UPDATE user.Creators SET marks = xmark WHERE creator = xcreator;
  END LOOP;
  CLOSE cur;
END
//
delimiter ;
