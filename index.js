var AWS = require('aws-sdk');
AWS.config.update({ region: 'us-east-2' });
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var sqs = new AWS.SQS({ apiVersion: '2012-11-05' });
var msgBody = {
    "BulkSMSRequests": [
        {
            "SMSRequest": {
                "missionCode": "GBR",
                "countryCode": "IND",
                "vacCode": "PNQ",
                "scanCode": "VAC to Courier Outscan",
                "aurn": "PNQ11/240120/00011/007",
                "firstName": "Amol",
                "lastName": "Ahire",
                "interviewScheduledDate": "",
                "nationalityCode": "aaa",
                "awbNo": "",
                "courierPartner": "",
                "smsConfig": {
                    "phoneNo": "8309038636",
                    "fromBranch": "Mumbai",
                    "toBranch": "Mumbai",
                    "language": "English"
                },
                "autoCallDialerConfig": {
                    "phoneNo": null,
                    "language": "English"
                },
                "emailConfig": {
                    "emailId": "aahire3@dxc.com"
                },
                "otherParams": {
                    "reqParam1": null,
                    "reqParam2": null,
                    "reqParam3": null,
                    "reqParam4": null,
                    "reqParam5": null,
                    "reqParam6": null
                },
                "ivrConfig": {}
            }
        }
    ]
}

var aws_local_config =
{
    region: 'local',
    endpoint: 'http://localhost:8000'
};

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
AWS.config.update(aws_local_config);

const docClient = new AWS.DynamoDB.DocumentClient();

var port = process.env.PORT || 8080;
var router = express.Router();

router.get('/', function (req, res) {
    const params = {
        TableName: "MESSAGES",
        Item: {
            Id: (Math.random() * 1000).toString()
        }
    };

    docClient.put(params, (err, data) => {
        if (!err)
            res.status(200).send({ message: params.Item });
        else
            res.status(500).send({ "err": err });
    });
});

router.get('/value', (req, res) => {
    filterValue = req.params.id;

    const params = {
        TableName: "MESSAGES",
    };

    docClient.scan(params, (err, data) => {
        if (!err)
            res.status(200).send(data);
        else
            res.status(500).send({ "err": err });
    });

});

router.post('/message/send', (req, res) => {

    var response = {
        messageOriginatedTime: req.originatedTime, messageReceivedTime: new Date()
    };
    var messageBody = req.body;
    messageBody.queuedTime = new Date();

    sendMessage(messageBody)
        .then((succesMessage) => {
            response.queuedTime = messageBody.queuedTime;
            response.messageId = succesMessage.MessageId;

            res.status(200).send(response);
        })
        .catch(err => res.status(500).send(err))
});

app.use('/api', router);

app.listen(port);

console.log('API Started on ' + port);

function sendMessage(event) {

    var params = {
        DelaySeconds: 0,
        MessageAttributes: {},
        MessageBody: JSON.stringify(event),
        QueueUrl: "https://sqs.us-east-2.amazonaws.com/209452574116/mainMessageQueue"
    };
    return new Promise((resolve, reject) => sqs.sendMessage(params, (err, data) => data ? resolve(data) : reject(err)));
};

function connectRedis(required) {
    if (required) {
        const redis = require('redis');

        if (typeof redisClient === 'undefined') {
            var redisClient = redis.createClient(6379, "notification-cache.k77nr9.0001.use2.cache.amazonaws.com", (err) => {
                if (!err) console.log('connected to redis');
            })
        }
    }
}

function callRedis(required) {
    if (required) {
        connectRedis(required);

        /*global redisClient*/
        redisClient.on('ready', (err) => {
            if (!err) {
                redisClient.set("body", new Date().toLocaleDateString());
                redisClient.get('body', (err, msg) => {
                    if (!err)
                        redisClient.quit();
                });
            }
        });
    }
}
