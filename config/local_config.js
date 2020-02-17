module.exports =
{
    "laks_rnd":
    {
        AWS_REGION: 'us-west-2',
        DYNAMO_DB: {
            config_table: "config",
            messages_table: "messages",
            dax_endpoints: [
                'anothercluster.wsk3uj.clustercfg.dax.usw2.cache.amazonaws.com:8111'
            ]
        },

        SQS: {
            main_message_queue: 'https://sqs.ap-south-1.amazonaws.com/563307649055/NotificationService_MainMessageQueue',
            sms_queue: 'https://sqs.ap-south-1.amazonaws.com/563307649055/NotificationService_SMSQueue',
            email_queue: 'https://sqs.ap-south-1.amazonaws.com/563307649055/NotificationService_EmailQueue'
        }
    }
}