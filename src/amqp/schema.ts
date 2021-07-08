
export const queues = [
    {
        name: 'process_q',
        options: {
            durable: true,
        },
    },
    // Hold queue for messages waiting for retry
    {
        name: 'process_hold',
        options: {
            durable: true,
            deadLetterExchange: 'processing',
            deadLetterRoutingKey: 'event',
            messageTtl: 1000,
        },
    },
];

export const exchanges = [
    {
        name: 'processing',
        type: 'topic',
    },
];

export const bindings = [
    {
        type: 'queue',
        destination: 'process_q',
        source: 'processing',
        routingKey: '#.event.#',
    },
    {
        type: 'queue',
        destination: 'process_hold',
        source: 'processing',
        routingKey: 'eventHold',
    },
];
