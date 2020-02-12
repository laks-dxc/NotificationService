var AWS = require('aws-sdk');
var request = require('request');
var vendorTemplate = require('./config/notification/vendorTemplates');
AWS.config.update({ region: 'us-east-2' });
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });

const SMS_MESSAGE_QUEUE_URL = "https://sqs.us-east-2.amazonaws.com/209452574116/smsQueue";

var queueReadParams = {
    QueueUrl: SMS_MESSAGE_QUEUE_URL,
    MaxNumberOfMessages: 1,
    //ReceiveRequestAttemptId: 'STRING_VALUE',
    VisibilityTimeout: 20,
    WaitTimeSeconds: 2
};

function readMessage() {
    sqs.receiveMessage(queueReadParams, function (err, response) {
        if (err)
            console.log(err, err.stack); // an error occurred
        else {
            if (response.Messages && response.Messages.length > 0) {


                var parsedBody = JSON.parse(response.Messages[0].Body);
                var messageObject = parsedBody.BulkSMSRequests[0].SMSRequest;
                const { firstName, lastName } = messageObject;

                const phoneNo = messageObject.smsConfig.phoneNo;


                const template = parsedBody.smsConfigTemplate;
                var rawMessage = template["message"]["structure"];
                var generatedMessage = String.format(rawMessage, firstName, lastName, messageObject["scanCode"]);
                sendSMS(template["templateName"], generatedMessage, phoneNo).then((_response) => {
                    console.log('SMS Sent with responseId:', _response, ' --> will be saved against messageId ' + parsedBody.OriginalMessageId);
                    deleteMessageFromQueue(SMS_MESSAGE_QUEUE_URL, response.Messages[0].ReceiptHandle, 'SMS Queue').then((res) => {
                        console.log('');
                    })
                })

            }

            else {
                console.log('SMS Queue is empty.. retrying.. ')
                console.log('');

            }
        }
    })
}

function sendSMS(templateName, message, phoneNo, messageId = '12345') {
    return new Promise((resolve, reject) => {

        var url = String.format(vendorTemplate[templateName].Url, message, phoneNo, messageId)
        // console.log('url', url);
        var options = {
            'method': 'POST',
            'url': encodeURI(url), //message
        };

        request(options, function (error, response) {
            if (error) reject(error);
            else {
                responseBody = response.body.replace('<meta http-equiv=Content-Type content="text/html; charset=utf-8">', '');
                resolve(responseBody.trim())
            }
        });
    });


}



readMessage();



setInterval(readMessage, 5000);

// var receiptHandle =
// 'AQEB8kUCO9i0QMtqr2fJ/epFJdYNOZMAxZRUgvktGBIes6eizlSqLN3e4basHv0ZogXXX9sSOcFzpk0bisamd6/0CNviRoLH3YayEhmXG/9LAQVfSho0ZnUBkw78WaUMJMe3rGJurp89jdTUHvLr4JLOG0AYKP9bPFr4t5VVqmibKRVz6gMyNaPVbgjnEiRNAIdGS4vXVXR3pUxl8FVtn8ZQrdCaq5w3jSNDCaYXwVpJcvXU8e2+HaKj1CjWzumSOgCwz/nS5pSpQoCKKxyEaRSFSKAXpx+cWoWf+A7cZASSaW0OhNsZn4rF2jt46gwxrawwiMmR1PRshPlaHNfjQaI9uncUAQJDAcA7tDY5sxYaqOKsXhD8D2xftbZbLrYdoTh9'

// deleteMessageFromQueue(SMS_MESSAGE_QUEUE_URL,
//     receiptHandle,
//     'sms')

function deleteMessageFromQueue(queueURL, receiptHandle, queueName = '') {
    return new Promise((resolve, reject) => {
        var deleteParams = {
            QueueUrl: queueURL,
            ReceiptHandle: receiptHandle
        }

        sqs.deleteMessage(deleteParams, (err, response) => {
            if (!err) {
                console.log('Message deleted from Queue:', queueName);
                resolve();
            }
            else {
                reject(err);
            }
        })
    })
}

if (!String.format) {
    String.format = function (format) {
        var args = Array.prototype.slice.call(arguments, 1);
        return format.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined'
                ? args[number]
                : match
                ;
        });
    };
}