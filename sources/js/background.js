var maxTransferPackages = 90;
var transferPackages = [5, 10, 15, 30, 35, 40, 60, 65, 90];
var transferPackagesPrices = [5, 10, 15, 12.50, 17.50, 22.50, 25, 30, 37.50];

// For preferences
var userkey = '';
var lang = chrome.i18n.getMessage('1st') == '1st' ? 'en' : 'fr';

// From selectedPlan
var limitTotal = 50;
var surchargePerGb = 4.50;
var surchargeLimit = 50;

// For AJAX request & response
var xml_request = null;
var last_updated = 0;

var date_last_updated_data = new Date();
date_last_updated_data.setTime(0);

var response = null;
var load_usage_error = null;
var loadUsageTimer;
var pastAPIRequests = [];
var last_notification;

$(document).ready(function () {
    reloadPrefs();
    loadUsage();
});

function reloadPrefs() {
    userkey = localStorage.userkey;
}

var minute = 60 * 1000;
var hour = 60 * minute;
var day = 24 * hour;

function loadUsage() {
    var n = new Date();
    var now = n.getTime();

    if (!userkey || userkey.length === 0) {
        var notification = webkitNotifications.createNotification(
            'assets/images/icon-64.png',
            tt('needs_config_notif_title'),
            tt('needs_config_notif_text')
        );
        notification.show();
        return;
    }

    // only refresh if it's been more than 6h since the last update, or if the data for the day before yesterday hasn't been downloaded yet.
    var lu = new Date();
    lu.setTime(last_updated);

    if (last_updated === 0) {
        console.log("Chrome restarted, or new install. Updating data...");
    } else {
        console.log("Now: " + now);
        console.log("Last Updated: " + last_updated);
        if ((now - last_updated) <= 6 * hour) {
            console.log("Won't update: data is only refreshed every 6 hours.");
        }
        if ((((now - date_last_updated_data.getTime()) > 2 * day) && (now - last_updated) > 15 * minute)) {
            console.log("Oh, oh! Wait... The latest data is more than 2 days old... Let's retry every 15 minutes until it works then.");
        }
    }
    if ((now - last_updated) > 6 * hour || (((now - date_last_updated_data.getTime()) > 2 * day) && (now - last_updated) > 15 * minute)) {
        if (xml_request !== null) {
            xml_request.abort();
            xml_request = null;
        }

        if (pastAPIRequests.length >= 19) {
            var firstReqDate = pastAPIRequests.shift();
            var elapsedTime = new Date().getTime() - firstReqDate.getTime();

            console.log(pastAPIRequests.length + " API requests were made in the last " + (elapsedTime / 60) + " minutes. Maximum is 20 / 15 minutes.");

            if (elapsedTime < 15 * minute) {
                console.log("Won't send this request, to prevent getting blocked by Videotron.");
                load_usage_error = t('throttled');

                if (loadUsageTimer) {
                    clearTimeout(loadUsageTimer);
                }

                loadUsageTimer = setTimeout(loadUsage, 5 * minute);

                return;
            } else {
                console.log("It's OK to send another request; let's go!");
            }
        }
        pastAPIRequests.push(new Date());
        xml_request = new XMLHttpRequest();
        xml_request.onload = function (e) {
            loadUsage2(e, xml_request);
        };
        xml_request.open("GET", "https://www.videotron.com/api/1.0/internet/usage/wired/" + userkey + ".json?lang=" + lang + "&caller=videotron-chrome.pommepause.com");
        xml_request.setRequestHeader("Cache-Control", "no-cache");
        xml_request.send(null);
    }

    // Repeat every 20 minutes; will only refresh with the server every 6h anyway
    loadUsageTimer = setTimeout(loadUsage, 20 * minute);
}

