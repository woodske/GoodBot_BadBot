// set up ======================================================================
var mysql               = require('mysql'),
    snoowrap            = require('snoowrap'),
    stringSimilarity    = require('string-similarity');

// configuration ===============================================================

// DATABASE CONFIGURATION
const con = mysql.createConnection({
    host        :       process.env.DB_HOST,
    user        :       process.env.DB_USER,
    password    :       process.env.DB_PASSWORD,
    database    :       process.env.DB_DATABASE
});

// REDDIT API CONFIGURATION
const r = new snoowrap({
    userAgent       :       process.env.SNOO_USERAGENT,
    clientId        :       process.env.SNOO_CLIENTID,
    clientSecret    :       process.env.SNOO_CLIENTSECRET,
    username        :       process.env.SNOO_USERNAME,
    password        :       process.env.SNOO_PASSWORD
});

r.config({requestDelay: 1000, warnings: false});

// export function =============================================================

module.exports = {
    /**
    * @summary Called from app.js to store a hit into the database. Check if the bot
    *          exists in the database. Generate a score if not, otherwise tally the vote
    * @param {string} the bot's name
    * @param {string} the voter's name
    * @param {string} the vote (good or bad)
    * @param {string} the voter's ID
    * @param {string} the thread's unique ID
    * @returns No return value
    * */
    addToDb: function addToDb(bName, vName, vote, voter_id, link_id) {
            
        var sql = "SELECT botName FROM bot WHERE botName = ?;";
    
        con.query(sql, [bName], function(err, result) {
            if (err) {
                throw (err);
            }
            /**
             * Bot is not in database if result is empty
             * */
            if (Object.keys(result).length == 0) {
                _botScore(bName, vName, vote, voter_id, link_id);
            } else {
                console.log(bName + " is already in the database");
                _addVoter(vName);
                _voterBotMatch(bName, vName, vote, voter_id, link_id);
            }
        });
    }
};

// helper functions ============================================================

/**
* @summary Escapes underscores in usernames to prevent Reddit from italicising text
* @param {string} the username
* @return {string} the escaped username
* */
function _formatUName (username) {
    return (username).replace(/_/g, "\\_");
}

/**
* @summary Bot filtering score generator 
* @param {string} the bot's name
* @param {string} the voter's name
* @param {string} the vote (good or bad)
* @param {string} the voter's ID
* @param {string} the thread's unique ID
* @returns No return value
* */
function _botScore (bName, vName, vote, voter_id, link_id) {
    
    var counter = 30;
    var total = 0;
    var botScore = 0;
    
    r.getUser(bName).getComments({limit: counter}).then(function(listing) {
                
        /**
        * If the bot has less than (counter) comments, it is too new and defaults to 0.
        * */
        if (listing.length < counter) {
            console.log(bName + " has too few comments");
        } else {
            var dataPoints = 0;
            
            listing.forEach(function(value, listIndex) {
                for(var i = listIndex; i < listing.length - 1; i++) {
                    dataPoints++;
                    total += stringSimilarity.compareTwoStrings(listing[listIndex].body, listing[i+1].body);
                }
            });
            
            botScore = (total/dataPoints).toFixed(2);
            console.log(bName + ": " + botScore);
        }
        /**
         * A value of 0.3 or higher is a good indicator this is actually a bot
         * */
        if (botScore >= 0.3) {
            console.log(bName + " is a bot: " + botScore);
            _addBot(bName);
            _addVoter(vName);
            _voterBotMatch(bName, vName, vote, voter_id, link_id);
        } else {
            console.log(bName + " is likely not a bot: " + botScore);
        }
    });
}

/**
* @summary Inserts the bot's name into the bot table
* @param {string} the bot's name
* @returns No return value
* */
function _addBot (bName) {
    
    var sql = "INSERT INTO bot (botName, goodCount, badCount) VALUES (?, 0, 0)";
    
    con.query(sql, [bName], function(err, result) {
        if (err) {
            if (err.code == "ER_DUP_ENTRY") {
                console.log(bName + " is already in the database");
            } else { 
              throw(err);
            }
        } else {
            console.log(bName + " was inserted into the bot table");
        }
    });
}

/**
* @summary Inserts the voter's name into the voter table if it does not exist
* @param {string} the voter's name
* @returns No return value
* */
function _addVoter (vName) {
    
    var sql = "SELECT voterName FROM voter WHERE voterName = ?;";
    
    con.query(sql, [vName], function(err, result) {
        if (err) {
            throw (err);
        }
        /**
         * Bot is not in database if result is empty
         * */
        if (Object.keys(result).length == 0) {
            var sql = "INSERT INTO voter (voterName) VALUES (?)";
            con.query(sql, [vName], function(err, result) {
                if (err) {
                    if (err.code == "ER_DUP_ENTRY")
                        console.log(vName + " is already in the database");
                    else
                        throw (err);
                } else {
                    console.log(vName + " was inserted into the voter table");
                }
            });
        } else {
            console.log(vName + " is already in the database");
        }
    });
}

