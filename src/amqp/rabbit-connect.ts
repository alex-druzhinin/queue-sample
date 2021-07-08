import { Channel, connect, Connection } from 'amqplib';

export class RabbitConnect {
    private uri: string;
    private connection!: Connection;

    constructor() {
        // Get the URI from environment
        this.uri = process.env.RABBIT_URI || 'amqp://localhost';
    }

    private _channel!: Channel;

    protected get channel() {
        return this._channel;
    }

    protected async connect() {
        this.connection = await connect(this.uri);
        this._channel = await this.connection.createChannel();
    }

    protected async disconnect() {
        await this._channel.close();
        return this.connection.close();
    }
}