function loadUsage2(e, request) {
    if (request.status != 200) {
        load_usage_error = 'HTTP error: ' + request.status;
        return;
    }

    var resp;
    if (request.response) {
        resp = request.response;
    } else {
        resp = request.responseText;
    }

    apiResponse = JSON.parse(resp);

    for (var i = 0; i < apiResponse.messages.length; i++) {
        if (apiResponse.messages[i].severity == 'error') {
            if (loadUsageTimer) {
                clearTimeout(loadUsageTimer);
            }

            if (apiResponse.messages[i].code.indexOf('noUsage') != -1 || apiResponse.messages[i].code.indexOf('noProfile.') != -1) {
                load_usage_error = tt('no_data', 2);
                loadUsageTimer = setTimeout(loadUsage, 2 * minute);
            } else if (apiResponse.messages[i].code == 'blocked_ip') {
                load_usage_error = 'API error: ' + apiResponse.messages[i].text;
                loadUsageTimer = setTimeout(loadUsage, 24 * hour + 1 * minute);
            } else if (apiResponse.messages[i].code == 'invalidToken' || apiResponse.messages[i].code == 'invalidTokenClass' || apiResponse.messages[i].code == 'noProfile') {
                load_usage_error = 'API error: ' + apiResponse.messages[i].text;
            } else {
                load_usage_error = 'API error: ' + apiResponse.messages[i].text;
                loadUsageTimer = setTimeout(loadUsage, 20 * minute);
            }
            return;
        }
    }

    response = {
        periodStartDate: apiResponse.periodStartDate,
        periodEndDate: apiResponse.periodEndDate,
        usageTimestamp: apiResponse.internetAccounts[0].usageTimestamp,
        maxCombinedBytes: apiResponse.internetAccounts[0].maxCombinedBytes,
        uploadedBytes: apiResponse.internetAccounts[0].uploadedBytes,
        downloadedBytes: apiResponse.internetAccounts[0].downloadedBytes,
        packageName: apiResponse.internetAccounts[0].packageName,
        packageCode: apiResponse.internetAccounts[0].packageCode
    };

    // @TODO Waiting for the API to report those...
    surchargeLimit = 99999;
    surchargePerGb = 1.50;
    if (response.packageCode) {
        if (response.packageCode == 500 || response.packageCode == 521 || response.packageCode == 518 || response.packageCode == 544 || response.packageCode == 1177 || response.packageCode == 1178) {
            surchargeLimit = 50;
            surchargePerGb = 4.50;
        }
    } else {
        if (response.packageName == 'High-Speed Internet' || response.packageName == 'Basic Internet' || response.packageName == 'Internet haute vitesse' || response.packageName == 'Internet Intermédiaire') {
            surchargeLimit = 50;
            surchargePerGb = 4.50;
        }
    }
    response.surchargeLimit = surchargeLimit;
    response.surchargePerGb = surchargePerGb;
    
    console.log("Got new usage data from server...");
    console.log(response);
    
    date_last_updated_data = response.periodEndDate;

    var this_month_start = new Date(response.periodStartDate);
    var next_month_start = new Date(response.periodEndDate);
    next_month_start.setDate(next_month_start.getDate() + 1);
    var now = new Date(response.usageTimestamp);

    var down = numberFormatGB(response.downloadedBytes, 'B');
    var up = numberFormatGB(response.uploadedBytes, 'B');
    var limitTotal = parseInt(response.maxCombinedBytes / 1024 / 1024 / 1024, 10);

    var nowPercentage = (now.getTime() - this_month_start.getTime()) / (next_month_start.getTime() - this_month_start.getTime());
    var nowBandwidth = parseFloat((nowPercentage * (limitTotal) - down - up).toFixed(2));

    // 'Today is the $num_days day of your billing month.'
    var billingDay = getBillingDay(now, this_month_start);
    var num_days = getBillingMonthDayWording(billingDay);

    var endOfMonthBandwidth = (down + up) / nowPercentage;
    var overLimit = ((down + up) - limitTotal) * surchargePerGb;
    var limitPercentage = ((down + up) * 100.0 / limitTotal).toFixed(0);
    if (limitPercentage > 100) {
        // 'Current extra charges: $overLimit'
        if (overLimit > surchargeLimit) {
            overLimit = surchargeLimit;
        }

        // 'Extra charges with $maxTransferPackages of transfer packages (the maximum): $hypotetic_overLimit.'
        var hypoteticOverLimit = ((down + up) - (limitTotal + maxTransferPackages)) * surchargePerGb;
        if (hypoteticOverLimit > surchargeLimit) {
            hypoteticOverLimit = surchargeLimit;
        } else if (hypoteticOverLimit < 0) {
            // 'To get no extra charges, you'd need to buy another $extraPackages of extra transfer packages.'
            for (var i = 0; i < transferPackages.length; i++) {
                if ((down + up) - (limitTotal + transferPackages[i]) < 0) {
                    extraPackages = transferPackages[i];
                    extraPackagesPrice = transferPackagesPrices[i];
                    break;
                }
            }
        }
    }

    var badgeDetails = {
        text: ''
    };
    var badgeColorDetails = {
        color: [200, 100, 100, 255]
    }; // Dark red
    var titleDetails = {
        title: t('Videotron Internet Usage Monitor')
    };
    var current_notification;
    if (down + up > limitTotal + maxTransferPackages) {
        // You're doomed!
        badgeDetails = {
            text: '!!'
        };
        titleDetails = {
            title: t("over_limit_too_much_tooltip")
        };
        text = tt('used_and_quota', [(down + up).toFixed(0), limitTotal]) + tt('current_extra', overLimit.toFixed(0));
        current_notification = {
            title: t('over_limit_too_much_notif_title'),
            text: text
        };
    } else if (down + up > limitTotal) {
        // All is not lost... Buy transfer packages!
        badgeDetails = {
            text: '!'
        };
        titleDetails = {
            title: t('over_limit_tooltip')
        };
        text = tt('used_and_quota', [(down + up).toFixed(0), limitTotal]) + tt('current_extra', overLimit.toFixed(0)) + tt('over_limit_tip', [extraPackages.toString(), extraPackagesPrice.toFixed(2)]);
        current_notification = {
            title: t('over_limit_notif_title'),
            text: text
        };
    } else if (nowBandwidth < 0 && num_days != '0th' && num_days != '0e') {
        // Not on a good path!
        badgeDetails = {
            text: '!'
        };
        badgeColorDetails = {
            color: [255, 204, 51, 255]
        }; // Yellow orangish
        titleDetails = {
            title: t('expected_over_limit_tooltip')
        };
        text = tt('used_and_quota', [(down + up).toFixed(0), limitTotal]) + tt('expected_over_limit_tip', [num_days, endOfMonthBandwidth.toFixed(0)]);
        current_notification = {
            title: t('expected_over_limit_notif_title'),
            text: text
        };
    } else {
        badgeDetails = {
            text: '+'
        };
        badgeColorDetails = {
            color: [0, 153, 0, 255]
        }; // Green
        titleDetails = {
            title: t('all_is_well')
        };
    }

    if (chrome.browserAction) {
        chrome.browserAction.setBadgeText(badgeDetails);
        chrome.browserAction.setBadgeBackgroundColor(badgeColorDetails);
        chrome.browserAction.setTitle(titleDetails);
    }

    if (current_notification && (!last_notification || current_notification.title != last_notification.title)) {
        var show_notifications = localStorage.showNotifications == 'true' || typeof localStorage.showNotifications == 'undefined';
        if (show_notifications) {
            // Show notification
            var notification = webkitNotifications.createNotification(
                'assets/images/icon-64.png',
                current_notification.title,
                current_notification.text
            );
            notification.show();
        }
    }

    last_notification = current_notification;
    last_updated = (new Date()).getTime();
}

