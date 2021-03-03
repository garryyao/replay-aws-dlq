const { Consumer } = require('sqs-consumer');
const Producer = require('sqs-producer');
const util = require('util');

const redrive = ({
  from: sourceQueueUrl,
  to: destQueueUrl,
  batchSize,
  options = {}
}) => {
  const { sqs } = options;
  return new Promise((resolve, reject) => {
    const handleError = err => {
      source.stop();
      reject(err);
    };

    const reportProcessed = message => {
      console.log('moved message: %s', message.MessageId);
    };

    let count = 0;
    const isFIFO = /\.fifo$/.test(destQueueUrl);
    const target = Producer.create({
      sqs,
      queueUrl: destQueueUrl,
      batchSize
    });
    const send = util.promisify(target.send.bind(target));

    const sourceProducer = Producer.create({
      sqs,
      queueUrl: sourceQueueUrl,
      batchSize
    });
    const queueSize = util.promisify(
      sourceProducer.queueSize.bind(sourceProducer)
    );

    const reportCompletion = () => {
      source.stop();
      console.log(`replayed ${count} message(s) on: ${destQueueUrl}`);
      resolve();
    };

    const handleMessage = message => {
      let payload = {
        id: message.MessageId,
        body: message.Body
      };

      // For FIFO queue we need to make sure this message is unique and is in correct order
      if (isFIFO) {
        payload = {
          ...payload,
          groupId: 're-drive',
          deduplicationId: `${message.MessageId}_${Date.now()}`
        };
      }
      count++;

      return payload;
    };

    const handleMessageBatch = async messages => {
      await send(messages.map(handleMessage));

      console.log(`processed ${count / batchSize} batches`);

      if (count % 100 === 0) {
        const itemsInQueue = await queueSize();
        console.log(`\n\n\n${itemsInQueue} messages left in queue\n\n\n`);
      }
    };

    const source = Consumer.create({
      queueUrl: sourceQueueUrl,
      sqs,
      batchSize,
      handleMessageBatch
    });

    source.on('error', handleError);
    source.on('processing_error', handleError);
    source.on('message_processed', reportProcessed);
    source.on('empty', reportCompletion);

    source.start();
  });
};

module.exports = {
  redrive
};
