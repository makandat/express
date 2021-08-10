-- データベース (user)
CREATE DATABASE IF NOT EXISTS `user` DEFAULT CHARSET=utf8;
use user

-- 画像フォルダ (Pictures)
CREATE TABLE IF NOT EXISTS `Pictures` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) DEFAULT 0,
  `title` varchar(100) NOT NULL,
  `creator` varchar(50) NOT NULL,
  `path` varchar(500) NOT NULL,
  `media` varchar(50) DEFAULT NULL,
  `mark` varchar(10) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `fav` int(8) DEFAULT 0,
  `count` int(8) DEFAULT 0,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  `sn` int(11) DEFAULT NULL COMMENT '使用しない',
  PRIMARY KEY (`id`),
  UNIQUE KEY `PATH` (`path`),
  KEY `pictures_title` (`title`),
  KEY `pictures_path` (`path`),
  KEY `pictures_cretator` (`creator`),
  KEY `pictures_info` (`info`),
  KEY `pictures_mark` (`mark`),
  KEY `pictures_date` (`date`),
  KEY `pictures_sn` (`sn`)
) ENGINE=InnoDB AUTO_INCREMENT=21043 DEFAULT CHARSET=utf8;

-- 動画 (Videos)
CREATE TABLE IF NOT EXISTS `Videos` (
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
  `sn` int(11) DEFAULT NULL COMMENT '使用しない',
  PRIMARY KEY (`id`),
  UNIQUE KEY `PATH` (`path`),
  KEY `info` (`info`),
  KEY `videos_path` (`path`),
  KEY `videos_title` (`title`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;

-- 音楽 (Music)
CREATE TABLE `Music` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `album` int(11) DEFAULT NULL,
  `title` varchar(100) NOT NULL,
  `path` varchar(400) NOT NULL,
  `artist` varchar(50) DEFAULT NULL,
  `media` varchar(50) DEFAULT NULL,
  `mark` varchar(16) DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `fav` int(8) DEFAULT 0,
  `count` int(8) DEFAULT 0,
  `bindata` int(11) DEFAULT 0,
  `date` date DEFAULT NULL,
  `sn` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `path` (`path`),
  KEY `music_title` (`title`),
  KEY `music_path` (`path`)
) ENGINE=InnoDB AUTO_INCREMENT=41 DEFAULT CHARSET=utf8;


-- プロジェクト (Projects)
CREATE TABLE IF NOT EXISTS `Projects` (
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

-- 文書 (Documents)
CREATE TABLE IF NOT EXISTS `Documents` (
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

-- アルバム (Album)
CREATE TABLE IF NOT EXISTS `Album` (
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

-- プレイリスト
CREATE TABLE IF NOT EXISTS `Playlists` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(100) NOT NULL,
  `items` text DEFAULT NULL,
  `info` varchar(100) DEFAULT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1 DEFAULT CHARSET=utf8;


-- サムネール画像等の格納用テーブル (BINDATA)
CREATE TABLE IF NOT EXISTS `BINDATA` (
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

-- レコード識別マーク定義 (Marks)
CREATE TABLE `Marks` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `mark` varchar(20) NOT NULL,
  `tablename` varchar(20) NOT NULL,
  `info` varchar(150) NOT NULL,
  `date` date DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8;