/**
* @summary Determines if the voter has voted on the bot before
* @param {string} the bot's name
* @param {string} the voter's name
* @param {string} the vote (good or bad)
* @param {string} the voter's ID
* @returns no return value
* */
function _voterBotMatch (bName, vName, vote, voter_id, link_id) {
    
    var sql = "SELECT * FROM bot INNER JOIN bot_voter ON bot.bot_id = bot_voter.bot_id INNER JOIN voter ON bot_voter.voter_id = voter.voter_id " +
        "WHERE bot.botName = ? AND voter.voterName = ?;";
    
    con.query(sql, [bName, vName], function(err, result) {
        if (err) {
            throw (err);
        }
        /**
         * an empty object will return if there is no match between the voter and bot
         * */
        if (Object.keys(result).length == 0) {
            console.log(vName + " has not yet voted for " + bName);
            _createMatch(bName, vName, vote);
            _addVoteToBot(bName, vote);
            _replyToComment(vName, bName, voter_id, link_id);
        } else {
            console.log(vName + " has already voted for " + bName);
        }
    });
}

/**
* @summary Creates a match in the bot_voter table
* @param {string} the bot's name
* @param {string} the voter's name
* @returns No return value
* */
function _createMatch (bName, vName, vote) {
    /**
     * Insert the bot ID, voter ID, vote, and time/date into the bot_voter table to prevent duplicate votes
     * */
    var date = new Date();
    var sql = "INSERT INTO bot_voter (bot_id, voter_id, vote, time) VALUES ((SELECT bot_id FROM bot WHERE botName = ?), " +
        "(SELECT voter_id FROM voter WHERE voterName = ?), ?, ?);";
    
    con.query(sql, [bName, vName, vote, JSON.stringify(date)], function(err, result) {
        if (err) 
            throw (err);
        else
            console.log("Stored that " + vName + " has voted for " + bName);
    });
}

/**
* @summary Increments the bot's goodCount or badCount by 1 in the bot table
* @param {string} the bot's name
* @param {string} the vote (good or bad)
* @returns No return value
* */
function _addVoteToBot(bName, vote) {
    /**
     * Increment the goodCount or badCount depending on the voter comment
     * */
    if (vote == "good") {
        
        var sql = "UPDATE bot SET goodCount = goodCount + 1 WHERE botName = ?;";
        
        con.query(sql, [bName], function(err, result) {
            if (err) 
                throw (err);
            else
                console.log("Added a good bot vote to " + bName);
        });
    } else {
        
        var sql = "UPDATE bot SET badCount = badCount + 1 WHERE botName = ?;";
        
        con.query(sql, [bName], function(err, result) {
            if (err) 
                throw (err);
            else
                console.log("Added a bad bot vote to " + bName);
        });
    }
}

/**
* @summary Reply to voter (once per thread) 
* @param {string} the voter's name
* @param {string} the bot's name
* @param {string} the voter's ID
* @param {string} the thread's unique ID
* @returns No return value
* */
function _replyToComment(vName, bName, voter_id, link_id) {
    
    var message = "Thank you " + _formatUName(vName) + " for voting on " + _formatUName(bName) + ".  \n\n" +
        "This bot wants to find the best and worst bots on Reddit. [You can view results here](" + process.env.RESULTS_LINK + ")." +
        "  \n\n ***  \n\n" +
        "^^Even ^^if ^^I ^^don't ^^reply ^^to ^^your ^^comment, ^^I'm ^^still ^^listening ^^for ^^votes. " +
        "^^Check ^^the ^^webpage ^^to ^^see ^^if ^^your ^^vote ^^registered!";
    
    var sql = "SELECT link_id FROM link WHERE link_id = ?;";
    
    con.query(sql, [link_id], function(err, result) {
        if (err) {
            throw (err);
        }
        /**
         * link_id is not in database if result is empty
         * */
        if (Object.keys(result).length == 0) {
            /**
             * Reply to voter with a link to the results page if there is no reply in the thread.
             * */
            console.log("Replying to " + vName);
            r.getSubmission(voter_id).reply(message);
            
            /**
             * Insert the link_id into the link table
             * */
            var sql = "INSERT INTO link (link_id) VALUES (?)";
            
            con.query(sql, [link_id], function(err, result) {
                if (err) {
                    if (err.code == "ER_DUP_ENTRY") {
                        console.log(link_id + " is already in the database");
                    } else { 
                      throw(err);
                    }
                } else {
                    console.log(link_id + " was inserted into the link table");
                }
            });
        } else {
            console.log("Thread " + link_id + " already has a bot comment");
        }
    });
}