function getBillingDay(now, this_month_start) {
    return parseInt(Math.floor((now.getTime() - this_month_start.getTime()) / (24 * 60 * 60 * 1000)) + 1, 10);;
}

function getBillingMonthDayWording(day){
    var numDays = "";
    switch (day) {
        case 1:
            numDays = t('1st');
            break;
        case 2:
            numDays = t('2nd');
            break;
        case 3:
            numDays = t('3rd');
            break;
        case 21:
            numDays = t('21st');
            break;
        case 22:
            numDays = t('22nd');
            break;
        case 23:
            numDays = t('23rd');
            break;
        case 31:
            numDays = t('31st');
            break;
        default:
            numDays = day + t('th');
    }
    
    return numDays;
}


var units = new Array("B", "KB", "MB", "GB");

function numberFormatGB(number, unit) {
    var go = false;
    for (var i = 0, len = units.length; i < len; i++) {
        if (go) {
            number = number / 1024;
        }
        if (units[i] == unit) {
            go = true;
        }
    }
    return number;
}

function findChild(element, nodeName) {
    var child = null;
    for (child = element.firstChild; child !== null; child = child.nextSibling) {
        if (child.nodeName == nodeName) {
            break;
        }
    }
    return child;
}

/**
 * Handles data sent via chrome.extension.sendRequest().
 * @param request Object Data sent in the request.
 * @param sender Object Origin of the request.
 * @param sendResponse Function The method to call when the request completes.
 */
function onRequest(request, sender, sendResponse) {
    switch (request.action) {
    case 'getUsage':
        sendResponse({
            response: response,
            load_usage_error: load_usage_error
        });
        return;
    case 'loadUsage':
        last_updated = 0;
        reloadPrefs();
        loadUsage();
        return;
    }
    sendResponse({});
    return;
}

// Wire up the listener.
chrome.extension.onRequest.addListener(onRequest);