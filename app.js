const mysql = require('mysql');
const express = require('express');
const app = express();
const script = require('./public/scripts/script.js');
const bodyParser = require('body-parser');

/**
 * Declare a static directory to access stylesheets
 * */
app.use(express.static(__dirname + '/public'));


app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

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
 * Every 2.15 seconds, call scrape() to search Reddit for new comments
 * */
setInterval(function() {
  script.scrape();
}, 2150);

/**
 * Homepage. Display the top 6 in most good bot votes and bad bot votes
 * */
app.get('/', function (req, res) {
    
    var total;              //Total number of bot votes
    var goodCount;          //Total number of good bot votes
    var badCount;           //Total number of bad bot votes
    var botNameArr = [];    //Array of bot names
    var botScoreArr = [];   //Array of confidence interval scores
    
    var sql = "SELECT SUM(goodCount), SUM(badCount), SUM(goodCount) + SUM(badCount) FROM bot;";
    con.query(sql, function(err, result) {
        if (err) {
            throw (err);
        }
        total = result[0]['SUM(goodCount) + SUM(badCount)'];
        goodCount = result[0]['SUM(goodCount)'];
        badCount = result[0]['SUM(badCount)'];
    });
    
    var sql = "SELECT botName, ((goodCount + 1.9208) / (goodCount + badCount) - " +
                "1.96 * SQRT((goodCount * badCount) / (goodCount + badCount) + 0.9604) / " +
                "(goodCount + badCount)) / (1 + 3.8416 / (goodCount + badCount)) " +
                "AS ci_lower_bound FROM bot WHERE goodCount + badCount > 0 " +
                "ORDER BY ci_lower_bound DESC limit 6;";

    con.query(sql, function(err, result) {
        if (err) 
            throw (err);
            
        result.forEach(function(key) {
            botNameArr.push(key.botName);
            botScoreArr.push(key.ci_lower_bound);
        });
        
        res.render('home.ejs', 
            {
                total: total,
                goodCount: goodCount,
                badCount: badCount,
                botName: botNameArr,
                botScore: botScoreArr
            }
        );
    });
});



app.get('/good_filter', function (req, res) {
    var botNameArr = [];
    var botVoteArr = [];
    
    var sql = "SELECT botName, goodCount FROM bot ORDER BY goodCount DESC limit 6;";
    con.query(sql, function(err, result) {
        if (err) {
            throw (err);
        }
        result.forEach(function(key) {
            botNameArr.push(key.botName);
            botVoteArr.push(key.goodCount);
        });
        res.render('good_filter.ejs', 
            {   
                botName: botNameArr, 
                botVote: botVoteArr
            }
        );  
    });
});

app.get('/bad_filter', function (req, res) {
    var botNameArr = [];
    var botVoteArr = [];
    
   var sql = "SELECT botName, badCount FROM bot ORDER BY badCount DESC limit 6;";
    con.query(sql, function(err, result) {
        if (err) {
             throw (err);
        }
        result.forEach(function(key) {
            botNameArr.push(key.botName);
            botVoteArr.push(key.badCount);
        });
        res.render('bad_filter.ejs', 
            {   
                botName: botNameArr, 
                botVote: botVoteArr
            }
        );  
    });
});

app.get('/all_filter', function(req, res) {
    
    var byGoodArr = [];
    
    var sql = "SELECT botName, goodCount, badCount FROM bot WHERE goodCount > 0 ORDER BY goodCount DESC;";
    con.query(sql, function(err, result) {
        if (err) {
            throw (err);
        }
        byGoodArr = result;
    });
    
    var sql = "SELECT botName, goodCount, badCount FROM bot WHERE badCount > 0 ORDER BY badCount DESC;";
    con.query(sql, function(err, result) {
        if (err) {
            throw (err);
        }
        res.render('all_filter.ejs', {byGoodArr: byGoodArr, byBadArr: result});
    });
});

app.post('/voter', function(req, res) {
    
    var sql = "SELECT botName FROM bot INNER JOIN bot_voter ON bot.bot_id = bot_voter.bot_id " +
        "INNER JOIN voter ON bot_voter.voter_id = voter.voter_id " +
        "WHERE voter.voterName = '" + req.body.voter + "';";
    con.query(sql, function(err, result) {
        if (err) {
            throw (err);
        }
        res.render('voter.ejs', {voter: req.body.voter, bot: result});
    });
});

app.listen(process.env.PORT, process.env.IP, function() {
    console.log('GoodBot_BadBot app starting on port ' + process.env.PORT);
});


















