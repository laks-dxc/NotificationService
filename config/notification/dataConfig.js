module.exports = [
    {
        "missionCode": "GBR",
        "countryCode": "IND",
        "vacCode": "PNQ",
        "scanCode": "VAC to Courier Outscan",
        "language": "English",
        "Sms": {
            "templateName":"TIVRE_HTTP",
            "message": {
                "structure": "Dear {0} {1}, this is notification for scan code {2}",
                "params": [
                    "firstName",
                    "lastName",
                    "scanCode"
                ]
            }
        },
        "Email": {

        },
        "Voice": {

        },
        "Whatsapp": {

        }
    },
    {
        "missionCode": "GBR",
        "countryCode": "UAE",
        "vacCode": "ABD",
        "scanCode": "VAC to Courier Outscan",
        "language": "Arabic",
        "Sms": {
            "templateName":"TIVRE_UNICODE",
            "message": {
                "structure": ",{0} {1} مرحبا. شكرا لك على اهتمامك",
                "params": [
                    "firstName",
                    "lastName"
                ]
            }
        },
        "Email": {

        },
        "Voice": {

        },
        "Whatsapp": {

        }
    }
]