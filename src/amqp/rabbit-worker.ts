import { ConsumeMessage } from 'amqplib';
import { RabbitConnect } from './rabbit-connect';
import { Event, FailEvent, Message } from '../types/event';
import { sleep } from '../helpers/sleep';

export interface WorkerParams {
    maxRetry?: number;
    consumeQueue: string;
    exchange: string;
    holdKey?: string;
}

export abstract class RabbitWorker<M extends Event> extends RabbitConnect {
    protected exchange: string;
    private maxRetry: number;
    private consumeQueue: string;
    private holdKey: string | undefined;

    constructor({ consumeQueue, holdKey, exchange, maxRetry }: WorkerParams) {
        super();
        this.maxRetry = maxRetry || 0;
        this.consumeQueue = consumeQueue;
        this.holdKey = holdKey;
        this.exchange = exchange;
    }

    public async subscribe() {
        await this.connect();
        await this.channel.prefetch(100);

        await this.channel.consume(this.consumeQueue, this.checkMessage.bind(this), { noAck: false });
    }

    // Stores failed message to distinct storage
    protected async sendToFailed(currentMessage: Message<M>, error: string) {
        const message: FailEvent = {
            event: currentMessage.event,
            errors: [...currentMessage.errors, error],
            retry: currentMessage.retry + 1,
            exchange: this.exchange,
            routingKey: this.consumeQueue,
        };

        console.log('Should be stored somehow, for now just here:', message);
    }

    // Requeue with delay using hold queue
    protected async hold(currentMessage: Message<M>, error: string) {
        if (!this.holdKey) {
            return;
        }
        const eventMessage = {
            event: currentMessage.event,
            errors: [...currentMessage.errors, error],
            retry: currentMessage.retry + 1,
        };
        const eventData = Buffer.from(JSON.stringify(eventMessage));
        return this.channel.publish(this.exchange, this.holdKey, eventData);
    }

    protected async ack(currentConsumeMessage: ConsumeMessage) {
        return this.channel.ack(currentConsumeMessage);
    }

    protected async nack(currentConsumeMessage: ConsumeMessage) {
        return this.channel.nack(currentConsumeMessage);
    }

    protected abstract handler(currentMessage: Message<M>): void;

    // Check the message and handle it
    private async checkMessage(message: ConsumeMessage | null) {
        if (!message) {
            return;
        }

        try {
            const eventMessage: Message<M> = JSON.parse(message.content.toString());
            if (eventMessage.retry >= this.maxRetry) {
                await this.sendToFailed(eventMessage, 'Retry limit exceeded');
            } else {
                await this.handler(eventMessage);
            }

            await this.ack(message);
        } catch (e) {
            console.error('Error on checkMessage:', e);
            // try again this message
            await sleep(2000);
            await this.nack(message);
        }
    }
}
