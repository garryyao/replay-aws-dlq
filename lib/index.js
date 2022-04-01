const { Consumer } = require('sqs-consumer');
const Producer = require('sqs-producer');
const util = require('util');

const redrive = ({ from: sourceQueueUrl, to: destQueueUrl, options = {} }) => {
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
      queueUrl: destQueueUrl
    });
    const send = util.promisify(target.send.bind(target));

    const reportCompletion = () => {
      source.stop();
      console.log(`replayed ${count} message(s) on: ${destQueueUrl}`);
      resolve();
    };

    const handleMessage = async message => {
      const messageAttributes = Object.entries(
        message.MessageAttributes || {}
      ).reduce((sendMessageAttrs, [key, value]) => {
        sendMessageAttrs[key] = {
          StringValue: value.StringValue,
          DataType: value.DataType
        };
        return sendMessageAttrs;
      }, {});

      let payload = {
        id: message.MessageId,
        body: message.Body,
        messageAttributes
      };

      // For FIFO queue we need to make sure this message is unique and is in correct order
      if (isFIFO) {
        payload = {
          ...payload,
          groupId: 're-drive',
          deduplicationId: `${message.MessageId}_${Date.now()}`
        };
      }
      await send(payload);
      count++;
    };

    const source = Consumer.create({
      queueUrl: sourceQueueUrl,
      sqs,
      handleMessage,
      messageAttributeNames: ['All']
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
