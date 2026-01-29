// VR CrewWeb - Bakgrundscaching (Prefetch)
(function() {
    'use strict';

    var VR = window.VR;

    // ===== PREFETCH STATE =====
    VR.prefetchStatus = {
        running: false,
        done: false,
        obDone: false,
        srDone: false,
        fpDone: false
    };

    // ===== MAIN PREFETCH FUNCTION =====
    // Called after Schema loads - runs in background
    VR.prefetchAllData = function() {
        // Don't run if already running or done
        if (VR.prefetchStatus.running || VR.prefetchStatus.done) {
            console.log('VR: Prefetch already running or done, skipping');
            return;
        }

        // Check if we already have all data cached
        var hasOB = VR.obData && VR.obData.length > 0;
        var hasSR = VR.srData && Object.keys(VR.srData).length > 0;
        var hasFP = VR.statistikFPData && VR.statistikFPData.length > 0;

        if (hasOB && hasSR && hasFP) {
            console.log('VR: All data already cached, skipping prefetch');
            VR.prefetchStatus.done = true;
            return;
        }

        console.log('VR: Starting background prefetch...');
        VR.prefetchStatus.running = true;

        // Start the prefetch process
        VR.prefetchNavigateToLone();
    };

    // ===== NAVIGATE TO LÖNEREDOVISNINGAR =====
    VR.prefetchNavigateToLone = function() {
        console.log('VR: Prefetch - navigating to löneredovisningar...');

        // Use existing navigation function if available
        if (typeof VR.navigateToLoneredovisningar === 'function') {
            VR.navigateToLoneredovisningar(function() {
                VR.prefetchSetupAndFetch();
            });
        } else {
            // Fallback: manual navigation
            VR.clickFolder();
            setTimeout(function() {
                var n = 0;
                var checkInterval = setInterval(function() {
                    n++;
                    var el = VR.findMenuItem('Löne- & Tidsredovisning');
                    if (!el) el = VR.findMenuItem('Löneredovisningar');
                    if (!el) el = VR.findMenuItem('Löner');

                    if (el) {
                        clearInterval(checkInterval);
                        el.click();
                        setTimeout(VR.prefetchSetupAndFetch, 1000);
                    } else if (n > 20) {
                        clearInterval(checkInterval);
                        console.log('VR: Prefetch - could not navigate to löner');
                        VR.prefetchStatus.running = false;
                    }
                }, 400);
            }, 600);
        }
    };

    // ===== SETUP PAGE AND FETCH DATA =====
    VR.prefetchSetupAndFetch = function() {
        console.log('VR: Prefetch - setting up page...');

        // Use existing setup function if available
        if (typeof VR.setupLonePageAndFetch === 'function') {
            VR.setupLonePageAndFetch(VR.prefetchParseAllData);
        } else {
            // Fallback: wait for page and parse
            var n = 0;
            var checkInterval = setInterval(function() {
                n++;
                var tables = document.querySelectorAll('table');
                if (tables.length > 0 || n > 30) {
                    clearInterval(checkInterval);
                    setTimeout(VR.prefetchParseAllData, 500);
                }
            }, 400);
        }
    };

    // ===== PARSE ALL DATA =====
    VR.prefetchParseAllData = function() {
        console.log('VR: Prefetch - parsing OB and FP/FPV from löneredovisningar...');

        // Parse OB data
        VR.prefetchParseOB();

        // Parse FP/FPV data
        VR.prefetchParseFPFPV();

        console.log('VR: OB entries:', VR.obData ? VR.obData.length : 0);
        console.log('VR: FP/FPV entries:', VR.statistikFPData ? VR.statistikFPData.length : 0);

        // SR fetches from Arbetsdag - use existing VR.srData if user visited SR page
        // Otherwise, Lön page will fetch it when needed using existing doSRTillagg logic
        VR.prefetchFetchSR();
    };

    // ===== PARSE OB DATA =====
    VR.prefetchParseOB = function() {
        if (VR.obData && VR.obData.length > 0) {
            console.log('VR: Prefetch - OB already cached');
            VR.prefetchStatus.obDone = true;
            return;
        }

        var obData = [];
        var OB_RATES = {
            'L.Hb': { name: 'Kvalificerad OB', rate: 54.69 },
            'L.Storhelgstillägg': { name: 'Storhelgs OB', rate: 122.88 }
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE' && el.tagName !== 'TR' && el.tagName !== 'TD') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';
                    var col2 = cells[1] ? cells[1].textContent.trim() : '';

                    if (col1.toLowerCase() === 'löneslag') continue;

                    if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                        var timeMatch = col2.match(/(\d+):(\d+)/);
                        var hours = 0;
                        var minutes = 0;
                        if (timeMatch) {
                            hours = parseInt(timeMatch[1], 10);
                            minutes = parseInt(timeMatch[2], 10);
                        }
                        var totalHours = hours + (minutes / 60);
                        var rate = OB_RATES[col1] ? OB_RATES[col1].rate : 0;
                        var kronor = totalHours * rate;

                        obData.push({
                            date: currentDate,
                            type: col1,
                            typeName: OB_RATES[col1] ? OB_RATES[col1].name : col1,
                            time: col2,
                            hours: totalHours,
                            rate: rate,
                            kronor: kronor
                        });
                    }
                }
            }
        }

        VR.obData = obData;
        VR.prefetchStatus.obDone = true;
        console.log('VR: Prefetch - parsed', obData.length, 'OB entries');
    };

    // ===== FETCH SR FROM ARBETSDAG PAGE =====
    // Uses same logic as vr-srtillagg.js but runs silently
    VR.prefetchFetchSR = function() {
        // Check if SR already cached (from visiting SR page)
        if (VR.srData && Object.keys(VR.srData).length > 0) {
            console.log('VR: Prefetch - SR already cached from SR page');
            VR.prefetchStatus.srDone = true;
            VR.prefetchComplete();
            return;
        }

        console.log('VR: Prefetch - fetching SR using vr-srtillagg logic...');

        // Navigate to Arbetsdag and use existing parsing functions
        VR.clickFolder();

        setTimeout(function() {
            var n = 0;
            var checkInterval = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Arbetsdag');

                if (el) {
                    clearInterval(checkInterval);
                    el.click();
                    setTimeout(VR.prefetchWaitAndParseSR, 800);
                } else if (n > 20) {
                    clearInterval(checkInterval);
                    console.log('VR: Prefetch - could not find Arbetsdag menu');
                    VR.prefetchComplete();
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR ARBETSDAG AND PARSE SR =====
    VR.prefetchWaitAndParseSR = function() {
        var n = 0;
        var checkInterval = setInterval(function() {
            n++;
            var tbl = document.querySelector('#workdays table');
            if (tbl || n > 30) {
                clearInterval(checkInterval);
                if (tbl) {
                    // Use existing SR loading logic from vr-srtillagg.js
                    VR.prefetchLoadSRSilent();
                } else {
                    console.log('VR: Prefetch - Arbetsdag page did not load');
                    VR.prefetchComplete();
                }
            }
        }, 400);
    };

    // ===== LOAD SR SILENTLY (uses existing parseSRDataSilent) =====
    VR.prefetchLoadSRSilent = function() {
        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Initialize srData if not exists
        if (!VR.srData) VR.srData = {};
        VR.srNeedsExpansion = [];

        console.log('VR: Prefetch - loading SR for', VR.MONTHS[prevMonth], 'and', VR.MONTHS[currentMonth]);

        // Use existing loadSRMonthAuto from vr-srtillagg.js
        VR.loadSRMonthAuto(prevYear, prevMonth, function() {
            setTimeout(function() {
                VR.loadSRMonthAuto(currentYear, currentMonth, function() {
                    VR.prefetchStatus.srDone = true;
                    console.log('VR: Prefetch - SR complete,', Object.keys(VR.srData).length, 'entries');
                    VR.prefetchComplete();
                });
            }, 800);
        });
    };

    // ===== PREFETCH COMPLETE =====
    VR.prefetchComplete = function() {
        VR.prefetchStatus.running = false;
        VR.prefetchStatus.done = true;

        console.log('VR: Prefetch complete!');
        console.log('VR: OB entries:', VR.obData ? VR.obData.length : 0);
        console.log('VR: SR entries:', VR.srData ? Object.keys(VR.srData).length : 0);
        console.log('VR: FP/FPV entries:', VR.statistikFPData ? VR.statistikFPData.length : 0);
    };

    // ===== PARSE FP/FPV DATA =====
    VR.prefetchParseFPFPV = function() {
        if (VR.statistikFPData && VR.statistikFPData.length > 0) {
            console.log('VR: Prefetch - FP/FPV already cached');
            VR.prefetchStatus.fpDone = true;
            return;
        }

        var fpData = [];
        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2}-\d{2}-\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    currentDate = dateMatch[1];
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                var rows = el.querySelectorAll('tr');
                for (var r = 0; r < rows.length; r++) {
                    var cells = rows[r].querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    var col1 = cells[0] ? cells[0].textContent.trim() : '';

                    var matchedType = null;
                    if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                        matchedType = 'FP';
                    } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                        matchedType = 'FPV';
                    }

                    if (matchedType) {
                        fpData.push({
                            date: currentDate,
                            type: matchedType
                        });
                    }
                }
            }
        }

        VR.statistikFPData = fpData;
        VR.prefetchStatus.fpDone = true;
        console.log('VR: Prefetch - parsed', fpData.length, 'FP/FPV entries');
    };

    console.log('VR: Prefetch loaded');
})();
