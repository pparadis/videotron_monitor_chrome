// Local
var color_code_upload = false;

// From selectedPlan
var limitTotal = 50;
var surchargePerGb = 4.50;
var surchargeLimit = 50;
var maxTransferPackages = 90;
var transferPackages = [5, 10, 15, 30, 35, 40, 60, 65, 90];
var transferPackagesPrices = [5, 10, 15, 12.50, 17.50, 22.50, 25, 30, 37.50];

function reloadPrefs() {
    color_code_upload = localStorage.colorCodeUpload == 'true';
}


function savePrefs() {
    // save preferences
    localStorage.userkey = $("#userkey").val();
    localStorage.colorCodeUpload = $("#color_code_upload")[0].checked;
    localStorage.showNotifications = $("#show_notifications")[0].checked;

    if ($("#userkey").val().length != 16) {
        $("#status").html('<span style="color: #F00">' + t("invalid_user_key") + '</span>');
        return;
    }

    chrome.extension.sendRequest({
        action: 'loadUsage'
    }, function () {});

    // Update status to let user know options were saved.
    $("#status").html(t("options_saved"));
    setTimeout(function () {
        $("#status").html("");
        translate();
    }, 1250);
}

function show() {
    reloadPrefs();

    var userkey = localStorage.userkey;
    if (!userkey || userkey === null || userkey.length === 0) {
        $('#loading').css('display', 'none');
        $('#needs_config').css('display', 'block');
        return;
    }

    $("#ohnoes").css('display', "none");
    $('#needs_config').css('display', 'none');
    if ($('#this_month').css('display') == 'none') {
        $('.page-content').addClass('loading');
    } else {
        $('#this_month_loader').css('display', 'inline');
        $('#this_month_meter_1').css('marginTop', '-5px');
    }

    chrome.extension.sendRequest({
        action: 'getUsage'
    }, function (response) {
        if (response.load_usage_error) {
            $('#ohnoes').html(t(response.load_usage_error));
            $("#ohnoes").css('display', "block");

            $('.page-content').removeClass('loading');

            $('#this_month_loader').css('display', "none");
            $('#this_month').css('display', "none");
            $('#this_month_bandwidth').css('display', "none");
            $("#last_updated").css('display', "none");
            setTimeout(show, 30000);
            return;
        }

        response = response.response;

        if (response === null) {
            setTimeout(show, 2000);
            return;
        }

        limitTotal = parseInt(response.maxCombinedBytes / 1024 / 1024 / 1024, 10);
        surchargeLimit = response.surchargeLimit;
        surchargePerGb = response.surchargePerGb;

        $("#ohnoes").css('display', "none");

        $('.page-content').removeClass('loading');
        $('#this_month_loader').css('display', "none");

        $("#last_updated").css('display', "block");
        $('#needs_config').css('display', 'none');
        $('#this_month_start').html('(' + t('started') + ' ' + dateFormat(response.periodStartDate) + ')');
        $('#this_month_end').html(dateFormat(new Date(response.usageTimestamp), true));
        $('#this_month_down').html((response.down < 1 ? '0' : '') + response.down.toFixed(2) + ' ' + t("GB"));
        $('#this_month_up').html((response.up < 1 ? '0' : '') + response.up.toFixed(2) + ' ' + t("GB"));
        $('#this_month_total').html((response.down + response.up < 1 ? '0' : '') + (response.down + response.up).toFixed(2) + ' ' + t("GB"));
        $('#this_month').css('display', "block");

        checkLimits(response.down, response.up);

        // Now bar(s)
        var metersWidth = 388;
        var nowPos = parseInt((response.nowPercentage * metersWidth).toFixed(0), 10);
        if (nowPos > (metersWidth)) {
            nowPos = metersWidth;
        }

        $('#this_month_now_1').css('width', getLimitPercentage(nowPos, 388) + '%');

        if (parseInt($('#this_month_meter_1_end').css('left').replace('px', ''), 10) <= parseInt(nowPos, 10) || response.billingDay === 0) {
            $('#this_month_now_1_img')[0].src = 'assets/images/now.gif';
        } else {
            $('#this_month_now_1_img')[0].src = 'assets/images/now_nok.gif';
        }
        $('#this_month_bandwidth').css('display', "");
        
        var text = '';
        if(response.notificationText === "") {
            text = tt('accumulated_daily_surplus', ['neg', response.nowBandwidth, (response.nowBandwidth > 0 ? t("download_more") : '')]);
        } else {
            text = '<span class="nowbw neg">' + response.notificationText + '</span>';
        }

        $('#this_month_now_bw_usage').html(text);
    });
}

function checkLimits(currentDown, currentUp) {
    $('#this_month_now_1').css('display', 'inline');

    // Numbers colors
    $('#this_month_total').css('fontWeight', 'bold');
    $('#this_month_total').css('color', getLimitColor(currentDown + currentUp, limitTotal));
    $('#this_month_down').css('fontWeight', 'normal');
    $('#this_month_up').css('fontWeight', 'normal');
    $('#this_month_down').css('color', "#000000");
    $('#this_month_up').css('color', "#000000");

    // Meters
    if (currentDown < currentUp) {
        $('.usage-bar .used.download').addClass('over');
    } else {
        $('.usage-bar .used.upload').addClass('over');
    }

    var metersWidth = 388;
    $('#this_month_meter_1_text').html(t('download_and_upload'));
    var x = (getLimitPercentage(currentDown + currentUp, limitTotal) * metersWidth / 100.0).toFixed(0);
    if (x > (metersWidth)) {
        x = (metersWidth);
    }
    $('#this_month_meter_1_end').css('width', ((metersWidth) - x) + 'px');
    $('#this_month_meter_1_end').css('left', x + 'px');

    if (color_code_upload) {
        x = (getLimitPercentage(currentUp, limitTotal) * metersWidth / 100.0).toFixed(0);
        $('#this_month_meter_1_start').css('width', x + 'px').show();
    } else {
        $('#this_month_meter_1_start').hide()
    }

    // Percentage
    //$('#this_month_percentage_1').css('left', t('this_month_percentage_1_pos_total'));
    console.log(getLimitPercentage(currentDown + currentUp, limitTotal));
    $('#this_month_percentage_1').html(getLimitPercentage(currentDown + currentUp, limitTotal) + '%');
}

function getLimitPercentage(number, limit) {
    return (number * 100.0 / limit).toFixed(0);
}

function getLimitColor(number, limit) {
    var color = '#01B200';
    if (getLimitPercentage(number, limit) >= 75) {
        color = '#D79800';
    }
    if (getLimitPercentage(number, limit) >= 90) {
        color = '#FF7F00';
    }
    if (getLimitPercentage(number, limit) >= 98) {
        color = '#FF0900';
    }
    return color;
}

function dateFormat(d, include_time) {
    if (typeof include_time == 'undefined') {
        include_time = false;
    }
    if (typeof d == 'string') {
        d = new Date(d);
    }
    return d.getFullYear() + '-' + (d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : (d.getMonth() + 1)) + '-' + (d.getDate() < 10 ? '0' + d.getDate() : d.getDate()) + (include_time ? (' ' + (d.getHours() < 10 ? '0' + d.getHours() : d.getHours()) + ':' + (d.getMinutes() < 10 ? '0' + d.getMinutes() : d.getMinutes())) : '');
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

/***********************************/
// Internationalization
/***********************************/

function t(key) {
    var text = chrome.i18n.getMessage(key);
    return text === '' ? key : text;
}

function tt(key, substitutions) {
    var text = chrome.i18n.getMessage(key, substitutions);
    return text === '' ? key : text;
}