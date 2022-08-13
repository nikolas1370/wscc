const packetMetaSize = 50;
class wscc // WebSocketControlerClient
{
    /**
     * @param {*} url 
     */
    #queue
    #connected
    #onArray
    #pingTimer
    #pingRequestTimer
    #url
    constructor(url, port, secure)
    {
        this.socketCreate = undefined;
        this.disconnect = undefined; 
        this.reconnecting = undefined;
        this.#queue = []; // [ArrayBuffer]        
        let firstConnected = true
        this.#connected = false
        this.#onArray =[] // [{event, callback}]
        
        this.#url = (secure ? "wss://" : "ws://") + url + ":" +port;

        let timer = () =>
        {
            clearTimeout(this.#pingTimer)
            clearTimeout(this.#pingRequestTimer)
            this.#pingTimer = setTimeout(() => 
            {
                try 
                {
                    this.ws.send(new TextEncoder().encode(new Date().getTime()))     
                    this.#pingRequestTimer = setTimeout(() => 
                    {
                        this.#connected = false                    
                        this.disconnect();
                        this.ws.close();
                        this.ws.onclose = () => {}
                        conect();
                    }, 1000);
                } catch (error){}
            }, 5000)
        }

        let conect = () =>
        {
            this.ws = new WebSocket(this.#url);
            this.ws.binaryType = "arraybuffer"
            this.ws.onopen = (e) =>
            {
                timer();

                for (let i = 0; i < this.#queue.length; i++) 
                        this.ws.send(this.#queue[i]);      
                    
                this.#queue.length = 0;
                this.#connected = true
                if(!firstConnected && typeof(this.reconnecting) === "function")
                {
                    this.reconnecting();
                }
                else if(typeof(this.socketCreate) === "function")
                {
                    firstConnected = false;
                    this.socketCreate();
                }
            };
    
            this.ws.onmessage = (data) =>
            {   
                data = data.data   
                    
                if(data.constructor.name !== "ArrayBuffer")    
                    return 

                if(data.byteLength < 50) // ping pong
                    return timer();

                let event = new TextDecoder("utf-8").decode(new DataView(data,0 ,packetMetaSize))
                let eventBuf = []
                for (let i = 0; i < event.length; i++) 
                {
                    if(event[i] !== '\x00')
                        eventBuf.push(event[i])
                    else
                        break                    
                }

                event = eventBuf.join("")

                let type = new DataView(data,packetMetaSize ,1).getUint8(0)
                let message = data.slice(packetMetaSize+1) 
                let header;
                
                if(type === 0)
                    message = Number(new TextDecoder("utf-8").decode(message))
                else if(type === 1)
                    message = new TextDecoder("utf-8").decode(message)
                else if(type === 2)
                    message = JSON.parse(new TextDecoder("utf-8").decode(message))
                else if(type === 3)
                {
                    let datasize = Number.parseInt(new TextDecoder().decode(message.slice(0, 10)))
                    message = message.slice(10, 10 + datasize)
                    header = JSON.parse(new TextDecoder().decode(data.slice(packetMetaSize + 1 + datasize + 10)))
                }
                else if(type === 4)
                    message = new TextDecoder("utf-8").decode(message) === "true";
                else if(type === 10)
                    message = undefined;
                else if(type === 11)
                    message = null;
                else
                    return;

                for (let i = 0; i < this.#onArray.length; i++)
                    if(this.#onArray[i].event === event)                        
                        return this.#onArray[i].callback(message, header)
            };
            
            this.ws.onclose = (event) => 
            {
                if(this.#connected)
                {
                    clearTimeout(this.#pingTimer)
                    clearTimeout(this.#pingRequestTimer)
                    this.#connected = false                    
                    if(typeof(this.disconnect) === "function")
                        this.disconnect();
                }

                conect();
            };            
            this.ws.onerror = (error) =>{};
        }
        conect();        
    }

    get connected()
    {
        return this.#connected;
    }


    /**
     * Підписує на входяче повідомлення
     * кожин новий визов функції з тимсамим іменем відміня пердвидущу запись
     * @param {string} event 
     * @param {function} callback (data, header) // якшо повідомлення бінарне то вернеться ArrayBufer   // header передаєьбся тіки коли повідомлення бінарне
     */
    on(event, callback)
    {        
        if(typeof(event) !== "string" || typeof(callback) !== "function")
            return;

        for (let i = 0; i < this.#onArray.length; i++) 
            if(this.#onArray[i].event === event)
                return this.#onArray[i].callback  = callback

        this.#onArray.push({event: event, callback: callback})
    }

    /**
     * @param {String} event 
     * @returns 
     */
    removeOn(event)
    {
        if(typeof(event) !== "string" )
            return;

        for (let i = 0; i < this.#onArray.length; i++) 
            if(this.#onArray[i].event === event)
                return this.#onArray.splice(i, 1);
    }

    /**
     * первих 50 байт це назва вжодного повідомлення ( socet.send("назва") )
     * 51 байт тип отправки  
     *    0 Number
     *    1 String
     *    2 Object
     *    3 ArrayBuffer 
     *    4 Boolean
     *    10 Undefined
     *    11 null
     * @param {String} event тіки англійскі і цифри а інакше проблеми (можливі)
     * @param {String | boolean | number | Object | ArrayBuffer | ArrayBuffer.isView} data  функію не відправлять
     * @param {Object} header не функцію // якшо data бінарий то header відправиться
     */
    send(event, data, header) /// setFloat64  
    {
        if(typeof(event) !== "string")
            return console.error("первий параметр !String");
            
        let stringEncodeMoveBuffer = (str) =>
        {
            data = new TextEncoder().encode(str)
            let buf = new DataView(new ArrayBuffer(packetMetaSize + 1 + data.length ))
            
            for (let i = packetMetaSize + 1 , j = 0; i < buf.byteLength; i++, j++) 
                buf.setUint8(i, data[j]) 
        
            return buf
        }
        let arraybufferMoveBufer = (bufer) =>
        {            
            let te = new TextEncoder()
            let headerStr = te.encode(JSON.stringify(typeof(header) === "object" ? header : "{}"));

            let buf = new DataView(new ArrayBuffer(packetMetaSize + 1 + bufer.byteLength  + 10 + headerStr.byteLength))
            let strbl = te.encode(String(bufer.byteLength))

            for (let i = packetMetaSize + 1, j = 0; i < buf.byteLength &&  j < strbl.byteLength; i++, j++) 
                buf.setUint8(i, strbl[j])        
            
            if(bufer.constructor.name !== "DataView")
                bufer = new DataView(bufer);
                
            for (let i = packetMetaSize + 11 , j = 0; i < buf.byteLength - headerStr.byteLength; i++, j++) 
                buf.setUint8(i, bufer.getUint8(j)) 

                
            for (let i = packetMetaSize + 11 + bufer.byteLength , j = 0; i < buf.byteLength ; i++, j++) 
                buf.setUint8(i, headerStr[j]) 

            return buf;
        }        
        
        if(data === undefined)
        {
            var buf = stringEncodeMoveBuffer(String(undefined));
            buf.setUint8( packetMetaSize, 10);
        }
        else if(data === null)
        {
            var buf = stringEncodeMoveBuffer(String(null));
            buf.setUint8( packetMetaSize, 11);
        }
        else if(typeof(data) === "number")
        {   
            var buf = stringEncodeMoveBuffer(String(data));    
            buf.setUint8( packetMetaSize, 0);    
        }
        else if(typeof(data) === "string")
        {                       
            var buf = stringEncodeMoveBuffer(data);
            buf.setUint8( packetMetaSize, 1);
        }
        else if(data.constructor.name === "ArrayBuffer")
        {
            var buf =  arraybufferMoveBufer(data);
            buf.setUint8( packetMetaSize, 3);
        }        
        else if(ArrayBuffer.isView(data))
        {
            var buf = arraybufferMoveBufer(data.constructor.name === "DataView" ? data : data.buffer)
            buf.setUint8( packetMetaSize, 3);   
        }
        else if(typeof(data) === "object")
        {                        
            var buf = stringEncodeMoveBuffer(JSON.stringify(data));
            buf.setUint8( packetMetaSize, 2);
        }
        else if(typeof(data) === "boolean")
        {
            var buf = stringEncodeMoveBuffer(String(data));
            buf.setUint8( packetMetaSize, 4);
        }
        else
            return -1;

        var uint8array = new TextEncoder().encode(event)
        for (let i = 0 ; i < packetMetaSize; i++) 
            buf.setUint8(i, uint8array[i] === undefined? 0: uint8array[i] ) 
                    
        if(this.#connected)
            this.ws.send(buf);  
        else
            this.#queue.push(buf)        
    }
}

export default wscc;
















