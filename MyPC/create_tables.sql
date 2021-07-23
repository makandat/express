CREATE DATABASE IF NOT EXISTS `user` DEFAULT CHARSET=utf8;

CREATE TABLE IF NOT EXISTS `user.Pictures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) DEFAULT 0,
  `title` varchar(100) NOT NULL,
  `creator` varchar(50) NOT NULL,
  `path` varchar(500) NOT NULL,
  `mark` varchar(10) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `fav` char(1) DEFAULT '0',
  `count` int(8) DEFAULT 0,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  `sn` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `PATH` (`path`),
  KEY `pictures_title` (`title`),
  KEY `pictures_path` (`path`),
  KEY `pictures_cretator` (`creator`),
  KEY `pictures_info` (`info`),
  KEY `pictures_mark` (`mark`),
  KEY `pictures_date` (`date`),
  KEY `pictures_sn` (`sn`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `user.Videos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(8) DEFAULT 0,
  `title` varchar(400) NOT NULL,
  `path` varchar(400) NOT NULL,
  `media` varchar(50) DEFAULT NULL,
  `series` varchar(200) DEFAULT NULL,
  `mark` varchar(16) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `fav` int(8) DEFAULT 0,
  `count` int(8) DEFAULT 0,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  `sn` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `path` (`path`),
  KEY `videos_title` (`title`),
  KEY `videos_series` (`series`),
  KEY `videos_info` (`info`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `user.Music` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) DEFAULT NULL,
  `title` varchar(100) NOT NULL,
  `path` varchar(400) NOT NULL,
  `artist` varchar(50) DEFAULT NULL,
  `mark` varchar(16) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `fav` char(1) DEFAULT '0',
  `count` int(8) DEFAULT 0,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  `sn` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `path` (`path`),
  KEY `music_title` (`title`),
  KEY `music_path` (`path`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;



CREATE TABLE IF NOT EXISTS `user.Projects` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) DEFAULT 0,
  `title` varchar(100) NOT NULL,
  `version` varchar(10) DEFAULT NULL,
  `path` varchar(400) NOT NULL,
  `owner` varchar(50) DEFAULT NULL,
  `mark` varchar(20) DEFAULT NULL,
  `info` varchar(200) DEFAULT NULL,
  `git` varchar(400) DEFAULT NULL,
  `backup` varchar(400) DEFAULT NULL,
  `release` date DEFAULT NULL,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `title` (`title`),
  UNIQUE KEY `path` (`path`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `user.Documents` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) DEFAULT 0,
  `title` varchar(100) NOT NULL,
  `revision` varchar(10) DEFAULT NULL,
  `path` varchar(400) NOT NULL,
  `writer` varchar(50) DEFAULT NULL,
  `mark` varchar(20) DEFAULT NULL,
  `info` varchar(200) DEFAULT NULL,
  `backup` varchar(400) DEFAULT NULL,
  `release` date DEFAULT NULL,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `title` (`title`),
  UNIQUE KEY `path` (`path`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `user.Album` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `mark` varchar(10) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `bindata` int(11) DEFAULT 0,
  `groupname` varchar(30) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `album_name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `user.Playlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `items` text DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


CREATE TABLE IF NOT EXISTS `user.BINDATA` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(50) NOT NULL,
  `original` varchar(400) DEFAULT NULL,
  `datatype` char(10) DEFAULT NULL,
  `data` blob DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `size` int(11) DEFAULT 0,
  `sn` int(11) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;
