var AWS = require('aws-sdk');
AWS.config.update({ region: 'ap-south-2' });
const Q = require('q');
var helpers = require('./helpers.js');
var dataConfig = require('./config/notification/dataConfig')



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

                console.log("Received ", response.Messages.length + " messages");
                response.Messages.forEach((message, index) => {
                    const MessageId = message.MessageId;

                    const Body = message.Body;
                    var dynamoDBObject = { OriginalMessageId: MessageId, Body: Body };
                    dynamoDBObjects[index] = dynamoDBObject;

                    Q()
                        .then(() => { return classifyMessage(dynamoDBObjects[index], index) })
                        .then(() => { return insertIntoDynamoDB("MESSAGES", dynamoDBObjects[index]) })
                        .then(() => { return deleteMessageFromMainQueue(message.ReceiptHandle) })
                });
            }
            else {
                console.log("");
                console.log("Main Message Queue is empty.. retrying.. ");
            }
        }
    });
}

function classifyMessage(_messageBody, messageIndex) {
    return new Promise((resolve, reject) => {

        var messageBody = JSON.parse(_messageBody.Body);
        messageBody.OriginalMessageId = _messageBody.OriginalMessageId;
        const { missionCode, countryCode, vacCode, scanCode } = messageBody.BulkSMSRequests[0].SMSRequest;

        var smsRequired = checkSMSRequired(messageBody);
        var emailRequired = checkEmailRequired(messageBody);

        var smsConfig = smsRequired ? getSMSConfig(messageBody) : 'NA';
        var emailConfig = emailRequired ? getEmailConfig(messageBody) : 'NA';


        dynamoDBObjects[messageIndex].smsConfigAvailable = smsConfig === null ? false : true;
        dynamoDBObjects[messageIndex].smsRequired = smsRequired;
        dynamoDBObjects[messageIndex].emailConfigAvailable = emailConfig === null ? false : true;
        dynamoDBObjects[messageIndex].emailRequired = emailRequired;

        // console.log('');
        // console.log("Mission / Country / VAC --> ", missionCode, countryCode, vacCode);
        // console.log("Scan Code --> ", scanCode);
        // console.log("SMS Required --> ", smsRequired, ", Email Required --> ", emailRequired);
        // console.log("SMS Config --> ", smsConfig, ", Email Config --> ", emailConfig);
        // console.log('');


        Promise.all([
            new Promise((resolve, reject) => {
                if (smsRequired && smsConfig != null) {
                    messageBody["smsConfigTemplate"] = smsConfig;

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
                    console.log('SMS Config not found. Saving ', JSON.stringify({ missionCode, countryCode, vacCode, scanCode, msgArray: [messageBody.OriginalMessageId] }), 'to sms_no_config_db table');
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
                    console.log('');
                    console.log('Not Sending Email');
                    resolve();
                }
            }),

            new Promise((resolve, reject) => {
                (smsRequired && !smsConfig) ?
                    sendToNoConfigDB(messageBody, 'SMS').then(() => resolve())
                    :
                    resolve();
            }),

            new Promise((resolve, reject) => {
                (emailRequired && !emailConfig) ?
                    sendToNoConfigDB(messageBody, 'Email').then(() => resolve())
                    :
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

        for (let i = 0; i < dataConfig.length; i++) {
            var config = dataConfig[i];
            if (
                config.missionCode == missionCode
                &&
                config.countryCode == countryCode
                && config.vacCode == vacCode
                && config.scanCode == scanCode
                && config.language == language
            )
                return config.Sms;

        }
        return null;


        // dataConfig.forEach((config, index) => {
        //     console.log('index', index, "config.missionCode , missionCode", config.missionCode , missionCode);
        //     if (config.missionCode == missionCode
        //         // && config.countryCode == countryCode
        //         // && config.vacCode == vacCode
        //         // && config.scanCode == scanCode
        //         // && config.language == language
        //         ) 
        //         return { templateName: config.Sms.templateName };
        //         // break;

        // });
        // return {};


        // return { missionCode, countryCode, vacCode, scanCode, language, smsTemplate: "SMS_TEMPLATE_001" };
    }
    catch (ex) {
        return null
    }

}

function getEmailConfig(messageBody) {
    try {
        return null;//messageBody.BulkSMSRequests[0].SMSRequest.emailConfig
    }
    catch (ex) {
        return null;
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
