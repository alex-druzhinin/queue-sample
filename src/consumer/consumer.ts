import { Pipeline } from '../amqp/pipeline';
import { ReadEvent } from './read-event';
import { sleep } from '../helpers/sleep';

(async () => {
    try {
        const pipeline = new Pipeline();
        await pipeline.create();

        const readEvent = new ReadEvent();
        await readEvent.init();
        await readEvent.subscribe();

        // Graceful shutdown
        const terminate = async () => {
            await readEvent.stop();
            await sleep(3000);
            process.exit(0);
        };

        process.once('SIGTERM', terminate);
        process.once('SIGINT', terminate);
    } catch (error) {
        console.error(error);
        await sleep(5000);
        process.exit(1);
    }
})();
