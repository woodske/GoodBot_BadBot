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
    FOREIGN KEY (bot_id) REFERENCES bot (bot_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    FOREIGN KEY (voter_id) REFERENCES voter (voter_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE
) ENGINE=InnoDB;