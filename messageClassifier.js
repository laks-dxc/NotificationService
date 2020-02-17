var AWS = require('aws-sdk');
const AmazonDaxClient = require('amazon-dax-client');
var local_config = require('./config/local_config');
const Q = require('q');
var helpers = require('./helpers.js');
var dataConfig = require('./config/notification/dataConfig');
var sqs = new AWS.SQS();

var dynamoDBObjects = [];

const MAIN_MESSAGE_QUEUE_URL = local_config.SQS.main_message_queue;
const SMS_MESSAGE_QUEUE_URL = local_config.SQS.sms_queue;
const EMAIL_MESSAGE_QUEUE_URL = local_config.SQS.email_queue;

var dax = new AmazonDaxClient({ endpoints: [local_config.DYNAMO_DB.dax_endpoints[0]], region: local_config.AWS_REGION })
daxClient = new AWS.DynamoDB.DocumentClient({ service: dax });

console.log('daxClient', daxClient.service.config.credentials);
var params = {
    TableName: local_config.DYNAMO_DB.messages_table,
    Key: {
        "messageId": 'da903e28-7e1f-4df8-9717-be192e8f8f0e',
    }
};

var ddbClient = new AWS.DynamoDB.DocumentClient();
var client = daxClient != null ? daxClient : ddbClient;


client.get(params, function (err, data) {
    if (err) {
        console.error("Unable to read item. Error JSON:", JSON.stringify(err, null, 2));
    } else {
        console.log('data', data);
    }
});



var readParams = {
    QueueUrl: MAIN_MESSAGE_QUEUE_URL,
    MaxNumberOfMessages: 1,
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

                response.Messages.forEach((message, index) => {
                    const messageBody = JSON.parse(message.Body);
                    const messageId = message.MessageId;

                    classifyMessage(messageId, messageBody);


                    // var dynamoDBObject = { OriginalMessageId: MessageId, Body: Body };
                    // dynamoDBObjects[index] = dynamoDBObject;

                    // Q()
                    //     .then(() => { return classifyMessage(dynamoDBObjects[index], index) })
                    //     .then(() => { return insertIntoDynamoDB("MESSAGES", dynamoDBObjects[index]) })
                    //     .then(() => { return deleteMessageFromMainQueue(message.ReceiptHandle) })
                });
            }
            else {
                console.log("");
                console.log("Main Message Queue is empty.. retrying.. ");
            }
        }
    });
}

function classifyMessage(messageId, messageBody) {
    return new Promise(async (resolve, reject) => {

        var smsRequired = checkSMSRequired();
        var emailRequired = checkEmailRequired();

        var smsTemplate = smsRequired == true ? await getSMSConfig() : 0;
        var emailTemplate = emailRequired == true ? await getEmailConfig() : 0;

        Promise.all([getSMSConfig(), getEmailConfig()])
            .then((response) => console.log('response', response));

        // if (smsConfig == -1) {
        // console.log({ smsConfig: smsTemplate, emailConfig: emailTemplate })
        // }

        // if (emailConfig == -1) {

        // }

    })

    function getSMSConfig() {
        return new Promise((resolve, reject) => {
            resolve(Math.random().toFixed(0) % 3 == 0)
        })
    }

    function getEmailConfig() {
        return new Promise((resolve, reject) => {
            resolve(Math.random().toFixed(0) % 3 == 0)
        })
    }


    function checkSMSRequired() {
        try {
            var phoneNo = messageBody.BulkSMSRequests[0].SMSRequest.smsConfig.phoneNo;
            return phoneNo != "";
        }
        catch (ex) {
            return false;
        }

    }

    function checkEmailRequired() {
        try {
            var emailId = messageBody.BulkSMSRequests[0].SMSRequest.emailConfig.emailId;
            return emailId != "";
        }
        catch (ex) {
            return false;
        }
    }
}

function _classifyMessage(_messageBody, messageIndex) {
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


    var Items = helpers.jsonConcat({ Id: (Math.random() * 1000).toString() }, data);

    return helpers.addToDynamoDB({
        TableName: tableName,
        Item: Items
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


// readMessage();
// setInterval(readMessage, 10000);
