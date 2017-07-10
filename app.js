const mysql = require('mysql');
const express = require('express');
const app = express();
const script = require('./public/scripts/script.js');

/**
 * Declare a static directory to access stylesheets
 * */
app.use(express.static(__dirname + '/public'));

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
// setInterval(function() {
//   script.scrape();
// }, 2150);

/**
 * Homepage. Display the top 6 in most good bot votes and bad bot votes
 * */
app.get('/', function (req, res) {
    res.render('home.ejs');
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

app.listen(process.env.PORT, process.env.IP, function() {
    console.log('GoodBot_BadBot app starting on port ' + process.env.PORT);
});


















