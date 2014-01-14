Videotron Internet Usage Monitor for Google Chrome
==================================================

Whats is it?
------------

Quite simply, this is a Google Chrome extension that allows Videotron.com customers
to monitor their monthly bandwidth quota.

**Important note** 
This extension is a fork of the original Videotron Internet Usage Monitor extension (https://github.com/gboudreau/videotron_monitor_chrome).

The original one is no longer maintained. This fork will be the official repository for the extension. However, many many thanks to Guillaume for the original work done on the extension.

Features
--------

The extensions adds a button in the toolbar. This button will have a '!' yellow overlay if you're on your way to being over-limit.
It will have a '!' red overlay if you exceeded your limit, but could still buy extra transfer packages to prevent overcharges.
It will have a '!!' red overlay if you exceeded your limit, and even if you buy all the extra transfer packages you can (90GB at this time), you'll still be charged extra.

Clicking the toolbar button will display a popup window with more details:

* when your billing month started;
* the amount of upload and download you made thus far, this month;
* a graph of you current usage versus your allowed usage;
* a hint about where you stand on your daily quota usage: did you download too much, or not enough, since the beginning of your billing month, to end the month with your quota used at 100%?;
* the last updated date.

Desktop Notifications will appear if you either are over-limit, or on your way to be over-limit by the end of the month. They will give you some details about your current situation and options.

How it works?
-------------
Every 6 hours, the extension sends an HTTP request to the Videotron Public API.

This API has been developed by Videotron to provide to third-party developers the data necessary to display bandwidth usage for Videotron customers.

How to use?
-----------

Install the extension from the [Google Chrome WebStore](https://chrome.google.com/webstore/detail/fnhepcakkcnkaehfhpagimbbkpelkdha)

Then go in the options (right-click the taskbar button and choose Options), enter your Videotron User Key.

Don't know your Videotron User Key? You can find it in your Videotron Customer Center, in the [User Key] (https://www.videotron.com/client/user-management/secur/InitProfile.do?dispatch=initProfile&tab=token&lang=en&caller=videotron-chrome.pommepause.com) tab of the Your Profile page.

Changelog
---------
(2013-01-14) - v0.6.4 - Bugfix in the data refresh logic.
(2013-01-05) - v0.6.3 - Visual refactorings
(2013-01-03) - v0.6.2 - Produced a fix to the response serialisation message. 