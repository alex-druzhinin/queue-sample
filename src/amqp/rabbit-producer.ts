import { RabbitConnect } from './rabbit-connect';
import { Event } from '../types/event';

export interface ProducerParams {
    routingKey: string; // Имя активной очереди
    exchange: string; // Имя обменника из которого пришло сообщение
}

export abstract class RabbitProducer<M extends Event> extends RabbitConnect {
    protected exchange: string;
    private readonly routingKey: string;

    constructor({ routingKey, exchange }: ProducerParams) {
        super();
        this.routingKey = routingKey;
        this.exchange = exchange;
    }

    // Метод отправки сообщения в отложенную очередь
    protected async publish(event: Event) {
        if (!this.routingKey) {
            return;
        }

        const eventMessage = {
            event: event,
            errors: [],
            retry: 0,
        };
        const eventData = Buffer.from(JSON.stringify(eventMessage));
        return this.channel.publish(this.exchange, this.routingKey, eventData);
    }

}
