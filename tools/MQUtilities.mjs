import amqp from "amqplib";

import { setTimeout } from "node:timers/promises";

const Connection = {};

export function init(options) {
    Connection.target = options.mq_exchange;
    Connection.sendkey = options.mq_key;
    Connection.host = `amqp://${options.mq_host}`;

    console.log(`MQ target: ${JSON.stringify(Connection)}`);
 }

export async function connect() {
    if (Connection.conn) {
        await Connection.conn.close();
    }

    Connection.conn = await amqp.connect(Connection.host);
    const channel = await Connection.conn.createChannel();

    Connection.channel = channel;
    
    await channel.assertExchange(
        Connection.target, 
        'topic', 
        {durable: false} // this option is set once per server, might be configured at the server 
    );
}

export async function signal(updates) {
    if (!(updates && (updates.length || Object.keys(updates).length))) {
        console.log("skip signal");
    }

    console.log(`signal ${Connection.sendkey} with ${JSON.stringify(updates)}`);
    try {
        Connection.channel.publish(
            Connection.target,
            Connection.sendkey,
            Buffer.from(JSON.stringify(updates))
        );
    }
    catch (err) {
        console.log(`MQ ERROR ${err.message}`);
        // there are 2 reasons for an error:
        // 1. the file is invalid
        // 2. the MQ connection is broken

        console.log(`retry in 15 seconds`);

        await setTimeout(15000, "retry");
        console.log(`retry now`);
        await MQ.connect();

        try {
            Connection.channel.publish(
                Connection.target,
                Connection.sendkey,
                Buffer.from(JSON.stringify(updates))
            );
        }
        catch (err) {
            console.log(`UNRECOVERABLE MQ ERROR for ${err.message}`);
        }
    }
}
