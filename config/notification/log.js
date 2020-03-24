module.exports = {
    msgBody: {
        "BulkSMSRequests": [{
            "SMSRequest": {
                "missionCode": "GBR",
                "countryCode": "IND",
                "vacCode": "PNQ",
                "scanCode": "VAC to Courier Outscan",
                "aurn": "PNQ11/240120/00011/007",
                "trackingNo": "",
                "firstName": "Amol",
                "lastName": "Ahire",
                "interviewScheduledDate": "",
                "nationalityCode": "aaa",
                "awbNo": "",
                "courierPartner": "",
                "smsConfig": {
                    "phoneNo": "9970283058",
                    "fromBranch": "Mumbai",
                    "toBranch": "Mumbai",
                    "language": "English"
                },
                "autoCallDialerConfig": {
                    "phoneNo": null,
                    "language": "English"
                },
                "emailConfig": {
                    "emailId": "aahire3@dxc.com",
                    "attachment": ""
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
        }]
    },
    msgId: "20200320143020-0",
    received: 20200320143020,
    mission: 'BGR',
    country: 'IND',
    vac: 'MUM',
    sms_required: true,
    sms_template_used: "TIVRE_HTTPS",   // blank in case config not found
    sms_vendor: "DXC",
    sms_audit: {                        // undefined if sms_required is true and sms_template_used is blank
        sent: 20200320144020,
        status: "Delivered",
        last_status_ts: 20200320144110,
    },
    sms_tat: 300,
    email_required: true,
    email_template_used: "EMAIL_LOCAL",   //blank in case config not found
    email_vendor: "DXC",
    email_audit: {                        // undefined if email_required is true and email_template_used is blank
        sent: 20200320144020,
        status: "Delivered",
        last_status_ts: 20200320144110,
    },
    wa_required: false,

    autoCall_required: false

}