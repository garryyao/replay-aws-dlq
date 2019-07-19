# replay-aws-dlq [![NPM version][npm-image]][npm-url]
> Re-drive AWS (dead letter) queue messages to target queue

## Installation

```sh
$ npm install --save replay-aws-dlq
```

## Usage
The following command will move all messages in `[source]` queue to `[dest]` queue where source queue is usually a dead-letter queue, and the destination queue is it's pairing queue. 

```bash
replay-aws-dlq [source_queue_url] [dest_queue_url]
```

This module use AWS sdk beneath so you shall be able to use env variables to work across different accounts, e.g. the example below use AWS profile.

```bash
AWS_PROFILE=staging replay-aws-dlq  https://sqs.eu-central-1.amazonaws.com/123/my-queue-deadletter.fifo https://sqs.eu-central-1.amazonaws.com/123/my-queue.fifo
```

## Special Note for FIFO queue
Please be aware if destination queue you're driving messages to, is FIFO queue that has enabled [deduplication](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues.html#FIFO-queues-exactly-once-processing), and messages in DLQ were original come from it, you'll need to cool down for at least **5 mins internal** before you can start driving messages back, otherwise you messages will end up not showing in the dest queue.   

## License

MIT © [Garry Yao]()


[npm-image]: https://badge.fury.io/js/replay-aws-dlq.svg
[npm-url]: https://npmjs.org/package/replay-aws-dlq
