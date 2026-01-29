// VR CrewWeb - Förväntat Schema
(function() {
    'use strict';

    var VR = window.VR;

    // ===== DETERMINE NEXT UNRELEASED MONTH =====
    VR.getNextUnreleasedMonth = function() {
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth();
        var year = today.getFullYear();

        // If before 16th, next month is unreleased
        // If 16th or after, month after next is unreleased
        if (day < 16) {
            month += 1;
        } else {
            month += 2;
        }

        // Handle year overflow
        if (month > 11) {
            month -= 12;
            year += 1;
        }

        return { month: month, year: year };
    };

    // ===== MAIN FUNCTION =====
    VR.doForvantad = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Förväntat Schema');
        VR.updateLoader(5, 'Beräknar månad...');

        var target = VR.getNextUnreleasedMonth();
        VR.forvantadMonth = target.month;
        VR.forvantadYear = target.year;
        VR.forvantadFP = [];
        VR.forvantadOB = {};

        VR.updateLoader(10, 'Navigerar...');
        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(VR.parseForvantadData);
        });
    };

    // ===== PARSE BOTH FP/FPV AND OB FROM LÖNEREDOVISNINGAR =====
    VR.parseForvantadData = function() {
        VR.updateLoader(80, 'Analyserar data...');

        var targetMonth = VR.forvantadMonth;
        var targetYear = VR.forvantadYear;

        var currentDate = null;
        var currentDateParsed = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            // Match date headers
            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    currentDateParsed = {
                        day: parseInt(dateMatch[1], 10),
                        month: parseInt(dateMatch[2], 10) - 1,
                        year: parseInt(dateMatch[3], 10),
                        weekday: dateMatch[4]
                    };
                    currentDate = dateMatch[1] + '-' + dateMatch[2] + '-' + dateMatch[3];
                }
            }

            // Parse table data
            if (el.tagName === 'TABLE' && currentDateParsed) {
                // Only process if in target month
                if (currentDateParsed.month === targetMonth && currentDateParsed.year === targetYear) {
                    var rows = el.querySelectorAll('tr');
                    for (var r = 0; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < 2) continue;

                        var col1 = cells[0] ? cells[0].textContent.trim() : '';
                        var col2 = cells[1] ? cells[1].textContent.trim() : '';

                        if (col1.toLowerCase() === 'löneslag') continue;

                        // Check for FP/FPV
                        if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            var exists = VR.forvantadFP.some(function(f) { return f.day === currentDateParsed.day; });
                            if (!exists) {
                                VR.forvantadFP.push({
                                    day: currentDateParsed.day,
                                    type: 'FP',
                                    weekday: currentDateParsed.weekday
                                });
                            }
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            var exists2 = VR.forvantadFP.some(function(f) { return f.day === currentDateParsed.day; });
                            if (!exists2) {
                                VR.forvantadFP.push({
                                    day: currentDateParsed.day,
                                    type: 'FPV',
                                    weekday: currentDateParsed.weekday
                                });
                            }
                        }

                        // Check for OB (L.Hb or L.Storhelgstillägg)
                        if (col1 === 'L.Hb' || col1 === 'L.Storhelgstillägg') {
                            var timeMatch = col2.match(/(\d+):(\d+)/);
                            if (timeMatch) {
                                var hours = parseInt(timeMatch[1], 10);
                                var minutes = parseInt(timeMatch[2], 10);
                                var totalMinutes = hours * 60 + minutes;

                                // Add to existing or create new
                                if (!VR.forvantadOB[currentDateParsed.day]) {
                                    VR.forvantadOB[currentDateParsed.day] = {
                                        minutes: 0,
                                        saldo: ''
                                    };
                                }
                                VR.forvantadOB[currentDateParsed.day].minutes += totalMinutes;
                                VR.forvantadOB[currentDateParsed.day].saldo = col2;
                            }
                        }
                    }
                }
            }
        }

        VR.updateLoader(95, 'Bygger vy...');
        setTimeout(VR.renderForvantad, 300);
    };

    // ===== RENDER FORVANTAD SCHEMA =====
    VR.renderForvantad = function() {
        var target = { month: VR.forvantadMonth, year: VR.forvantadYear };
        var daysInMonth = new Date(target.year, target.month + 1, 0).getDate();

        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni',
                          'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        var weekdayNames = ['Sön', 'Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör'];

        // Calculate days from today
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build day data
        var days = [];

        for (var d = 1; d <= daysInMonth; d++) {
            var date = new Date(target.year, target.month, d);
            var weekday = date.getDay(); // 0=Sun, 6=Sat
            var isWeekend = (weekday === 0 || weekday === 6);
            var weekdayName = weekdayNames[weekday];

            // Calculate days from today
            var daysFromToday = Math.floor((date - today) / (1000 * 60 * 60 * 24));
            var isBeyond52 = daysFromToday > 52;

            // Check if FP/FPV
            var fpEntry = VR.forvantadFP.find(function(f) { return f.day === d; });
            var obEntry = VR.forvantadOB[d];

            var dayData = {
                day: d,
                weekday: weekdayName,
                isWeekend: isWeekend,
                isFree: false,
                freeType: null,
                hasOB: false,
                obMinutes: 0,
                obSaldo: null,
                startTime: null,
                endTime: null,
                duration: null,
                isKommande: isBeyond52
            };

            // Only process if within 52 days
            if (!isBeyond52) {
                if (fpEntry) {
                    // Free day
                    dayData.isFree = true;
                    dayData.freeType = fpEntry.type;
                } else if (isWeekend && obEntry) {
                    // Weekend with OB: duration = OB + 1h
                    dayData.hasOB = true;
                    dayData.obMinutes = obEntry.minutes;
                    dayData.duration = obEntry.minutes + 60;
                } else if (!isWeekend && obEntry) {
                    // Weekday with OB: start = 06:00 - OB, end = start + 8h
                    dayData.hasOB = true;
                    dayData.obMinutes = obEntry.minutes;
                    var startMinutes = 6 * 60 - obEntry.minutes;
                    var endMinutes = startMinutes + 8 * 60;
                    dayData.startTime = VR.minutesToTime(startMinutes);
                    dayData.endTime = VR.minutesToTime(endMinutes);
                    dayData.duration = 8 * 60;
                } else if (!isWeekend) {
                    // Weekday without OB: standard 06:00-16:00
                    dayData.startTime = '06:00';
                    dayData.endTime = '16:00';
                    dayData.duration = 10 * 60;
                } else {
                    // Weekend without OB - should have OB, mark as kommande
                    dayData.isKommande = true;
                }
            }

            days.push(dayData);
        }

        // Build HTML
        var html = VR.buildForvantadHeader(monthNames[target.month], target.year);
        html += VR.buildForvantadRows(days, target.month, target.year);

        VR.hideLoader();
        VR.showView('', '', html);
    };

    // ===== HELPER: MINUTES TO TIME =====
    VR.minutesToTime = function(minutes) {
        if (minutes < 0) minutes += 24 * 60; // Handle negative (before midnight)
        var h = Math.floor(minutes / 60) % 24;
        var m = minutes % 60;
        return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
    };

    // ===== BUILD HEADER =====
    VR.buildForvantadHeader = function(monthName, year) {
        return '\
<div style="background:#fff;border-radius:16px;padding:14px 20px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:22px;font-weight:700;color:#333">' + monthName + ' ' + year + '</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:4px">Förväntat schema (ej officiellt)</div>\
</div>';
    };

    // ===== BUILD ROWS =====
    VR.buildForvantadRows = function(days, month, year) {
        var html = '\
<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
<div style="display:grid;grid-template-columns:1.3fr 0.8fr 0.8fr 0.7fr 1fr;gap:8px;padding:16px 20px;background:#1C1C1E">\
<div style="font-size:14px;font-weight:600;color:#fff">Datum</div>\
<div style="font-size:14px;font-weight:600;color:#fff">Start</div>\
<div style="font-size:14px;font-weight:600;color:#fff">Slut</div>\
<div style="font-size:14px;font-weight:600;color:#fff">Längd</div>\
<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Förväntning</div>\
</div>';

        // Format month for display (1-indexed, zero-padded)
        var monthStr = ('0' + (month + 1)).slice(-2);

        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';
            var weekendBg = day.isWeekend ? 'rgba(255,149,0,0.05)' : '';

            // Use isKommande flag from render logic
            var isKommande = day.isKommande;

            // Use gray background for kommande days
            var rowBg = isKommande ? '#E8E8E8' : (weekendBg || bgCol);

            html += '<div style="display:grid;grid-template-columns:1.3fr 0.8fr 0.8fr 0.7fr 1fr;gap:8px;padding:14px 20px;background:' + rowBg + ';border-bottom:1px solid #E5E5EA;align-items:center">';

            // Datum column - format: DD-MM-YYYY
            var dayStr = ('0' + day.day).slice(-2);
            var dateStr = dayStr + '-' + monthStr + '-' + year;
            var dayColor = isKommande ? '#999' : (day.isWeekend ? '#FF9500' : '#333');
            html += '<div style="font-size:15px;font-weight:600;color:' + dayColor + '">' + dateStr + '</div>';

            // Determine values and colors based on type
            var startVal = '—';
            var slutVal = '—';
            var langdVal = '—';
            var forvantning = '';
            var forvColor = '#999';

            if (isKommande) {
                forvantning = 'Kommande';
                forvColor = '#999';
            } else if (day.isFree) {
                forvantning = 'Ledig';
                forvColor = '#34C759';
            } else if (day.isWeekend && day.hasOB) {
                // Weekend with OB - only have length
                startVal = '?';
                slutVal = '?';
                var hrs = Math.floor(day.duration / 60);
                var mins = day.duration % 60;
                langdVal = '~' + hrs + 'h' + (mins > 0 ? mins + 'm' : '');
                forvantning = 'Längd';
                forvColor = '#FF9500';
            } else if (day.hasOB && day.startTime) {
                // Weekday with OB - have start time
                startVal = day.startTime;
                slutVal = day.endTime;
                langdVal = '8h';
                forvantning = 'Starttid';
                forvColor = '#007AFF';
            } else if (day.startTime && day.endTime) {
                // Weekday without OB - ramtid
                startVal = '06:00';
                slutVal = '16:00';
                langdVal = '10h';
                forvantning = 'Ramtid';
                forvColor = '#666';
            }

            // Starttid column
            html += '<div style="font-size:15px;color:' + (startVal === '?' || startVal === '—' ? '#999' : '#333') + '">' + startVal + '</div>';

            // Sluttid column
            html += '<div style="font-size:15px;color:' + (slutVal === '?' || slutVal === '—' ? '#999' : '#333') + '">' + slutVal + '</div>';

            // Längd column
            html += '<div style="font-size:15px;color:' + (langdVal === '—' ? '#999' : '#333') + '">' + langdVal + '</div>';

            // Förväntning column
            html += '<div style="font-size:15px;font-weight:600;color:' + forvColor + ';text-align:right">' + forvantning + '</div>';

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    console.log('VR: Förväntat loaded');
})();
