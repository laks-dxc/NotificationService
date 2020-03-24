module.exports = [


    {
        "notificationType": "sms",
        "name": "TIVRE_HTTPS",
        "description": "Tivre template for sending english sms using HTTPS",
        "vendor": "Tivre",
        "details": {
            "Url": "https://sg.tivre.com:446/httppush/send_smsSch.asp?userid=Test_test_sms@vfsglobal.com&password=Test@121&msg={0}&mobnum={1}&senderid=VFSSMS&msgId={2}&qrytype=impalert&TivreId=1",
            "params": ["msg", "smsConfig.phoneNo", "messageid"]
        }
    },
    {
        "notificationType": "sms",
        "name": "TIVRE_HTTP",
        "description": "Tivre template for sending english sms using HTTP",
        "vendor": "Tivre",
        details: {
            "Url": "http://sg.tivre.com/httppush/send_smsSch.asp?userid=Test_test_sms@vfsglobal.com&password=Test@121&msg={0}&mobnum=91{1}&senderid=VFSSMS&msgId={2}&qrytype=impalert&TivreId=1",
            "inputParams": ["msg", "smsConfig.phoneNo", "messageid"]
        }
    },
    {
        "notificationType": "sms",
        "name": "TIVRE_UNICODE",
        "description": "Tivre template for sending unicode sms using HTTP",
        "vendor": "Tivre",
        "details": {
            "Url": "http://sg.tivre.com/httppush/send_smsSch_unicode.asp?userid=Test_test_sms@vfsglobal.com&password=Test@121&msg={0}&mobnum=91{1}&senderid=VFSSMS&msgId={2}&qrytype=impalert&TivreId=1&param4=1",
            "inputParams": [
                "msg",
                "smsConfig.phoneNo",
                "messageid"
            ]
        }
    },
    {
        "notificationType": "sms",
        "name": "TIVRE_LONG_ENGLISH",
        "description": "Tivre template for sending long (> 170) english sms using HTTP",
        "vendor": "Tivre",
        "Url": "https://sg.tivre.com:446/httppush/send_smsSch.asp?userid=Test_test_sms@vfsglobal.com&password=Test@121&msg={0}&mobnum=91{1}&senderid=VFSSMS&msgId={2}&qrytype=impalert&TivreId=1&param3=1",
        "inputParams": [
            "msg",
            "smsConfig.phoneNo",
            "messageid"
        ]
    },
    {
        "notificationType": "email",
        "name": "LOCAL_SMTP",
        "description": "SMTP Email",
        "vendor": "DXC",
        "smtpServer": "127.0.0.1",
        "smtpPort": "465",
        "inputParams": [
            "msg",
            "emailConfig.emailid",
            "messageid"
        ]
    }
]