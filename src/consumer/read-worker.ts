import { parentPort } from 'worker_threads'
import { Event } from '../types/event';
import { sleep } from '../helpers/sleep';

const parent = parentPort!;

const postMessage = (msg: Event) => parent.postMessage(msg)

parent.on('message', async (event: Event) => {
    console.log(`Got message: ${ event.user } - ${ event.id }`);
    await sleep(1000);

    postMessage(event)
})
