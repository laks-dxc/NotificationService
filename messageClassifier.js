var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });
const Q = require('q');
var helpers = require('./helpers.js');

var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var aws_local_config = {
    region: 'local',
    endpoint: 'http://localhost:8000'
};

var dynamoDBObjects = [];

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
                dynamoDBObjects = [];

                //console.log("=================================================")
                console.log("Received ", response.Messages.length + " messages");
                response.Messages.forEach((message, index) => {
                    const MessageId = message.MessageId;

                    const Body = message.Body;
                    var dynamoDBObject = { OriginalMessageId: MessageId, Body: Body };
                    dynamoDBObjects[index] = dynamoDBObject;

                    Q()
                        .then(() => { return classifyMessage(Body, index) })
                        .then(() => { return insertIntoDynamoDB("MESSAGES", dynamoDBObjects[index]) })
                        .then(() => { return deleteMessageFromMainQueue(message.ReceiptHandle) })
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

        var smsConfig = smsRequired ? getSMSConfig(messageBody) : 'NA';
        var emailConfig = emailRequired ? getEmailConfig(messageBody) : 'NA';

        console.log('smsConfig', smsConfig);

        dynamoDBObjects[messageIndex].smsConfigAvailable = smsConfig === null ? true : false;
        dynamoDBObjects[messageIndex].smsRequired = smsRequired;
        dynamoDBObjects[messageIndex].emailConfigAvailable = emailConfig === null ? true : false;
        dynamoDBObjects[messageIndex].emailRequired = emailRequired;

        console.log('');
        console.log("Mission / Country / VAC --> ", missionCode, countryCode, vacCode);
        console.log("Scan Code --> ", scanCode);
        console.log("SMS Required --> ", smsRequired, ", Email Required --> ", emailRequired);
        console.log("SMS Config --> ", smsConfig, ", Email Config --> ", emailConfig);
        console.log('');


        Promise.all([
            new Promise((resolve, reject) => {
                if (smsRequired && smsConfig != null) {
                    messageBody["smsConfigTemplate"] = smsConfig;
                    console.log('message body before sending to queue', messageBody)
                    sendMessage(SMS_MESSAGE_QUEUE_URL, messageBody)
                        .then(() => {
                            console.log('Message sent to SMS Queue')
                            dynamoDBObjects[messageIndex].smsQueuedTime = new Date().toISOString();
                            resolve();
                        })
                        .catch((err) => {
                            console.log('Error saving in SMS Queue', err)
                            dynamoDBObjects[messageIndex].smsQueueInsertError = err;
                            resolve();
                        })
                }
                else {
                    console.log('Not Sending SMS');
                    resolve();

                }
            }),

            new Promise((resolve, reject) => {
                if (emailRequired && emailConfig != null) {
                    messageBody["emailConfig"] = emailConfig;
                    sendMessage(EMAIL_MESSAGE_QUEUE_URL, messageBody)
                        .then(() => {
                            console.log('Message sent to Email Queue')
                            dynamoDBObjects[messageIndex].emailQueuedTime = new Date().toISOString();
                            resolve();
                        })
                        .catch((err) => {
                            console.log('Error saving Message in Email Queue')
                            console.log('err,', err);
                            dynamoDBObjects[messageIndex].emailQueueInsertError = err;
                            resolve();
                        })
                }
                else {
                    console.log('Not Sending Email');
                    resolve();

                }
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

function getSMSConfig(messageBody) {

    try {
        const language = messageBody.BulkSMSRequests[0].SMSRequest.smsConfig.language;
        const { missionCode, countryCode, vacCode, scanCode } = messageBody.BulkSMSRequests[0].SMSRequest;
        // return messageBody.BulkSMSRequests[0].SMSRequest.smsConfig
        return { missionCode, countryCode, vacCode, scanCode, language, smsTemplate: "SMS_TEMPLATE_001" };
    }
    catch (ex) {
        return {}
    }

}

function getEmailConfig(messageBody) {
    try {
        return {};//messageBody.BulkSMSRequests[0].SMSRequest.emailConfig
    }
    catch (ex) {
        return {}
    }
}

function checkSMSRequired(messageBody) {
    try {
        var phoneNo = messageBody.BulkSMSRequests[0].SMSRequest.smsConfig.phoneNo;
        return phoneNo != "";
    }
    catch (ex) {
        return false;
    }

}

function checkEmailRequired(messageBody) {
    try {
        var emailId = messageBody.BulkSMSRequests[0].SMSRequest.emailConfig.emailId;
        return emailId != "";
    }
    catch (ex) {
        return false;
    }
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

function insertIntoDynamoDB(tableName, data) {
    console.log('')
    console.log('inserting into db')
    console.log('')

    AWS.config.update(aws_local_config);
    const docClient = new AWS.DynamoDB.DocumentClient();

    // console.log('db before insert', data);
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
setInterval(readMessage, 10000);
