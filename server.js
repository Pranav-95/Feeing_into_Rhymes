const express = require("express");
require("dotenv").config();
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const md5 = require("md5");
const _ = require("lodash");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const session = require('express-session');
const findOrCreate = require('mongoose-findorcreate');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const app = express();



//////////////////taking variable from .env file//////////////////////////
const PORT = process.env.port;
const URL = process.env.url;
const ADMIN = process.env.admin;
const ADMIN_PASS = process.env.pass;


///////////////////////mongodb connection/////////////////////////
mongoose.connect(
  URL,
  { useNewUrlParser: true, useUnifiedTopology: true},
  () => {
    console.log('Connected to MongoDB');
  }
);



////////////////////////////////////////////////////////////////

app.use(express.static("Public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
  extended: true
}));



//////////////////////////////////sessions////////////////////////////////////

app.use(session({
  secret: "this is the secret.",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




////////////////////Schema for user ////////////////////////////

const userSchema = new mongoose.Schema({
  username: {
    type:{
      type: String
    },
    unique: false
  },
  email: {
    type: String
  },
  mobNo: {
    type: Number,
    maxLength: 10,
    unique: false
  },

  birthday: {
    type: String
  },
  password: {
    type: String
  },

  provider:String,
  googleId:String,
  githubId:String,

} );
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);




////////////////////////////Poem Schema//////////////////////////


const poemSchema = {
     topic : String,
     body : String,
     image : String,
     auth : String,
     cat: String


}

const Poem= mongoose.model("POEM", poemSchema);





/////////////////////////////////////////session starting and ending //////////////////////////////////
passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});




/////////////////////////////Authenctication using Google Strategy///////////////////////////////////

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLECLIENT_ID,
  clientSecret: process.env.GOOGLECLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/logined",
  userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username:profile.displayName,email:profile.displayName,provider:"google"}, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/logined',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {

    res.render('logined');
  });





//////////////////////Authenctication manually//////////////////////////
app.get("/register", function(req, res) {
  res.render("register");
});


app.get("/login", function(req, res) {
  res.render("login");
});


app.post("/register", function(req, res) {
  const newUser = new User({
    username: req.body.userName,
    email: req.body.userEmail,
    mobNo: req.body.mobNo,
    birthday: req.body.dob,
    password: md5(req.body.password)

  });
  console.log(newUser);
  if (req.body.password === req.body.confirm_password) {
    User.findOne({
      email: req.body.user
    }, function(err, userfound) {
      if (err) {
        console.log(err);
      } else {
        if (userfound) {
          res.write("<h1>Email already exist</h1>");
        } else {
          newUser.save(function(err) {
            if (err) {
              console.log(err);
            } else {
              console.log(newUser);
              res.render("logined");
            }
          });
        }
      }
    });
  } else {
    res.write("<h1>Recheck your password");
  }

});


app.post("/login", function(req, res) {


  User.findOne({
    email: req.body.userName
  }, function(err, userfound) {
    if (err) {
      console.log(err);
    } else {
      if (userfound) {

        if (userfound.password == md5(req.body.password)) {
          res.render("logined");
            console.log("Use found");
        } else {
          res.write("<h1>Wrong password</h1>");
        }
      }else{
        res.write("<h1>user not found</h1>")
      }
    }
  });
});


app.get("/logout", (req, res) => {
  req.logout(req.user, err => {
    if(err) return next(err);
    res.redirect("/");
  });
});


//////////////////////Routes//////////////////////////

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html", (err) => {
    if (err) return err;
  });
});

app.get("/poems" , function(req,res){
  Poem.find({}, function(err, poems){
    res.render("poems", {
      para: poems
      });
  });

});




app.get("/post", function(req,res){
  res.render("post");
});

app.post("/post", function (req,res){
  const poem = new Poem ({
    topic: req.body.topic,
    body : req.body.body,
    image : req.body.image,
    auth : req.body.auth,
    cat : req.body.cat

  });

  poem.save(function(err){
    res.render("posted")
  });
});
app.get("/poems/:PoemId", function(req, res){

const requestedPoemId = req.params.PoemId;

  Poem.findOne({_id: requestedPoemId}, function(err, poem){
    res.render("rpoem", {
      topic : poem.topic,
      body: poem.body,
      image : poem.image,
      auth : poem.auth
    });
  });

});

app.get("/delete/:deleteId", (req, res) => {
    let deleteId = req.params.deleteId;
    Poem.deleteOne({_id: deleteId}, (err) => {
        if (!err) {
          Poem.find({}, function(err, poems){
            res.render("adminPage", {
              para: poems
              });
          });
        }
    })
})
app.post("/search" , function(req,res){
  const c = req.body.category;
  Poem.find({cat:c}, function(err, poems){
    res.render("cp", {
      para: poems
      });
  });

});


// app.get("/update/:updateId", (req, res) => {
//     let updateId = req.params.updateId;
//     Poem.findOne({_id: updateId}, (err, doc) => {
//         res.render("update", {topic: doc.topic, body: doc.body, id: updateId});
//     })
// })



//////////////////Admin Login ////////////////////

app.get("/adminlogin", (req, res) => {
    res.render("adminlogin");
});

app.post("/adminpost", function (req,res){
  if((req.body.adminName==ADMIN)&&(req.body.pass==ADMIN_PASS)){
    Poem.find({}, function(err, poems){
      res.render("adminPage", {
        para: poems
        });
    });
  }else{
  res.send('<script>alert("Wrong Credintials")</script>')
  }
});
app.get("/user" , function(req,res){
  User.find({}, function(err, datas){
    res.render("user", {
      info: datas
      });
  });

});
app.get("/userB" , function(req,res){
  Poem.find({}, function(err, poems){
    res.render("adminPage", {
      para: poems
      });
  });

});
app.get("/del/:deleteId", (req, res) => {
    let deleteId = req.params.deleteId;
    User.deleteOne({_id: deleteId}, (err) => {
        if (!err) {
          User.find({}, function(err, datas){
            res.render("user", {
              info: datas
              });
          });
        }
    })
})
//////////////////////server/////////////////////////////////////
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
