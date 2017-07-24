const mysql = require('mysql');
const snoowrap = require('snoowrap');

/**
 * Connect to Database. Hosted at AWS
 * */
const con = mysql.createConnection({
    host        :       process.env.DB_HOST,
    user        :       process.env.DB_USER,
    password    :       process.env.DB_PASSWORD,
    database    :       process.env.DB_DATABASE
});

/**
 * Connect to the Reddit API via snoowrap
 * */
const r = new snoowrap({
    userAgent       :       process.env.SNOO_USERAGENT,
    clientId        :       process.env.SNOO_CLIENTID,
    clientSecret    :       process.env.SNOO_CLIENTSECRET,
    username        :       process.env.SNOO_USERNAME,
    password        :       process.env.SNOO_PASSWORD
});

module.exports = {
    /**
    * @summary Called from app.js to store a hit into the database
    * @param {string} the bot's name
    * @param {string} the voter's name
    * @param {string} the vote (good or bad)
    * @returns No return value
    * */
    addToDb: function addToDb(bName, vName, vote, voter_id) {
        /**
         * Add bot to database
         * */
        _addBot(bName);
        
        /**
         * Add voter to database
         * */
        _addVoter(vName);
        
        /**
         * Query the bot_voter table to see if the voter has voted for this bot before.
         * If there is no match, create a match and tally the vote.
         * */
       _voterBotMatch(bName, vName, vote, voter_id);
    }
};

/**
* @summary Inserts the bot's name into the bot table
* @param {string} the bot's name
* @returns No return value
* */
function _addBot (bName) {
    var sql = "INSERT INTO bot (botName, goodCount, badCount) VALUES ('" + bName + "', 0, 0)";
    con.query(sql, function(err, result) {
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
* @summary Inserts the voter's name into the voter table
* @param {string} the voter's name
* @returns No return value
* */
function _addVoter (vName) {
    var sql = "INSERT INTO voter (voterName) VALUES ('" + vName + "')";
    con.query(sql, function(err, result) {
        if (err) {
            if (err.code == "ER_DUP_ENTRY")
                console.log(vName + " is already in the database");
            else
                throw (err);
        } else {
            console.log(vName + " was inserted into the voter table");
        }
    });
}

/**
* @summary Escapes underscores in usernames to prevent Reddit from italicising text
* @param {string} the username
* @return {string} the escaped username
* */
function _formatUName (username) {
    return (username).replace(/_/g, "\\_");
}

/**
* @summary Determines if the voter has voted on the bot before
* @param {string} the bot's name
* @param {string} the voter's name
* @param {string} the vote (good or bad)
* @param {string} the voter's ID
* @returns no return value
* */
function _voterBotMatch (bName, vName, vote, voter_id) {
    var sql = "SELECT * FROM bot INNER JOIN bot_voter ON bot.bot_id = bot_voter.bot_id INNER JOIN voter ON bot_voter.voter_id = voter.voter_id " +
        "WHERE bot.botName = '" + bName + "' AND voter.voterName = '" + vName + "';";
    con.query(sql, function(err, result) {
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
            /**
             * Delay one second then reply to voter with a link to the results page.
             * */
            // setTimeout(function () {
            //     console.log("Replying to " + vName);
            //     r.getSubmission(voter_id).reply("Thank you " + _formatUName(vName) + " for voting on " + _formatUName(bName) + ".  \n\n" +
            //     "This bot wants to find the best and worst bots on Reddit. [You can view results here](" + process.env.RESULTS_LINK + ").");
            // }, 1000);
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
    var sql = "INSERT INTO bot_voter (bot_id, voter_id, vote, time) VALUES ((SELECT bot_id FROM bot WHERE botName = '" + bName + "'), " +
        "(SELECT voter_id FROM voter WHERE voterName = '" + vName + "'), '" + vote + "', " + JSON.stringify(date) + ");";
    con.query(sql, function(err, result) {
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
        var sql = "UPDATE bot SET goodCount = goodCount + 1 WHERE botName = '" + bName + "';";
        con.query(sql, function(err, result) {
            if (err) 
                throw (err);
            else
                console.log("Added a good bot vote to " + bName);
        });
    } else {
        var sql = "UPDATE bot SET badCount = badCount + 1 WHERE botName = '" + bName + "';";
        con.query(sql, function(err, result) {
            if (err) 
                throw (err);
            else
                console.log("Added a bad bot vote to " + bName);
        });
    }
}
