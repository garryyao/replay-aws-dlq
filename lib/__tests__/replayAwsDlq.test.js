const AWSMock = require('aws-sdk-mock');
const AWS = require('aws-sdk');
const { redrive } = require('../index.js');
const mockMessages = [
  {
    MessageId: '226052d0-5f52-4df8-91d2-53d58afdfc2c',
    Body:
      '{"id":"5d31a25ae887bb000828e6f3","entityName":"photo","source":"gqes"}',
    ReceiptHandle: 'receipt-handle-1'
  },
  {
    MessageId: '28cce3b3-003c-4920-9e11-e7904ee3f2c7',
    Body:
      '{"id":"5cdc0ae662fe4009f083f690","entityName":"photo","source":"gqin"}',
    ReceiptHandle: 'receipt-handle-2'
  }
];
describe('redrive messages', () => {
  let mockSqs;
  let deleteSpy = jest.fn();
  let receiveSpy = jest.fn();
  let sentSpy = jest.fn();

  beforeAll(() => {
    // Mock msg received one by one
    AWSMock.mock('SQS', 'receiveMessage', (params, callback) => {
      receiveSpy.apply(this, [params, callback]);
      const msg = mockMessages.shift();
      callback(null, {
        Messages: msg ? [msg] : []
      });
    });

    AWSMock.mock('SQS', 'deleteMessage', (params, callback) => {
      deleteSpy.apply(this, [params, callback]);
      callback(null);
    });

    // Mock msg sent one by one
    AWSMock.mock('SQS', 'sendMessageBatch', (params, callback) => {
      sentSpy.apply(this, [params, callback]);
      callback(null, {
        Successful: [
          {
            Id: 'test_msg_001',
            MessageId: '0a5231c7-8bff-4955-be2e-8dc7c50a25fa',
            MD5OfMessageBody: '0e024d309850c78cba5eabbeff7cae71'
          },
          {
            Id: 'test_msg_002',
            MessageId: '15ee1ed3-87e7-40c1-bdaa-2e49968ea7e9',
            MD5OfMessageBody: '7fb8146a82f95e0af155278f406862c2'
          }
        ],
        Failed: []
      });
    });

    mockSqs = new AWS.SQS({
      region: 'eu-central-1'
    });
  });

  afterAll(() => {
    AWSMock.restore('SQS');
  });

  it('move messages from one queue to another', async () => {
    await redrive({
      from:
        'https://sqs.eu-central-1.amazonaws.com/123/my-queue-deadletter.fifo',
      to: 'https://sqs.eu-central-1.amazonaws.com/123/my-queue.fifo',
      options: {
        // Use mocked SQS from above
        sqs: mockSqs
      }
    });
    expect(receiveSpy).toHaveBeenCalledTimes(3);
    expect(deleteSpy).toHaveBeenCalledTimes(2);
    expect(sentSpy).toHaveBeenCalledTimes(2);

    expect(deleteSpy).toHaveBeenNthCalledWith(
      1,
      {
        QueueUrl:
          'https://sqs.eu-central-1.amazonaws.com/123/my-queue-deadletter.fifo',
        ReceiptHandle: 'receipt-handle-1'
      },
      expect.any(Function)
    );
    expect(deleteSpy).toHaveBeenNthCalledWith(
      2,
      {
        QueueUrl:
          'https://sqs.eu-central-1.amazonaws.com/123/my-queue-deadletter.fifo',
        ReceiptHandle: 'receipt-handle-2'
      },
      expect.any(Function)
    );
    expect(sentSpy).toHaveBeenNthCalledWith(
      1,
      {
        QueueUrl: 'https://sqs.eu-central-1.amazonaws.com/123/my-queue.fifo',
        Entries: [
          {
            MessageBody:
              '{"id":"5d31a25ae887bb000828e6f3","entityName":"photo","source":"gqes"}',
            Id: '226052d0-5f52-4df8-91d2-53d58afdfc2c',
            MessageGroupId: 're-drive',
            MessageDeduplicationId: expect.any(String)
          }
        ]
      },
      expect.any(Function)
    );
    expect(sentSpy).toHaveBeenNthCalledWith(
      2,
      {
        QueueUrl: 'https://sqs.eu-central-1.amazonaws.com/123/my-queue.fifo',
        Entries: [
          {
            MessageBody:
              '{"id":"5cdc0ae662fe4009f083f690","entityName":"photo","source":"gqin"}',
            Id: '28cce3b3-003c-4920-9e11-e7904ee3f2c7',
            MessageGroupId: 're-drive',
            MessageDeduplicationId: expect.any(String)
          }
        ]
      },
      expect.any(Function)
    );
  });
});
