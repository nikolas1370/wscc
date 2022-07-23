# wscc WebSocketControlerClient
npm install wscc <br>
для сервера <a href="https://github.com/nikolas1370/wscs">тут</a>
```
import wscc from "wscc"

// "ws://localhost:3010" без ssl 
this.ws = new wscc("wss://localhost:3010");
this.ws.socketCreate = () =>
{
    console.log("socketCreate");
    this.ws.send("incomingEvent", undefined)
    this.ws.send("incomingEvent", null)
    this.ws.send("incomingEvent", 12)
    this.ws.send("incomingEvent", "12")
    this.ws.send("incomingEvent", {})
    this.ws.send("incomingEvent",  ArrayBuffer | DataView , {descriphen  : "клієнт получе цей обєк разом із Buffer", descriphen2 : "не обов'язково"})
};
this.ws.disconnect = () =>
{
    console.log("disconnect");
}; 
this.ws.reconnecting = () =>
{
    console.log("reconnecting");
};

// підписуєшся на вхідне повідомленя
this.ws.on("event", (data, header) =>
{
    console.log(data, header)
    this.ws.removeOn("event") // тепер ця подія небуде працювать
});

setInterval(() => 
{
    console.log(this.ws.connected)// тіки для читаня
}, 5000);
