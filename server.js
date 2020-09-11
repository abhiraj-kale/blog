const express = require('express')
const app = express();
const PORT = process.env.PORT || 3000;
const path = require('path')
const bodyParser = require('body-parser');
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
const sha256 = require('sha256')
const mysql = require('mysql');
var nodemailer = require('nodemailer');
var session = require('express-session');
app.use(session({secret: 'ssshhhhh'}));

var username;
var email ;
var password;
var otp = Math.floor(100000 + Math.random() * 900000);

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'abhiraj',
  database: 'blog'
});
connection.connect((err) => {
  if (err) throw err;
  console.log('Connected to Database.');
});

app.set('view engine', 'ejs')
app.set('views', './views');
app.use(express.static('public'));

app.get('/', function (req,res) {
    req.session.loggedin = false;
    res.render('index')
})

app.post('/signup', function (req, res) {  
     username = req.body.username;
     email = req.body.email;
     password = sha256.x2(toString(req.body.password));

    var q = `SELECT * FROM user_info WHERE username=? OR email=?`;
    connection.query(q,[username,email], (err,rows)=>{
        if (err) {
            console.log(err)
        }
        if(rows.length==0){

            // Genertating OTP
            otp = Math.floor(100000 + Math.random() * 900000);
            var transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'abhirajkale1806@gmail.com',
                  pass: 'wgrkbxjijpalwuwu'
                }
              });
              
              var mailOptions = {
                from: 'abhirajkale1806@gmail.com',
                to: email,
                subject: 'OTP for signing into blog',
                text: `Your OTP is ${otp} `
              };
              
              transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                  console.log(error);
                } else {
                  console.log('Email sent: ' + info.response);
                }
              });
              res.end(`<h1>An OTP has been sent to ${email}</h1><form action="/validate" method="post"><input type="number" name="otp" id="otp" placeholder='Enter OTP'><input type="submit" value="Submit"></form></br><a href='/'><button>Go back</button></a>`)
        }else{
            res.send("<h1>Account already exists</h1><a href='/'><button>Go back</button></a>")
        }
    })


})
app.post('/validate',function(req,res){
    if (req.body.otp == otp) {
        var query = `INSERT INTO user_info(username, email, password)VALUES(?,?,?)`;
        connection.query(query, [username,email,password],(err)=>{
               if (err) {
                console.log(err);
                res.redirect('/')
               }
               var q = `SELECT id,username,email FROM user_info WHERE (username=? OR email=?) AND password=?`;
               connection.query(q,[username,username,password], (err,rows)=>{
                   if (err) {
                       console.log(err)
                   }
                   if (rows.length==1) {
                       req.session.loggedin = true;
                       req.session.id = rows[0].id;
                       req.session.username = rows[0].username;
                       req.session.email = rows[0].email;
                       res.redirect('/user');
                   }
               })
        })

    }else
    res.send("<h1>Incorrect OTP</h1><a href='/'><button>Go back</button></a>")
})
app.post('/login', function (req, res) {  
    const username = req.body.username;
    const password = sha256.x2(toString(req.body.password));

    var q = `SELECT id,username,email FROM user_info WHERE (username=? OR email=?) AND password=?`;
    connection.query(q,[username,username,password], (err,rows)=>{
        if (err) {
            console.log(err);
        }
        if (rows.length==1) {
            req.session.loggedin = true;
            req.session.username = rows[0].username;
            req.session.email = rows[0].email;
            req.session.id = rows[0].id;
            res.redirect('/user');
        }else{
            res.send("<h1>Incorrect Credentials</h1><a href='/'><button>Go back</button></a>")
        }
    })
})

app.get('/user',(req,res)=>{
    if (req.session.loggedin) {
        res.render('home',{username:req.session.username}) 
    }else
        res.redirect('/')

})

app.get('/user/about', (req, res)=>{
    if (req.session.loggedin) {
        res.render('about')
    }else
        res.redirect('/')   
})
app.get('/user/write', function(req, res){
    if (req.session.loggedin) {
        res.render('write')
    }else
        res.redirect('/')  
})
app.get('/user/explore', function(req, res){
    if (req.session.loggedin) {
        res.render('explore')
    }else
        res.redirect('/')  
})
app.post('/submit-blog',(req, res) => {

    if (req.session.loggedin) {
        const title = req.body.title
        const content = req.body.content
        const q = `select id from user_info where username=? AND email=?`;
        connection.query(q,[req.session.username,req.session.email],(err, rows)=>{
            if (err) {
                throw err;
            }
            if (rows.length==1) {
                req.session.id = rows[0].id;
                const query = `insert into blogs(id,username, title, content) values(?,?,?,?)`         
               console.log(query)
                connection.query(query,[rows[0].id,req.session.username,title,content],(err)=>{
                    if (err) {
                        console.log(err)
                        res.send('error 500')
                    }
                    res.redirect('/user')
                })
            }
        })

    }else
        res.end(`<h1>Error. Please log in to continue.</h1> <a href='/'><button>Log in</button></a>`)
})
app.get('/get_blogs', (req, res) => {
    const query = `SELECT username,blog_id, title, content,time FROM blogs ORDER BY TIME desc`;
    connection.query(query, (err, rows)=>{
        if (err) {
            throw err
        }
        res.send(rows)
    })

})

app.get('/explore/search/:search', (req, res) => {
    const query = `SELECT id,username,blog_id, title, content, time FROM blogs WHERE username LIKE '%${req.params.search}%' ||  title LIKE '%${req.params.search}%' ||  content LIKE '%${req.params.search}%'`;
    connection.query(query, (err, rows)=>{
        if(err){
            console.log(err)
        }
        res.send(rows)
    })
})
app.get('/logout',function(req,res){
    req.session.loggedin = false;
    res.redirect('/')
})

app.listen(PORT, function(){
    console.log('Listening on PORT @ ' + PORT);
})
