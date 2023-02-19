import amqp from "amqplib";

const Connection = {};

export async function init(options) {
    Connection.target = options.mq_exchange;
    const conn = await amqp.connect(`amqp://${options.mq_host}`);
    const channel = await conn.createChannel();

    Connection.channel = channel;
    Connection.sendkey = options.sendkey;
    
    await channel.assertExchange(
        Connection.target, 
        'topic', 
        {durable: false}
    );
}

export function signal(updates) {
    if (!(updates && updates.length)) {
        console.log("skip signal");
    }

    Connection.channel.publish(
        Connection.target,
        Connection.sendkey,
        Buffer.from(JSON.stringify(updates))
    );
}
