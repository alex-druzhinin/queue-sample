import { createClient, RedisClient } from 'redis';
import { promisify } from 'util';
import { Event, Message } from '../types/event';
import { RabbitWorker } from '../amqp/rabbit-worker';
import { sleep } from '../helpers/sleep';

export class ReadEvent extends RabbitWorker<Event> {
    private redis!: RedisClient;
    private getAsync!: (key: string) => Promise<string | null>;
    private delAsync!: (key: string) => Promise<number>;
    private setAsync!: (key: string, val: string) => Promise<unknown>;
    private existsAsync!: (key: string) => Promise<number>;

    constructor() {
        super({
            consumeQueue: 'process_q',
            exchange: 'processing',
            holdKey: 'eventHold',
            maxRetry: process.env.MAX_RETRY ? parseInt(process.env.MAX_RETRY) : 5,
        });
    }

    public async init() {
        this.redis = createClient({
            host: process.env.REDIS_HOST || 'localhost',
        });

        this.setAsync = promisify(this.redis.set).bind(this.redis);
        this.getAsync = promisify(this.redis.get).bind(this.redis);
        this.delAsync = promisify(this.redis.del).bind(this.redis);
        this.existsAsync = promisify(this.redis.exists).bind(this.redis);
    }

    // disconnect and clear redis
    public async stop() {
        await this.disconnect();

        const flushAll = promisify(this.redis.flushall).bind(this.redis);
        console.log('Flush all', await flushAll());

        await this.redis.quit();
    }

    protected async handler(message: Message<Event>) {
        try {
            const event = message.event;

            // initial message, always process it
            if (event.id === 0) {
                await this.setAsync(this.getDateKey(event.user), Date.now().toString());

                // clear message pos for the user
                await this.delAsync(this.getEventPositionKey(event.user));
                return this.processWithTail(event);
            }

            // check order of the received event and process if this is next one
            const exists = await this.existsAsync(this.getEventPositionKey(event.user));
            if (exists) {
                const pos = Number(await this.getAsync(this.getEventPositionKey(event.user)));
                if (pos + 1 === event.id) {
                    return this.processWithTail(event);
                }
            }

            // event not in order - store it for processing later
            await this.setAsync(this.getEventKey(event.user, event.id), JSON.stringify(event));
        } catch (error) {
            console.error(error);
            await this.hold(message, error.toString());
        }
    }

    private getEventKey(user: number, order: number) {
        return `user:${ user }:${ order }`;
    }

    private getDateKey(user: number) {
        return `user.start:${ user }`;
    }

    private getEventPositionKey(user: number) {
        return `user.pos:${ user }`;
    }

    private async processEvent(event: Event) {
        // long event logic
        await sleep(1000);

        const start = await this.getAsync(this.getDateKey(event.user));
        let timeDiff = 0;
        if (start) {
            timeDiff = Date.now() - Number(start);
        }

        console.log(`Processed message from ${ event.user } - ${ event.id }, delay from first message received: ${ timeDiff } ms`);

        // store last processed event position for the user
        await this.setAsync(this.getEventPositionKey(event.user), event.id.toString());
    }

    // Try to get next event. Process it if it present.
    // If not present - ok, wait for next one from AMQP queue
    private async processTail(user: number, id: number): Promise<void> {
        const eventString = await this.getAsync(this.getEventKey(user, id));
        if (eventString) {
            const event = JSON.parse(eventString);
            return this.processWithTail(event);
        }
    }

    private async processWithTail(event: Event): Promise<void> {
        await this.processEvent(event);

        // try to delete stored event at this position
        await this.delAsync(this.getEventKey(event.user, event.id));

        setImmediate(() => {
            // and try to process next event in redis
            this.processTail(event.user, event.id + 1);
        })

    }
}
