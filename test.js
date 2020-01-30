deleteParams = {
    TableName: "MESSAGES",
        Key: {
            "Id": "573.0913539997293",
    //         Artist: "The Acme Band", 
    //         SongTitle: "Look Out, World"
        },
    //    ConditionExpression: "attribute_exists(RecordLabel)"
}

var AWS = require('aws-sdk');AWS.config.update({
    region: "us-west-2",
    endpoint: "http://localhost:8000"
  });
  
  var dynamodb = new AWS.DynamoDB();
  
  var params = {
      TableName : "MESSAGES"
  };
  
  dynamodb.deleteTable(params, function(err, data) {
      if (err) {
          console.error("Unable to delete table. Error JSON:", JSON.stringify(err, null, 2));
      } else {
          console.log("Deleted table. Table description JSON:", JSON.stringify(data, null, 2));
      }
  });