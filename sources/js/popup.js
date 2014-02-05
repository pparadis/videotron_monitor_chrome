$(document).ready(function() {
    translate();
    show();
});

function translate() {
    $('#needs_config').html(tt("needs_config", chrome.extension.getURL('options.html')));
    $('#usage_title').html(t("internet_usage"));
    $('#ohnoes').html(tt("oh_noes_error", ""));
    $('#this_month_intro').html(t("this_month"));
    $('#this_month_down_suffix, #this_month_down_suffix_2').html(t("download"));
    $('#this_month_up_suffix, #this_month_up_suffix_2').html(t("upload"));
    $('#this_month_now_suffix').html(t("month_now"));
    $('#last_updated_intro').html(t("last_updated"));
}
