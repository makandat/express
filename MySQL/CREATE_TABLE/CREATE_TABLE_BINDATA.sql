-- バイナリーデータ
CREATE TABLE `BINDATA` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(50) NOT NULL,
  `original` varchar(400) DEFAULT NULL,
  `datatype` char(10) DEFAULT NULL,
  `data` blob,
  `info` varchar(100) DEFAULT NULL,
  `size` int(11) DEFAULT 0,
  `sn` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8;
