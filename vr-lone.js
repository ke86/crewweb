// VR CrewWeb - Löneredovisningar (Shared functions)
(function() {
    'use strict';

    var VR = window.VR;

    // ===== SHARED: Find Hämta button =====
    VR.findHamtaButton = function() {
        var inputs = document.querySelectorAll('input[type="submit"], input[type="button"], button');
        for (var i = 0; i < inputs.length; i++) {
            var val = (inputs[i].value || inputs[i].textContent || '').toLowerCase();
            if (val.indexOf('hämta') > -1) {
                return inputs[i];
            }
        }
        return null;
    };

    // ===== SHARED: Set date INPUT field =====
    VR.setDateInput = function(input, targetDate) {
        console.log('VR setDateInput: Setting to "' + targetDate + '"');
        input.value = targetDate;
        var evt = document.createEvent('HTMLEvents');
        evt.initEvent('change', true, true);
        input.dispatchEvent(evt);
        var inputEvt = document.createEvent('HTMLEvents');
        inputEvt.initEvent('input', true, true);
        input.dispatchEvent(inputEvt);
    };

    // ===== SHARED: Find date INPUT fields =====
    VR.findDateInputs = function() {
        var inputs = document.querySelectorAll('input');
        var dateInputs = [];

        for (var i = 0; i < inputs.length; i++) {
            var val = inputs[i].value || '';
            if (val.match(/^\d{1,2}-\d{2}-\d{4}$/)) {
                dateInputs.push(inputs[i]);
                console.log('VR: Found date input with value: ' + val);
            }
        }

        console.log('VR: Found ' + dateInputs.length + ' date inputs total');
        return dateInputs;
    };

    // ===== SHARED: Check if on Löneredovisningar page =====
    VR.isOnLonePage = function() {
        var radios = document.querySelectorAll('input[type="radio"]');
        for (var i = 0; i < radios.length; i++) {
            var parent = radios[i].parentElement;
            if (parent && parent.textContent.toLowerCase().indexOf('lönedagar') > -1) {
                return true;
            }
        }
        return false;
    };

    // ===== SHARED: Navigate to Löneredovisningar =====
    VR.navigateToLoneredovisningar = function(callback) {
        if (VR.isOnLonePage()) {
            console.log('VR: Already on Löneredovisningar page');
            VR.updateLoader(30, 'Sidan redan laddad...');
            callback();
            return;
        }

        VR.updateLoader(10, 'Öppnar mapp-meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Löneredovisningar...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var lone = VR.findMenuItem('Löneredovisningar');
                if (lone) {
                    VR.stopTimer();
                    VR.updateLoader(20, 'Klickar på Löneredovisningar...');
                    lone.click();
                    VR.waitForLonePage(callback);
                } else if (n > 25) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout - hittade ej Löneredovisningar');
                    // Restore overlay if hidden for navigation
                    if (VR.showOverlayAfterNav) VR.showOverlayAfterNav();
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    VR.waitForLonePage = function(callback) {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(30 + n, 'Väntar på sidan...');

            if (VR.isOnLonePage()) {
                VR.stopTimer();
                VR.updateLoader(45, 'Sidan laddad!');
                setTimeout(callback, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                if (VR.showOverlayAfterNav) VR.showOverlayAfterNav();
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== SHARED: Setup page and fetch =====
    VR.setupLonePageAndFetch = function(parseCallback) {
        VR.updateLoader(50, 'Väljer Lönedagar...');

        var radios = document.querySelectorAll('input[type="radio"]');
        var lonedagarRadio = null;
        for (var i = 0; i < radios.length; i++) {
            var label = radios[i].parentElement ? radios[i].parentElement.textContent : '';
            var name = radios[i].name || '';
            var id = radios[i].id || '';
            if (label.toLowerCase().indexOf('lönedagar') > -1 ||
                name.toLowerCase().indexOf('lönedagar') > -1 ||
                id.toLowerCase().indexOf('lönedagar') > -1) {
                lonedagarRadio = radios[i];
                break;
            }
        }

        if (!lonedagarRadio) {
            var labels = document.querySelectorAll('label');
            for (var j = 0; j < labels.length; j++) {
                if (labels[j].textContent.toLowerCase().indexOf('lönedagar') > -1) {
                    var forId = labels[j].getAttribute('for');
                    if (forId) {
                        lonedagarRadio = document.getElementById(forId);
                    } else {
                        lonedagarRadio = labels[j].querySelector('input[type="radio"]');
                    }
                    if (lonedagarRadio) break;
                }
            }
        }

        if (lonedagarRadio) {
            console.log('VR: Found Lönedagar radio, clicking...');
            lonedagarRadio.click();
        } else {
            console.log('VR: Lönedagar radio NOT found');
        }

        setTimeout(function() {
            VR.updateLoader(55, 'Ställer in datum...');

            var dateInputs = VR.findDateInputs();

            if (dateInputs.length >= 1) {
                console.log('VR: Setting start date to 14-12-2025');
                VR.setDateInput(dateInputs[0], '14-12-2025');
            } else {
                console.log('VR: No date input found for start date!');
            }

            setTimeout(function() {
                if (dateInputs.length >= 2) {
                    console.log('VR: Setting end date to 31-12-2026');
                    VR.setDateInput(dateInputs[1], '31-12-2026');
                } else {
                    console.log('VR: No date input found for end date!');
                }

                setTimeout(function() {
                    VR.updateLoader(65, 'Klickar Hämta...');

                    var hamtaBtn = VR.findHamtaButton();
                    if (hamtaBtn) {
                        console.log('VR: Clicking Hämta button');
                        hamtaBtn.click();
                        VR.updateLoader(70, 'Hämtar data...');
                        VR.waitForLoneData(parseCallback);
                    } else {
                        console.log('VR: Hämta button NOT found');
                        VR.updateLoader(0, 'Hämta-knapp ej hittad');
                        if (VR.showOverlayAfterNav) VR.showOverlayAfterNav();
                        setTimeout(VR.hideLoader, 2000);
                    }
                }, 400);
            }, 300);
        }, 500);
    };

    VR.waitForLoneData = function(parseCallback) {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(70 + Math.min(n, 20), 'Väntar på data...');

            var tables = document.querySelectorAll('table');
            var dateHeaders = document.body.innerHTML.match(/\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/gi);

            if ((tables.length > 2 && dateHeaders && dateHeaders.length > 0) || n > 40) {
                VR.stopTimer();
                VR.updateLoader(92, 'Läser data...');
                setTimeout(parseCallback, 500);
            } else if (n > 60) {
                VR.stopTimer();
                VR.updateLoader(0, 'Timeout - ingen data');
                if (VR.showOverlayAfterNav) VR.showOverlayAfterNav();
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    console.log('VR: Löne (shared) loaded');
})();
