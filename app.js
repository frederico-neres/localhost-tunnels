var express = require('express'),
    app = express(),
    http = require('http'),
    socketIO = require('socket.io'),
    server, io;


var clientsList = new Map()

function asyncEmit(socketClient, eventName, data) {
    return new Promise(function (resolve, reject) {
        socketClient.emit(eventName, data,
        (result)=>{
            resolve(result);
        })

        setTimeout(reject, 1000);
    });
}


function getClientInfoByReferer(req) {
    let host = req.headers["host"]
    let referer = req.headers["referer"]

    let url = referer.split(host)[1] + req.url
    return getClientInfoByUrl({
        url: url
    })
}

function getClientInfoByUrl(req) {

    let fractionalUrl = req.url.split("/")
    let clientId = fractionalUrl[1]
    fractionalUrl.shift()

    let client = clientsList.get(clientId)
    let serviceName = fractionalUrl.shift()

    return {
        url: fractionalUrl.join("/"),
        client: client,
        serviceName: serviceName
    }
}

app.use(async function (req, res, next) {

    let clientInfo = req.headers["referer"] ? getClientInfoByReferer(req) : getClientInfoByUrl(req)

    if(clientInfo.client) {

        let jsonResponse = await asyncEmit(clientInfo.client, "exec-rest-client", 
        {   
            service_name: clientInfo.serviceName, 
            url: clientInfo.url, 
            method: req.method,
            body: req.body,
            headers: req.headers
        })


        const response = JSON.parse(jsonResponse)
        res.setHeader("Content-Type", response["Content-Type"])
        res.status(200).send(response["body"])
        return
    }

    res.status(404).send("Sorry can't find that!")
})

server = http.Server(app);
server.listen(5000, () => console.log('Running…'));

io = socketIO(server);

io.on('connection', function (socket) {

  socket.emit('hand-shake', {conected: true, id: socket.id});

  socket.on('client-information', function (message) {
    if(message["received"]) {
        clientsList.set(message["id"], socket)
    }
  });

  
  socket.on('disconnect', function () {
    clientsList.delete(socket.id)
  });

});

