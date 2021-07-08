import { RabbitConnect } from './rabbit-connect';
import { bindings, exchanges, queues } from './schema';

export class Pipeline extends RabbitConnect {

    public async create() {
        try {
            await this.connect();

            // Create queues
            const createQueues = queues.map(queue =>
                this.channel.assertQueue(queue.name, queue.options),
            ) as PromiseLike<any>[];

            // Create exchanges
            const createExchanges = exchanges.map(exchange =>
                this.channel.assertExchange(exchange.name, exchange.type),
            ) as PromiseLike<any>[];

            await Promise.all([...createQueues, ...createExchanges]);

            // Create bindings when queues and exchanges are created
            const createBindings = bindings.map(binding => {
                if (binding.type === 'queue') {
                    return this.channel.bindQueue(binding.destination, binding.source, binding.routingKey);
                }
                return this.channel.bindExchange(binding.destination, binding.source, binding.routingKey);
            });

            await Promise.all(createBindings);
            return this.disconnect();
        } catch (error) {
            console.error(error);
            throw new Error(error);
        }
    }
}
