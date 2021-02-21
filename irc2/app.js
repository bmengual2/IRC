const express = require('express')
const  socket = require('socket.io')
const  mysql = require('mysql')
const  cookieParser = require('cookie-parser')
const  session = require('express-session');

var app = express();
var server = app.listen(82, function () {
  console.log("listening to port 82.");
}); 
var io = socket(server);

var sessionMiddleware = session({
  secret: "keyboard cat"
});

io.use(function (socket, next) {
    sessionMiddleware(socket.request, socket.request.res, next);
  });
  app.use(sessionMiddleware);
  app.use(cookieParser());

var db = mysql.createConnection({
    host : 'localhost',
    user : 'root',
    password : 'root',
    database : 'socket'
});
  
db.connect(function (error) {
    if (!!error)
    throw error;
    console.log('mysql connected to ' );
  });
  
  app.use(express.static('./'));
  
  
  io.on('connection', function (socket) {

    var req = socket.request;
    if(req.session.pseudoId != null){
        db.query("SELECT * FROM pseudo WHERE id=?", [req.session.pseudoId], function(err, rows, fields){
        socket.emit("logged_in", {pseudoName: rows[0].name});
        });
      }
      
    socket.on("login_register", function(data){
        const pseudo = data.pseudo;
        
        db.query("SELECT * FROM pseudo WHERE name=?", [pseudo], function(err, rows, fields){
        if(rows.length == 0){
            db.query("INSERT INTO pseudo(`name`) VALUES(?)", [pseudo], function(err, result){
                if(err) throw err;
                console.log(result);
                console.log("--------------")
                console.log(req.session);
                socket.nickname = pseudo
                socket.emit("logged_in", {pseudoName: pseudo});
                req.session.pseudoId = result.insertId;
                socket.id = pseudo
                console.log(req.session)
                req.session.save();
                console.log("after save")
                console.log(req.session)
              }); 
        
        }else{
        console.log("déjà utilisé !! ");
        }
        });
      });
  });



  io.on('connection', function (socket) {
    socket.on('create',function(data){
      console.log("rrrrrrrrr.F.F.F.F.F.")
      if(!io.sockets.adapter.rooms[data]){// sil n'existe pas de channel
          db.query("Insert into `channel` (`name`) VALUES (?) ",[data.channel], function(err, rows, fields){
              db.query("Insert into `pseudoChannel` (`channel`,`pseudo`) VALUES (?,?)",[data.channel,socket.nickname],function(err,rows,fields){
                  if(err) throw err;
                  socket.join(data.channel)
                  console.log("insertion channel")
                  socket.activeChan = data.channel
                  console.log(socket.rooms)
                  socket.emit("create",{channel : data.channel})
              })
          })
      }else{
          socket.emit("create",{er : "Votre channel existe déjà"})
      }
  })
  })
  
//  lister tout lew users du channel  (users)
io.on('connection', function (socket) {
    socket.on('users',function(data){
        db.query("Select distinct pseudo from pseudoChannel where channel = ?",[data.channel],function(err,rows,fields){
            let list = new Array()
            listN =  Object.values(rows).map(x => x.pseudo)
            socket.emit("users",{listUsers : listN})
        })
    })
})


//   Création Channel (create)
  io.on('connection', function (socket) {
   
})
// connection à un  channel (join)
  io.on('connection', function (socket) {
      socket.on('join',function(data){
        console.log(data.channel)
          console.log( io.sockets.adapter.rooms.get(data.channel))
          if(io.sockets.adapter.rooms.get(data.channel)){
              //réaliser un insert 
              db.query("Insert into `pseudoChannel` (`channel`,`pseudo`) VALUES (?,?)",[data.channel,socket.nickname],function(err,rows,fields){
                if(err) throw err;
                console.log("lets go....")
                socket.join(data.channel)
                socket.activeChan = data.channel
                console.log(socket.activeChan)
                socket.emit("join",{channel : data.channel})
              })
          }//on vérifie que la channel existe
      })
  })


// récupérer liste des channels
io.on('connection', function (socket) {
    socket.on('listChannels',function(data){
        if(io.sockets.adapter.rooms[data.channel]){
            //réaliser un insert 
            db.query("Select distinct name from  channel where name = ?",[data.channel],function(err,rows,fields){
              if(err) throw err;
              socket.join(data.channel)
              console.log(rows)
              socket.emit("listChannels",{liste :data.channel})
            })
        }//on vérifie que la channel existe
    })
})
io.on('connection', function (socket) {
  socket.on('messageChan',function({message}){
      //on vérifie que la channel existe
      console.log("j'y suis !! ")
      let date = new Date()
      console.log(message)
      if(socket.activeChan != null){
        db.query("Insert into `messageChan` (`channel`,`date`,`pseudo`,`message`) VALUES(?,?,?,?)",[socket.activeChan,date,socket.nickname,message],function(err,rows,fields){
          if (err) throw err;
          console.log(socket.activeChan)
          console.log(socket.nickname)
          console.log(date)
          console.log(socket.rooms)
          console.log(message)
          socket.emit("messageChan",
          {
            message: message,
            pseudo : socket.nickname,
            time: date
        }
        )
          console.log("emission socket terminé !!!")
          
        })
      }else{
        socket.to(socket.activeChan).emit("messageChan",{message:null,
          pseudo : null,
          date: null
        })
      }
      
  })
})
io.on('connection', function (socket) {
  socket.on('activer',function(data){
    console.log("activer")
    console.log(socket.rooms.has(data.channel))
      //on vérifie que le user a déjà rejoint la room 
     if(socket.rooms.has(data.channel)){
       socket.activeChan = data.channel
       socket.emit('activer',{activeChan : socket.activeChan})
     }
      
  })
})




