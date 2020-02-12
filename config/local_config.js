module.exports = {
    AWS_REGION: 'ap-south-1',
    DYNAMO_DB: {
        config_table: "config",
        messages_table: "messages"
    },
    SQS: {
        main_message_queue: 'https://sqs.ap-south-1.amazonaws.com/563307649055/NotificationService_MainMessageQueue'
    }
}