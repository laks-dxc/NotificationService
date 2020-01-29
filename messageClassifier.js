var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });
const Q = require('q');
var helpers = require('./helpers.js');

var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var aws_local_config = {
    region: 'local',
    endpoint: 'http://localhost:8000'
};

const MAIN_MESSAGE_QUEUE_URL = "https://sqs.us-east-2.amazonaws.com/209452574116/mainMessageQueue";
const SMS_MESSAGE_QUEUE_URL = "https://sqs.us-east-2.amazonaws.com/209452574116/smsQueue";
const EMAIL_MESSAGE_QUEUE_URL = "https://sqs.us-east-2.amazonaws.com/209452574116/emailQueue";


var readParams = {
    QueueUrl: MAIN_MESSAGE_QUEUE_URL,
    MaxNumberOfMessages: 10,
    //ReceiveRequestAttemptId: 'STRING_VALUE',
    VisibilityTimeout: 20,
    WaitTimeSeconds: 20
};

function readMessage() {
    sqs.receiveMessage(readParams, function (err, response) {
        if (err) console.log(err, err.stack); // an error occurred
        else {
            if (response.Messages) {
                var dynamoDBObjects = [];

                //console.log("=================================================")
                console.log("Received ", response.Messages.length + " messages");
                response.Messages.forEach((message, index) => {
                    console.log('index', index);
                    const MessageId = message.MessageId;

                    const Body = message.Body;
                    var dynamoDBObject = { OriginalMessageId: MessageId, Body: Body };
                    dynamoDBObjects[index] = dynamoDBObject;

                    Q()
                        .then(classifyMessage(Body, index))
                        .then(insertIntoDynamoDB("MESSAGES", dynamoDBObjects[index]))
                        .then(deleteMessageFromMainQueue(message.ReceiptHandle))
                });
            }
            else {
                console.log("");
                console.log("No messages found.. retrying.. ");
            }
        }
    });
}

function classifyMessage(_messageBody, messageIndex) {
    return new Promise((resolve, reject) => {

        var messageBody = JSON.parse(_messageBody);

        const { missionCode, countryCode, vacCode, scanCode } = messageBody.BulkSMSRequests[0].SMSRequest;

        var smsRequired = checkSMSRequired(messageBody);
        var emailRequired = checkEmailRequired(messageBody);
        var smsConfig = null, emailConfig = null;

        smsConfig = smsRequired ? getSMSConfig(missionCode, countryCode, vacCode, scanCode) : {};
        emailConfig = emailRequired ? getEmailConfig(missionCode, countryCode, vacCode, scanCode) : {};

        dynamoDBObjects[messageIndex].smsConfig = smsConfig;
        dynamoDBObjects[messageIndex].smsRequired = smsRequired;
        dynamoDBObjects[messageIndex].emailConfig = emailConfig;
        dynamoDBObjects[messageIndex].emailRequired = emailRequired;

        console.log('');
        console.log('// ** Classification Start ** //')
        console.log('');
        console.log("Mission / Country / VAC --> ", missionCode, countryCode, vacCode);
        console.log("Scan Code --> ", scanCode);
        console.log("SMS Required --> ", smsRequired, ", Email Required --> ", emailRequired);
        console.log("SMS Config --> ", smsConfig, ", Email Config --> ", emailConfig);
        console.log('');
        console.log('// ** Classification End**  //')
        console.log('');

        Promise.all([
            new Promise((resolve, reject) => {
                if (smsConfig) {
                    sendMessage(SMS_MESSAGE_QUEUE_URL, messageBody)
                        .then(() => {
                            console.log('Message saved to SMS Queue')
                            dynamoDBObjects[messageIndex].smsQueuedTime = new Date();
                            resolve();
                        })
                        .catch((err) => {
                            console.log('Error saving in SMS Queue')

                            dynamoDBObjects[messageIndex].smsQueueInsertError = err;
                            resolve();
                        })
                }
                else
                    resolve();
            }),

            new Promise((resolve, reject) => {
                if (emailConfig) {
                    sendMessage(EMAIL_MESSAGE_QUEUE_URL, messageBody)
                        .then(() => {
                            console.log('Message saved to Email Queue')

                            dynamoDBObjects[messageIndex].emailQueuedTime = new Date();
                            resolve();
                        })
                        .catch((err) => {
                            console.log('Error saving Message in Email Queue')
                            console.log('err,', err);
                            dynamoDBObjects[messageIndex].emailQueueInsertError = err;
                            resolve();
                        })
                }
                else
                    resolve();
            }),

            new Promise((resolve, reject) => {
                if (smsRequired && !smsConfig) {
                    sendToNoConfigDB(messageBody, 'SMS')
                    resolve();
                }
                else
                    resolve();
            }),

            new Promise((resolve, reject) => {
                if (emailRequired && !emailConfig) {
                    sendToNoConfigDB(messageBody, 'Email');
                    resolve();
                }
                else
                    resolve();
            })
        ])
            .then(() => {
                resolve();
            })

    })
}

function sendToNoConfigDB(a, b) {
    return new Promise((resolve, reject) => { resolve() });
}

function getSMSConfig(missionCode, countryCode, vacCode, scanCode) {
    return true;
}

function getEmailConfig(missionCode, countryCode, vacCode, scanCode) {
    return true;
}

function checkSMSRequired(messageBody) {
    var phoneNo = messageBody.BulkSMSRequests[0].SMSRequest.smsConfig.phoneNo;
    return phoneNo && phoneNo != "";
}

function checkEmailRequired(messageBody) {
    var emailId = messageBody.BulkSMSRequests[0].SMSRequest.emailConfig.emailId;
    return emailId && emailId != "";

}

function deleteMessageFromMainQueue(receiptHandle) {
    return new Promise((resolve, reject) => {
        var deleteParams = {
            QueueUrl: MAIN_MESSAGE_QUEUE_URL,
            ReceiptHandle: receiptHandle
        }

        sqs.deleteMessage(deleteParams, (err, resposne) => {
            if (!err) {
                console.log('Message deleted from Main Queue');
                resolve();
            }
            else {
                reject(err);
            }
        })
    })
}

//function saveMessageInDynamoDB(message) {


//    return new Promise((resolve, reject) => {
//        AWS.config.update(aws_local_config);

//        const docClient = new AWS.DynamoDB.DocumentClient();

//        items = helpers.jsonConcat({ Id: (Math.random() * 1000).toString() }, message);
//        var insertParams = {
//            TableName: "YOUR_TABLE_NAME",
//            Item: items
//        };

//        docClient.put(insertParams, (err, data) => {
//            if (!err) {
//                console.log('Added message contents to dynamo db')
//                resolve();
//            }
//            else {
//                console.log("error adding to dynamodb ", err);
//                reject();
//            }
//        });
//    })
//}

function insertIntoDynamoDB(tableName, data) {

    AWS.config.update(aws_local_config);
    const docClient = new AWS.DynamoDB.DocumentClient();

    var Items = helpers.jsonConcat({ Id: (Math.random() * 1000).toString() }, data);

    return new Promise((resolve, reject) => {
        const params = {
            TableName: tableName,
            Item: Items
        };

        docClient.put(params, (err, data) => {
            if (!err)
                resolve();
            else
                reject(err);
        });
    })
}

function sendMessage(queueURL, event) {

    var params = {
        DelaySeconds: 0,
        MessageAttributes: {},
        MessageBody: JSON.stringify(event),
        QueueUrl: queueURL
    };
    return new Promise((resolve, reject) => sqs.sendMessage(params, (err, data) => data ? resolve(data) : reject(err)));
};


readMessage();
//setInterval(readMessage, 5000);
