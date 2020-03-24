module.exports =
{
    "missionCode": "GBR",
    "countryCode": "IND",
    "vacCode": "PNQ",
    "scanCode": "VAC to Courier Outscan",
    "language": "English",
    
    "notifications": [
        {
            "notificationType": "sms",
            "priority":"2",
            "templateName": "TIVRE_HTTP",
            "message": {
                "structure": "Dear {0} {1}, your docket is sucessfully outscanned from {2} to {3}",
                "params": [
                    "firstName",
                    "lastName",
                    "scanCode"
                ]
            },
        },
        {
            "notificationType": "email",
            "priority":"2",
            "templateName": "LOCAL_SMTP",
            "message": {
                "structure": "<html><body>Dear {0} {1}, notification for scan code <strong>{2}</strong></body></html>",
                "params": [
                    "firstName",
                    "lastName",
                    "scanCode"
                ]
            },
        }
    ]
}

