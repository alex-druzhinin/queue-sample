import { randomInt, randomUUID } from 'crypto';
import { Event } from '../types/event';
import { RabbitProducer } from '../amqp/rabbit-producer';

export class SendEvent extends RabbitProducer<Event> {
    constructor() {
        super({
            routingKey: 'event',
            exchange: 'processing',
        });
    }

    public async run(): Promise<boolean> {
        try {
            await this.connect();

            let count = 0;
            const posByUser: Map<number, number> = new Map<number, number>();

            const eventCount: number = process.env.EVENT_COUNT ? parseInt(process.env.EVENT_COUNT) : 10000;
            const userCount: number = process.env.USER_COUNT ? parseInt(process.env.USER_COUNT) : 1000;
            const batchSize: number = process.env.BATCH_SIZE ? parseInt(process.env.BATCH_SIZE) : 11;

            while (count < eventCount) {
                const user = randomInt(0, userCount);
                const batch = randomInt(1, batchSize);

                let pos = 0;
                if (posByUser.has(user)) {
                    pos = posByUser.get(user)!;
                }

                for (let i = 0; i < batch; i++) {
                    await this.publish({
                        id: pos++,
                        user: user,
                        payload: randomUUID(),
                    })
                }

                posByUser.set(user, pos);
                count += batch;
            }

            await this.disconnect();
            return true;
        } catch (error) {
            console.error(error);
            return false;
        }
    }
}
