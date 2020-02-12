var local_config = require('./config/local_config');
var helpers = require('./helpers.js');
var moment = require("moment");

var express = require('express');
var bodyParser = require('body-parser');
var AWS = require('aws-sdk');

var app = express();
var router = express.Router();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/api', router);


AWS.config.update({ region: local_config.AWS_REGION });
var sqs = new AWS.SQS();

var port = process.env.PORT || 8080;

var main_message_queue_params = {
    DelaySeconds: 0,
    MessageAttributes: {},
    QueueUrl: local_config.SQS.main_message_queue,
    MessageBody: ""
};

router.get('/', function (req, res) {
    res.status(200).send({ message: 'ok' });
});

router.post('/message/send', (req, res) => {

    var response = {
        messageReceivedTime: moment().unix()
    };

    var messageBody = req.body;

    sendMessage(messageBody)
        .then(succesMessage => {
            response.messageId = succesMessage.MessageId;
            response.messageBody = JSON.stringify(messageBody);
            return response;
        })
        .then(content => {
            helpers.addToDynamoDB(local_config.DYNAMO_DB.messages_table, content)
                .then(() => res.status(200).send(content))
                .catch((err) => res.status(500).send({ error_type: 'DB', 'err': err }));
        })
        .catch(err => res.status(500).send({ error_type: 'QUEUE', 'err': err }));
});

function sendMessage(event) {
    main_message_queue_params.MessageBody = JSON.stringify(event);
    return new Promise((resolve, reject) => sqs.sendMessage(main_message_queue_params, (err, data) => err ? reject(err) : resolve(data)));
};

app.listen(port);

console.log('API Started on ' + port);