DROP TABLE IF EXISTS bot_voter;
DROP TABLE IF EXISTS bot;
DROP TABLE IF EXISTS voter;

CREATE TABLE bot (
    bot_id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    botName varchar(255) NOT NULL UNIQUE KEY,
    goodCount int(11) NOT NULL,
    badCount int(11) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE voter (
    voter_id int(11) NOT NULL AUTO_INCREMENT PRIMARY KEY,
    voterName varchar(255) NOT NULL UNIQUE KEY
) ENGINE=InnoDB;

CREATE TABLE bot_voter (
    bot_id int(11) NOT NULL,
    voter_id int(11) NOT NULL,
    PRIMARY KEY (bot_id, voter_id),
    vote varchar(255),
    time varchar(255),
    vote_hour int(11),
    vote_day int(11),
    vote_month int(11),
    vote_year int(11),
    FOREIGN KEY (bot_id) REFERENCES bot (bot_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (voter_id) REFERENCES voter (voter_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE link (
    link_id int(11) NOT NULL PRIMARY KEY
) ENGINE=InnoDB;

CREATE TABLE skipOver (
    userName varchar(255) NOT NULL PRIMARY KEY
) ENGINE=InnoDB;