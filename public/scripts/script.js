const snoowrap = require('snoowrap');
const db = require('./db.js');

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
     * Grab the 100 newest comments from /r/all and check if
     * the comment says "good bot" or "bad bot". If so,
     * obtain the parent name, commenter's name, and good/bad result
     * to store in the database.
     * */
    scrape: function() {
        /**
         * commentObj stores a returned promise containing 100 comments as JSON
         * */
        var commentObj = r.getNewComments('all', {
            limit: 100
        });
    
        commentObj.then(function(listing) {
            listing.forEach(function(key) {
                /**
                 * Check if comment meets the search criteria. 
                 * If so, pass the comment object and vote to storeVote() to 
                 * handle the database insertions and commenting
                 * */
                var comment = key.body.substring(0,8).toLowerCase();
                
                
                if(comment == "good bot" || "goodbot") {
                    console.log("Found comment '" + key.body + "'");
                    _storeVote(key, "good");
                }
                else if(comment == "bad bot" || "badbot") {
                    console.log("Found comment '" + key.body + "'");
                    _storeVote(key, "bad");
                }
            });
        });
    }
};

/**
 * @summary Grabs the parent comment's name and sends relevant information
 *      to addToDb();
 * @param {object} comment object containing the comment's metadata
 * @param {string} the vote (good or bad)
 * @returns No return value
 * */
function _storeVote(commentObj, result) {
    /**
     * The type prefix ("t1_") indicates that the comment's parent is a comment
     * */
    if (commentObj.parent_id.substring(0,2) == "t1") {
        var voterName = commentObj.author.name;
        console.log("The voter is " + voterName);
        /**
         * Dealy one second, then find the username of the parent comment. This is the bot's name.
         * */
        setTimeout(function () {
            r.getComment(commentObj.parent_id).fetch().then(function (obj) {
                console.log("The bot is " + obj.author.name);
                /**
                 * Check if the voter and bot name are the same. If not then
                 * send bot name, voter name, vote result, and voter ID to addToDb found in
                 * the db.js file. This handles the database interaction and commenting.
                 * */
                if (obj.author.name != voterName) {
                    db.addToDb(obj.author.name, voterName, result, commentObj.name);
                }
            });
        }, 1000);
        
    } else {
        console.log(voterName + " did not respond to a comment");
    }
}





