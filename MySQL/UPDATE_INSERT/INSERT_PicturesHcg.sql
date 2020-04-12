TRUNCATE PicturesHcg;
INSERT INTO PicturesHcg SELECT * FROM Pictures WHERE mark='HCG' ORDER BY id;
CALL HcgSN();
