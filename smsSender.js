var AWS = require('aws-sdk');
var request = require('request');

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
                var messageObject = JSON.parse(response.Messages[0].Body).BulkSMSRequests[0].SMSRequest;
                console.log(response.Messages);
                const { missionCode, countryCode, vacCode, firstName, lastName, scanCode } = messageObject;
                var options = {
                    'method': 'POST',
                    // 'url': encodeURI(prepareURL('tempalte',"مرحبا. شكرا لك على اهتمامك")), //message
                    
                    'url': encodeURI(prepareURL('template',"నేను నిన్ను ప్రేమిస్తున్నాను")), //message

                    'headers': {
                    }
                };

                request(options, function (error, response) {
                    if (error) throw new Error(error);
                   responseBody =  response.body.replace('<meta http-equiv=Content-Type content="text/html; charset=utf-8">', '');
                    console.log("SMS Sent with response:", responseBody.trim());

                });
            }

            else {
                console.log('No Messages in SMS Queue ')
            }
        }
    })
}



readMessage();

function prepareURL(template, message) {
    return 'http://sg.tivre.com/httppush/send_smsSch_unicode.asp?userid=Test_test_sms@vfsglobal.com&password=Test@121&msg=' + message + '&mobnum=918309038636&senderid=VFSSMS&msgId=123456&qrytype=impalert&TivreId=1&param4=1';
}

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
                console.log('Message deleted from Queue:', queueName, 'with response', response);
                resolve();
            }
            else {
                reject(err);
            }
        })
    })
}