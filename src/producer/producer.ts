import { Pipeline } from '../amqp/pipeline';
import { SendEvent } from './send-event';
import { sleep } from '../helpers/sleep';

(async () => {
    try {
        const pipeline = new Pipeline();
        const sendEvent = new SendEvent();
        await pipeline.create();

        await sendEvent.run();
    } catch (error) {
        console.error(error);
        await sleep(5000);
        process.exit(1);
    }
})();
