CREATE TABLE `Album` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `mark` varchar(10) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `bindata` int(11) DEFAULT '0',
  `groupname` varchar(30) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `album_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

CREATE TABLE `PictureAlbum` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `path` varchar(500) NOT NULL,
  `creator` varchar(100) NOT NULL,
  `info` varchar(100) DEFAULT NULL,
  `fav` int(1) DEFAULT '0',
  `bindata` int(11) DEFAULT '0',
  `picturesid` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  `sn` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `path` (`path`),
  KEY `album_path` (`path`),
  KEY `album_number` (`album`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
