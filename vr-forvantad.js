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
        VR.forvantadData = {};
        VR.forvantadOB = {};
        VR.forvantadFP = [];

        VR.updateLoader(10, 'Hämtar FP/FPV...');
        VR.fetchForvantadFPFPV();
    };

    // ===== FETCH FP/FPV DATA =====
    VR.fetchForvantadFPFPV = function() {
        // Navigate to Löneredovisningar to get FP/FPV
        VR.navigateToLoneredovisningar(function() {
            VR.setupLonePageAndFetch(function() {
                VR.updateLoader(40, 'Analyserar FP/FPV...');
                VR.parseForvantadFPFPV();
            });
        });
    };

    // ===== PARSE FP/FPV FOR TARGET MONTH =====
    VR.parseForvantadFPFPV = function() {
        var targetMonth = VR.forvantadMonth;
        var targetYear = VR.forvantadYear;

        var FP_TYPES = {
            'S.Frånvaro: FRIDAG': 'FP',
            'S.Frånvaro: FV/FP2/FP-V': 'FPV'
        };

        var currentDate = null;
        var allElements = document.body.querySelectorAll('*');

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';

            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(Måndag|Tisdag|Onsdag|Torsdag|Fredag|Lördag|Söndag)/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) {
                    if (el.childNodes[c].nodeType === 3) {
                        directText += el.childNodes[c].textContent;
                    }
                }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    currentDate = {
                        day: parseInt(dateMatch[1], 10),
                        month: parseInt(dateMatch[2], 10) - 1,
                        year: parseInt(dateMatch[3], 10),
                        weekday: dateMatch[4]
                    };
                }
            }

            if (el.tagName === 'TABLE' && currentDate) {
                // Check if this date is in target month
                if (currentDate.month === targetMonth && currentDate.year === targetYear) {
                    var rows = el.querySelectorAll('tr');
                    for (var r = 0; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < 2) continue;

                        var col1 = cells[0] ? cells[0].textContent.trim() : '';

                        for (var typeKey in FP_TYPES) {
                            if (col1.indexOf(typeKey) > -1 || col1 === typeKey) {
                                VR.forvantadFP.push({
                                    day: currentDate.day,
                                    type: FP_TYPES[typeKey],
                                    weekday: currentDate.weekday
                                });
                                break;
                            }
                        }

                        // Also check for FRIDAG/FV variations
                        if (col1.indexOf('S.Frånvaro') > -1 && col1.indexOf('FRIDAG') > -1) {
                            var exists = VR.forvantadFP.some(function(f) { return f.day === currentDate.day; });
                            if (!exists) {
                                VR.forvantadFP.push({
                                    day: currentDate.day,
                                    type: 'FP',
                                    weekday: currentDate.weekday
                                });
                            }
                        } else if (col1.indexOf('S.Frånvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) {
                            var exists2 = VR.forvantadFP.some(function(f) { return f.day === currentDate.day; });
                            if (!exists2) {
                                VR.forvantadFP.push({
                                    day: currentDate.day,
                                    type: 'FPV',
                                    weekday: currentDate.weekday
                                });
                            }
                        }
                    }
                }
            }
        }

        VR.updateLoader(50, 'Hämtar OB-tillägg...');
        VR.fetchForvantadOB();
    };

    // ===== FETCH OB DATA =====
    VR.fetchForvantadOB = function() {
        // Go back and fetch OB data
        var el = VR.findMenuItem('Redovisningar');
        if (el) {
            el.click();
            setTimeout(VR.waitForOBPage, 500);
            return;
        }

        VR.clickFolder();
        setTimeout(function() {
            var el2 = VR.findMenuItem('Redovisningar');
            if (el2) {
                el2.click();
                setTimeout(VR.waitForOBPage, 500);
            } else {
                VR.updateLoader(0, 'Kunde ej hitta meny');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 600);
    };

    VR.waitForOBPage = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            var balances = document.getElementById('CrewBalances');
            if (balances) {
                VR.stopTimer();
                VR.selectOBForForvantad();
            } else if (n > 25) {
                VR.stopTimer();
                VR.renderForvantad(); // Continue without OB if timeout
            }
        }, 300);
    };

    VR.selectOBForForvantad = function() {
        VR.updateLoader(55, 'Väljer OB-tillägg...');

        var listbox = null;
        var all = document.getElementsByTagName('*');
        for (var i = 0; i < all.length; i++) {
            var tag = all[i].tagName || '';
            if (tag.toLowerCase().indexOf('listbox') > -1) {
                listbox = all[i];
                break;
            }
        }

        if (!listbox) {
            VR.renderForvantad();
            return;
        }

        // Check if already on OB (value = 1)
        if (listbox.getAttribute('value') === '1') {
            VR.afterOBSelectedForForvantad();
            return;
        }

        var dropBtn = listbox.querySelector('.dropdlgbutton');
        if (dropBtn) {
            dropBtn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            dropBtn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
        }

        setTimeout(function() {
            var found = null;
            var allEls = document.body.getElementsByTagName('*');
            for (var i = 0; i < allEls.length; i++) {
                var el = allEls[i];
                var txt = '';
                for (var j = 0; j < el.childNodes.length; j++) {
                    if (el.childNodes[j].nodeType === 3) {
                        txt += el.childNodes[j].textContent;
                    }
                }
                if (txt.trim() === 'OB-Tillägg') {
                    var rect = el.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0 && !listbox.contains(el)) {
                        found = el;
                        break;
                    }
                }
            }

            if (found) {
                found.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
                found.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true }));
                found.click();
                setTimeout(VR.afterOBSelectedForForvantad, 600);
            } else {
                VR.renderForvantad();
            }
        }, 400);
    };

    VR.afterOBSelectedForForvantad = function() {
        VR.updateLoader(60, 'Sätter datum för OB...');

        var target = { month: VR.forvantadMonth, year: VR.forvantadYear };

        // Set date range for target month
        var firstDay = '01-' + ('0' + (target.month + 1)).slice(-2) + '-' + target.year;
        var lastDay = new Date(target.year, target.month + 1, 0).getDate();
        var lastDayStr = lastDay + '-' + ('0' + (target.month + 1)).slice(-2) + '-' + target.year;

        var inputs = document.querySelectorAll('#CrewBalances input[type="text"]');
        if (inputs.length >= 2) {
            inputs[0].value = firstDay;
            inputs[0].dispatchEvent(new Event('change', { bubbles: true }));
            inputs[1].value = lastDayStr;
            inputs[1].dispatchEvent(new Event('change', { bubbles: true }));
        }

        setTimeout(function() {
            VR.updateLoader(65, 'Hämtar OB-data...');
            VR.clickFetch();
            VR.pollForOBDataForForvantad();
        }, 400);
    };

    VR.pollForOBDataForForvantad = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(65 + n, 'Laddar OB...');

            var tbl = document.querySelector('#CrewBalances table');
            var rows = tbl ? tbl.querySelectorAll('tr').length : 0;

            if (rows > 2 || n > 30) {
                VR.stopTimer();
                VR.parseOBForForvantad();
            }
        }, 300);
    };

    VR.parseOBForForvantad = function() {
        VR.updateLoader(85, 'Analyserar OB...');

        var tbl = document.querySelector('#CrewBalances table');
        if (!tbl) {
            VR.renderForvantad();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var targetMonth = VR.forvantadMonth;
        var targetYear = VR.forvantadYear;

        for (var i = 1; i < rows.length; i++) {
            var cells = rows[i].querySelectorAll('td');
            if (cells.length < 3) continue;

            var dateStr = cells[0] ? cells[0].textContent.trim() : '';
            var saldo = cells[2] ? cells[2].textContent.trim() : '';

            // Parse date DD-MM-YYYY
            var dateParts = dateStr.match(/(\d{1,2})-(\d{2})-(\d{4})/);
            if (dateParts) {
                var day = parseInt(dateParts[1], 10);
                var month = parseInt(dateParts[2], 10) - 1;
                var year = parseInt(dateParts[3], 10);

                if (month === targetMonth && year === targetYear) {
                    // Parse saldo (format: H:MM or HH:MM)
                    var timeParts = saldo.match(/(-?)(\d+):(\d{2})/);
                    if (timeParts) {
                        var hours = parseInt(timeParts[2], 10);
                        var minutes = parseInt(timeParts[3], 10);
                        var totalMinutes = hours * 60 + minutes;

                        VR.forvantadOB[day] = {
                            saldo: saldo,
                            minutes: totalMinutes
                        };
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

        // Build day data
        var days = [];
        var totalWorkDays = 0;
        var totalFreeDays = 0;
        var totalEstimatedHours = 0;

        for (var d = 1; d <= daysInMonth; d++) {
            var date = new Date(target.year, target.month, d);
            var weekday = date.getDay(); // 0=Sun, 6=Sat
            var isWeekend = (weekday === 0 || weekday === 6);
            var weekdayName = weekdayNames[weekday];

            // Check if FP/FPV
            var fpEntry = VR.forvantadFP.find(function(f) { return f.day === d; });
            var obEntry = VR.forvantadOB[d];

            var dayData = {
                day: d,
                weekday: weekdayName,
                isWeekend: isWeekend,
                isFree: !!fpEntry,
                freeType: fpEntry ? fpEntry.type : null,
                hasOB: !!obEntry,
                obMinutes: obEntry ? obEntry.minutes : 0,
                obSaldo: obEntry ? obEntry.saldo : null,
                startTime: null,
                endTime: null,
                duration: null
            };

            if (fpEntry) {
                // Free day
                totalFreeDays++;
            } else if (isWeekend && obEntry) {
                // Weekend with OB: duration = OB + 1h
                dayData.duration = obEntry.minutes + 60;
                totalWorkDays++;
                totalEstimatedHours += dayData.duration / 60;
            } else if (!isWeekend && obEntry) {
                // Weekday with OB: start = 06:00 - OB, end = start + 8h
                var startMinutes = 6 * 60 - obEntry.minutes; // 06:00 in minutes minus OB
                var endMinutes = startMinutes + 8 * 60; // +8 hours

                dayData.startTime = VR.minutesToTime(startMinutes);
                dayData.endTime = VR.minutesToTime(endMinutes);
                dayData.duration = 8 * 60;
                totalWorkDays++;
                totalEstimatedHours += 8;
            } else if (!isWeekend && !obEntry && !fpEntry) {
                // Weekday without OB: standard 06:00-16:00
                dayData.startTime = '06:00';
                dayData.endTime = '16:00';
                dayData.duration = 10 * 60;
                totalWorkDays++;
                totalEstimatedHours += 10;
            }

            days.push(dayData);
        }

        // Build HTML
        var html = VR.buildForvantadHeader(monthNames[target.month], target.year, totalWorkDays, totalFreeDays, totalEstimatedHours);
        html += VR.buildForvantadRows(days);

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
    VR.buildForvantadHeader = function(monthName, year, workDays, freeDays, hours) {
        return '\
<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">\
<div style="background:#fff;border-radius:16px;padding:14px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Arbetsdagar</div>\
<div style="font-size:28px;font-weight:700;color:#007AFF">' + workDays + '</div>\
</div>\
<div style="background:#fff;border-radius:16px;padding:14px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">Fridagar</div>\
<div style="font-size:28px;font-weight:700;color:#34C759">' + freeDays + '</div>\
</div>\
<div style="background:#fff;border-radius:16px;padding:14px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:11px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">~Timmar</div>\
<div style="font-size:28px;font-weight:700;color:#FF9500">' + Math.round(hours) + '</div>\
</div>\
</div>\
<div style="background:#fff;border-radius:16px;padding:12px 16px;margin-bottom:12px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">\
<div style="font-size:20px;font-weight:700;color:#333">' + monthName + ' ' + year + '</div>\
<div style="font-size:13px;color:#8E8E93;margin-top:2px">Förväntat schema (ej officiellt)</div>\
</div>';
    };

    // ===== BUILD ROWS =====
    VR.buildForvantadRows = function(days) {
        var html = '\
<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">\
<div style="display:grid;grid-template-columns:70px 1fr 100px;gap:8px;padding:16px 20px;background:#1C1C1E">\
<div style="font-size:14px;font-weight:600;color:#fff">Dag</div>\
<div style="font-size:14px;font-weight:600;color:#fff">Tidslinje (03-18)</div>\
<div style="font-size:14px;font-weight:600;color:#fff;text-align:right">Tid</div>\
</div>';

        // Timeline constants (03:00 to 18:00 = 15 hours = 900 minutes)
        var timelineStart = 3 * 60; // 03:00
        var timelineEnd = 18 * 60;  // 18:00
        var timelineRange = timelineEnd - timelineStart;

        for (var i = 0; i < days.length; i++) {
            var day = days[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';
            var weekendBg = day.isWeekend ? 'rgba(255,149,0,0.05)' : '';

            html += '<div style="display:grid;grid-template-columns:70px 1fr 100px;gap:8px;padding:14px 20px;background:' + (weekendBg || bgCol) + ';border-bottom:1px solid #E5E5EA;align-items:center">';

            // Day column
            var dayColor = day.isWeekend ? '#FF9500' : '#333';
            html += '<div style="font-size:15px;font-weight:600;color:' + dayColor + '">' + day.weekday + ' ' + day.day + '</div>';

            // Timeline column
            html += '<div style="position:relative;height:24px;background:#E5E5EA;border-radius:6px;overflow:hidden">';

            if (day.isFree) {
                // Free day - full green/blue bar
                var freeColor = day.freeType === 'FP' ? '#34C759' : '#007AFF';
                html += '<div style="position:absolute;left:0;right:0;top:0;bottom:0;background:' + freeColor + ';display:flex;align-items:center;justify-content:center">';
                html += '<span style="font-size:12px;font-weight:600;color:#fff">' + day.freeType + '</span>';
                html += '</div>';
            } else if (day.isWeekend && day.hasOB) {
                // Weekend - centered bar (unknown start), show duration
                var durationPercent = Math.min(100, (day.duration / timelineRange) * 100);
                var leftPos = (100 - durationPercent) / 2; // Center it
                html += '<div style="position:absolute;left:' + leftPos + '%;width:' + durationPercent + '%;top:2px;bottom:2px;background:linear-gradient(90deg,#FF9500,#FF6B00);border-radius:4px;opacity:0.8"></div>';
            } else if (day.startTime && day.endTime) {
                // Weekday with known times
                var startParts = day.startTime.split(':');
                var endParts = day.endTime.split(':');
                var startMin = parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
                var endMin = parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);

                // Clamp to timeline range
                startMin = Math.max(timelineStart, Math.min(timelineEnd, startMin));
                endMin = Math.max(timelineStart, Math.min(timelineEnd, endMin));

                var leftPercent = ((startMin - timelineStart) / timelineRange) * 100;
                var widthPercent = ((endMin - startMin) / timelineRange) * 100;

                html += '<div style="position:absolute;left:' + leftPercent + '%;width:' + widthPercent + '%;top:2px;bottom:2px;background:linear-gradient(90deg,#007AFF,#5856D6);border-radius:4px"></div>';
            }

            // Time markers
            html += '<div style="position:absolute;left:0;right:0;top:0;bottom:0;display:flex;justify-content:space-between;align-items:center;padding:0 4px;pointer-events:none">';
            html += '<span style="font-size:9px;color:#8E8E93">03</span>';
            html += '<span style="font-size:9px;color:#8E8E93">06</span>';
            html += '<span style="font-size:9px;color:#8E8E93">09</span>';
            html += '<span style="font-size:9px;color:#8E8E93">12</span>';
            html += '<span style="font-size:9px;color:#8E8E93">15</span>';
            html += '<span style="font-size:9px;color:#8E8E93">18</span>';
            html += '</div>';

            html += '</div>';

            // Time/info column
            if (day.isFree) {
                var freeCol = day.freeType === 'FP' ? '#34C759' : '#007AFF';
                html += '<div style="font-size:13px;font-weight:600;color:' + freeCol + ';text-align:right">Ledig</div>';
            } else if (day.isWeekend && day.hasOB) {
                var hrs = Math.floor(day.duration / 60);
                var mins = day.duration % 60;
                html += '<div style="font-size:13px;color:#FF9500;text-align:right">~' + hrs + 'h' + (mins > 0 ? mins + 'm' : '') + '</div>';
            } else if (day.startTime && day.endTime) {
                html += '<div style="font-size:13px;color:#007AFF;text-align:right">' + day.startTime + '-' + day.endTime + '</div>';
            } else {
                html += '<div style="font-size:13px;color:#CCC;text-align:right">—</div>';
            }

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    console.log('VR: Förväntat loaded');
})();
