// Load the AWS SDK for Node.js
const request = require('request');
var AWS = require('aws-sdk');
// Set the region
AWS.config.update({ region: 'us-east-2' });

// Create an SQS service object
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });


var queueURL = "https://sqs.us-east-2.amazonaws.com/563307649055/Notification_MainMessageQueue";

var params = {
    AttributeNames: [
        "SentTimestamp"
    ],
    MaxNumberOfMessages: 10,
    MessageAttributeNames: [
        "All"
    ],
    QueueUrl: queueURL,
    VisibilityTimeout: 20,
    WaitTimeSeconds: 0
};

// module.exports = async (event) => {
var start = new Date();

function getMessages() {
    console.log('start...');

    sqs.receiveMessage(params, function (err, data) {
        if (err) {
            console.log("Receive Error", err);
        } else if (data.Messages) {
            console.log('message count', data.Messages.length);

            data.Messages.forEach((message) => {

                var deleteParams = {
                    QueueUrl: queueURL,
                    ReceiptHandle: message.ReceiptHandle
                };
                sqs.deleteMessage(deleteParams, function (err, data) {
                    if (err) {
                        console.log("Delete Error", err);
                    } else {
                        sendSMS('8309038636', "Your login details for RTMS Implementation Toolkit are username: " + data.ResponseMetadata.RequestId + ' and password: ' + message.Body.length)
                            .then(response => console.log('response body',response.body))
                            .catch(error => console.log(error));
                    }
                });

            });
            console.log('processed all records');
            getMessages();
        }
        else {
            console.log('no messages, pausing..');
            var end = new Date();
            console.log('total time', end - start, ' ms');
            // setTimeout(getMessages, 5000);
        }
    });
}

getMessages()


// }

function sendSMS(mobile, msg) {
    return new Promise((resolve, reject) => {
        var url = 'http://www.metamorphsystems.com/index.php/api/bulk-sms?username=shanra&password=ShAnRa@123&from=LAUREL&to=' + mobile + '&message=' + msg + '&sms_type=2';
        request({
            url: url,
            method: 'POST'
        }, function (error, response, body) {
            if (error)
                reject(error);
            else
                resolve({response,body});
        });
    })


}

