import amqp from "amqplib";

const Connection = {};

export function init(options) {
    Connection.target = options.mq_exchange;
    Connection.sendkey = options.mq_key;
    Connection.host = `amqp://${options.mq_host}`;
 }

export async function connect() {
    const conn = await amqp.connect(Connection.host);
    const channel = await conn.createChannel();

    Connection.channel = channel;
    
    await channel.assertExchange(
        Connection.target, 
        'topic', 
        {durable: false}
    );
}

export function signal(updates) {
    if (!(updates && (updates.length || Object.keys(updates).length))) {
        console.log("skip signal");
    }

    Connection.channel.publish(
        Connection.target,
        Connection.sendkey,
        Buffer.from(JSON.stringify(updates))
    );
}
