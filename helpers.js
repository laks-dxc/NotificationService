var local_config = require('./config/local_config');
var AWS = require('aws-sdk');
AWS.config.update({ region: local_config.AWS_REGION });
var docClient = new AWS.DynamoDB.DocumentClient();

module.exports = {
    jsonConcat: (o1, o2) => {
        for (var key in o2) {
            o1[key] = o2[key];
        }
        return o1;
    },
    addToDynamoDB: (TableName, Item) => {
        return new Promise((resolve, reject) => {
            var params = { TableName, Item };
            docClient.put(params, (err) => err ? reject(err) : resolve());
        })
    }
}