# wscc WebSocketControlerClient
npm install wscc <br>
для сервера <a href="https://github.com/nikolas1370/wscs">тут</a>
```
import wscc from "wscc"

const ws = new wscc("localhost", "3010", true); // true === secure
ws.socketCreate = () =>
{
    console.log("socketCreate");
    ws.send("incomingEvent", undefined)
    ws.send("incomingEvent", null)
    ws.send("incomingEvent", 12)
    ws.send("incomingEvent", "12")
    ws.send("incomingEvent", {})
    ws.send("incomingEvent",  ArrayBuffer | DataView , {descriphen  : "клієнт получе цей обєк разом із Buffer", descriphen2 : "не обов'язково"})
};
ws.disconnect = () =>
{
    console.log("disconnect");
}; 
ws.reconnecting = () =>
{
    console.log("reconnecting");
};

// підписуєшся на вхідне повідомленя
ws.on("event", (data, header) =>
{
    console.log(data, header)
    ws.removeOn("event") // тепер ця подія небуде працювать
});

setInterval(() => 
{
    console.log(ws.connected)// тіки для читаня
}, 5000);
