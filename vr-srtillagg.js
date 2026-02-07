// VR CrewWeb - SR-Tillägg (Danmark-tillägg)
(function() {
    'use strict';

    var VR = window.VR;

    // Storage for SR data (unique per date)
    VR.srData = {};

    // Detected rate from first Danmark tour (persists across loads)
    VR.detectedSRRate = null;

    // ===== MAIN SR-TILLÄGG FUNCTION =====
    VR.doSRTillagg = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.showLoader('Laddar SR-Tillägg');
        VR.updateLoader(5, 'Letar efter sidan...');

        // Clear old data
        VR.srData = {};

        // Check if already on workdays page
        var tbl = document.querySelector('#workdays table');
        if (tbl) {
            VR.updateLoader(10, 'Sidan redan laddad...');
            VR.loadBothMonths();
            return;
        }

        // Navigate to Arbetsdag
        VR.updateLoader(10, 'Öppnar meny...');
        VR.clickFolder();

        setTimeout(function() {
            VR.updateLoader(15, 'Letar efter Arbetsdag...');
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Arbetsdag');
                if (el) {
                    VR.stopTimer();
                    VR.updateLoader(20, 'Klickar på Arbetsdag...');
                    el.click();
                    VR.waitForSRPage();
                } else if (n > 20) {
                    VR.stopTimer();
                    VR.updateLoader(0, 'Timeout');
                    setTimeout(VR.hideLoader, 2000);
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR PAGE =====
    VR.waitForSRPage = function() {
        var n = 0;
        VR.timer = setInterval(function() {
            n++;
            VR.updateLoader(25 + n, 'Väntar på sidan...');

            var tbl = document.querySelector('#workdays table');
            if (tbl) {
                VR.stopTimer();
                VR.updateLoader(30, 'Sidan laddad!');
                setTimeout(VR.loadBothMonths, 400);
            } else if (n > 30) {
                VR.stopTimer();
                VR.updateLoader(0, 'Sidan laddades ej');
                setTimeout(VR.hideLoader, 2000);
            }
        }, 400);
    };

    // ===== LOAD BOTH MONTHS AUTOMATICALLY =====
    // Optional callback: if provided, call it instead of showing SR view
    VR.loadBothMonths = function(callback) {
        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        // Clear expansion list
        VR.srNeedsExpansion = [];

        // Load previous month first, then current month
        VR.updateLoader(35, 'Laddar ' + VR.MONTHS[prevMonth] + '...');
        VR.loadSRMonthAuto(prevYear, prevMonth, function() {
            // Wait a bit longer before loading next month (helps on mobile)
            VR.updateLoader(60, 'Förbereder ' + VR.MONTHS[currentMonth] + '...');
            setTimeout(function() {
                VR.updateLoader(65, 'Laddar ' + VR.MONTHS[currentMonth] + '...');
                VR.loadSRMonthAuto(currentYear, currentMonth, function() {
                    // Both months parsed, now expand TP days to check for DK.KK
                    var toExpandCount = VR.srNeedsExpansion ? VR.srNeedsExpansion.length : 0;
                    if (toExpandCount > 0) {
                        VR.updateLoader(75, 'Expanderar ' + toExpandCount + ' dagar...');
                        VR.expandTPDays(function() {
                            var count = VR.getSRDataArray().length;
                            if (callback) {
                                callback();
                            } else {
                                VR.updateLoader(100, 'Klar! ' + count + ' Danmark-dagar');
                                setTimeout(function() {
                                    VR.hideLoader();
                                    VR.showSRView();
                                }, 400);
                            }
                        });
                    } else {
                        var count = VR.getSRDataArray().length;
                        if (callback) {
                            callback();
                        } else {
                            VR.updateLoader(100, 'Klar! ' + count + ' Danmark-dagar');
                            setTimeout(function() {
                                VR.hideLoader();
                                VR.showSRView();
                            }, 400);
                        }
                    }
                });
            }, 800); // Longer delay between months for mobile
        });
    };

    // ===== LOAD SINGLE MONTH (with callback) =====
    VR.loadSRMonthAuto = function(year, month, callback) {
        var d1 = '01-' + ('0' + (month + 1)).slice(-2) + '-' + year;
        var lastDay = new Date(year, month + 1, 0).getDate();
        var d2 = lastDay + '-' + ('0' + (month + 1)).slice(-2) + '-' + year;

        // Store expected month string for detection
        var expectedMonth = ('0' + (month + 1)).slice(-2);

        VR.setDates(d1, d2);
        VR.clickFetch();

        VR.srLoadingYear = year;
        VR.srLoadingMonth = month;

        // Wait a moment for the fetch to start, then poll for data
        setTimeout(function() {
            var n = 0;
            var maxTries = 50; // ~20 seconds max wait (increased for mobile)

            VR.timer = setInterval(function() {
                n++;
                var rows = document.querySelectorAll('#workdays table tr');

                // Check if we have data for our target month
                var hasTargetMonthData = false;
                if (rows.length > 5) {
                    // Check if any row contains target month's date
                    for (var r = 1; r < Math.min(rows.length, 15); r++) {
                        var cells = rows[r].querySelectorAll('td');
                        if (cells.length > 2) {
                            var dt = cells[2] ? cells[2].textContent.trim() : '';
                            if (dt && dt.indexOf('-' + expectedMonth + '-' + year) > -1) {
                                hasTargetMonthData = true;
                                break;
                            }
                        }
                    }
                }

                if (hasTargetMonthData || n > maxTries) {
                    VR.stopTimer();
                    VR.parseSRDataSilent();
                    setTimeout(callback, 300);
                }
            }, 400);
        }, 500); // Initial delay to let fetch start
    };

    // ===== PARSE SR DATA (silent, no loader updates) =====
    VR.parseSRDataSilent = function() {
        var tbl = document.querySelector('#workdays table');
        if (!tbl) return;

        var rows = tbl.querySelectorAll('tr');
        var year = VR.srLoadingYear;
        var month = VR.srLoadingMonth;
        var targetMonth = month + 1; // 1-indexed (1-12)
        var currentDate = '';
        var dayEntries = {};

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) {
                // Check if this date belongs to the month we're loading
                var parts = dt.split('-');
                if (parts.length === 3) {
                    var dtMonth = parseInt(parts[1], 10);
                    var dtYear = parseInt(parts[2], 10);
                    if (dtMonth === targetMonth && dtYear === year) {
                        currentDate = dt;
                    } else {
                        currentDate = ''; // Not our month, skip
                    }
                }
            }
            if (!currentDate) continue;

            var en = {
                tn: c[3] ? c[3].textContent.trim() : '',
                sP: c[4] ? c[4].textContent.trim() : '',
                eP: c[5] ? c[5].textContent.trim() : '',
                isHeader: dt && dt.indexOf('-') > -1
            };

            if (!dayEntries[currentDate]) dayEntries[currentDate] = [];
            dayEntries[currentDate].push(en);
        }

        // Regex to detect NNNNNN-NNNNNN pattern (Tågplan references, not real tour numbers)
        var tpPattern = /^\d{6}-\d{6}/;

        for (var dateKey in dayEntries) {
            if (!dayEntries.hasOwnProperty(dateKey)) continue;

            var entries = dayEntries[dateKey];
            var hasDenmark = false;
            var tourNumber = '';

            for (var j = 0; j < entries.length; j++) {
                var entry = entries[j];
                var tn = entry.tn;

                if (entry.isHeader && tn) tourNumber = tn;

                // Check if this is a real tour number (not NNNNNN-NNNNNN pattern)
                var isRealTourNumber = tn && tn.length >= 4 && !tpPattern.test(tn);

                if (isRealTourNumber) {
                    var c3 = tn.charAt(2);
                    var c4 = tn.charAt(3);
                    // Skip if 4th char is 8 or 9 (Reserv - no SR-tillägg)
                    if (c4 === '8' || c4 === '9') continue;

                    if (c3 === '2' || c3 === '4') {
                        hasDenmark = true;
                        tourNumber = tn;
                        if (!VR.detectedSRRate) {
                            VR.detectedSRRate = (c3 === '2') ? 75 : 50;
                            VR.userRole = (c3 === '2') ? 'Lokförare' : 'Tågvärd';
                        }
                        break;
                    }
                }

                // Always check DK.K (works for both real tour numbers and TP references)
                var sP = (entry.sP || '').toUpperCase();
                var eP = (entry.eP || '').toUpperCase();
                if (sP.indexOf('DK.K') > -1 || eP.indexOf('DK.K') > -1) {
                    hasDenmark = true;
                    if (!tourNumber && entry.isHeader) tourNumber = tn;
                }
            }

            if (hasDenmark && !VR.srData[dateKey]) {
                var parts = dateKey.split('-');
                var day = parseInt(parts[0]);
                var dateObj = new Date(year, month, day);
                var wd = VR.WEEKDAYS_SHORT[dateObj.getDay()];

                VR.srData[dateKey] = {
                    date: dateKey,
                    dateStr: day + ' ' + VR.MONTHS_SHORT[month] + ' ' + wd,
                    day: day,
                    month: month,
                    year: year,
                    tur: tourNumber || 'Ändrad Reserv',
                    source: 'auto'
                };
            }

            // If NNNNNN-NNNNNN pattern and no Denmark found yet, mark for expansion
            if (!hasDenmark && tourNumber && tpPattern.test(tourNumber)) {
                if (!VR.srNeedsExpansion) VR.srNeedsExpansion = [];
                VR.srNeedsExpansion.push({
                    dateKey: dateKey,
                    tourNumber: tourNumber,
                    month: month,
                    year: year
                });
            }
        }
    };

    // ===== EXPAND AND CHECK FOR DK.KK =====
    VR.expandTPDays = function(callback) {
        if (!VR.srNeedsExpansion || VR.srNeedsExpansion.length === 0) {
            callback();
            return;
        }

        var toExpand = VR.srNeedsExpansion.slice(); // Copy array
        VR.srNeedsExpansion = [];
        var index = 0;

        function expandNext() {
            if (index >= toExpand.length) {
                callback();
                return;
            }

            var item = toExpand[index];
            VR.updateLoader(75 + Math.floor((index / toExpand.length) * 20),
                'Kollar ' + item.dateKey + '...');

            VR.expandAndCheckDate(item, function() {
                index++;
                setTimeout(expandNext, 300);
            });
        }

        expandNext();
    };

    // ===== EXPAND SINGLE DATE AND CHECK =====
    VR.expandAndCheckDate = function(item, callback) {
        var tbl = document.querySelector('#workdays table');
        if (!tbl) {
            callback();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var expandBtn = null;

        // Find the row with this date and click expand
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 3) continue;
            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt === item.dateKey) {
                expandBtn = rows[i].querySelector('button.ExpandRoot');
                break;
            }
        }

        if (!expandBtn) {
            callback();
            return;
        }

        // Click expand
        expandBtn.click();

        // Wait for expansion and check for DK.KK
        setTimeout(function() {
            VR.checkExpandedForDKKK(item, callback);
        }, 800);
    };

    // ===== CHECK EXPANDED CONTENT FOR DK.KK =====
    VR.checkExpandedForDKKK = function(item, callback) {
        var tbl = document.querySelector('#workdays table');
        if (!tbl) {
            callback();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var inTargetDate = false;
        var foundDKKK = false;

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 3) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) {
                inTargetDate = (dt === item.dateKey);
            }

            if (inTargetDate && c.length >= 6) {
                var sP = (c[4] ? c[4].textContent.trim() : '').toUpperCase();
                var eP = (c[5] ? c[5].textContent.trim() : '').toUpperCase();

                if (sP.indexOf('DK.K') > -1 || eP.indexOf('DK.K') > -1) {
                    foundDKKK = true;
                    break;
                }
            }
        }

        if (foundDKKK && !VR.srData[item.dateKey]) {
            var parts = item.dateKey.split('-');
            var day = parseInt(parts[0]);
            var dateObj = new Date(item.year, item.month, day);
            var wd = VR.WEEKDAYS_SHORT[dateObj.getDay()];

            VR.srData[item.dateKey] = {
                date: item.dateKey,
                dateStr: day + ' ' + VR.MONTHS_SHORT[item.month] + ' ' + wd,
                day: day,
                month: item.month,
                year: item.year,
                tur: item.tourNumber,
                source: 'expanded'
            };
        }

        callback();
    };

    // ===== GET SR DATA AS ARRAY =====
    VR.getSRDataArray = function() {
        var arr = [];
        for (var key in VR.srData) {
            if (VR.srData.hasOwnProperty(key)) {
                arr.push(VR.srData[key]);
            }
        }
        return arr;
    };

    // ===== SHOW SR VIEW =====
    VR.showSRView = function() {
        VR.hideLoader();

        var now = new Date();
        var currentMonth = now.getMonth();
        var currentYear = now.getFullYear();
        var prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        var prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

        var monthNames = VR.MONTHS;
        var rate = VR.detectedSRRate || 0;

        // Get stored data for display
        var allData = VR.getSRDataArray();
        var prevMonthData = allData.filter(function(d) {
            return d.month === prevMonth && d.year === prevYear;
        });
        var currentMonthData = allData.filter(function(d) {
            return d.month === currentMonth && d.year === currentYear;
        });

        var prevTotal = prevMonthData.length * rate;
        var currentTotal = currentMonthData.length * rate;

        var html = '';

        // Summary boxes (like OB)
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';

        html += '<div style="background:#fff;border-radius:16px;padding:18px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:36px;margin-bottom:6px">🇩🇰</div>';
        html += '<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' + monthNames[prevMonth] + '</div>';
        html += '<div style="font-size:28px;color:#666;margin-bottom:4px">' + prevMonthData.length + ' dagar</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#333">' + prevTotal + ' kr</div>';
        html += '</div>';

        html += '<div style="background:#fff;border-radius:16px;padding:18px;text-align:center;box-shadow:0 3px 10px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:36px;margin-bottom:6px">🇩🇰</div>';
        html += '<div style="font-size:24px;font-weight:600;color:#8E8E93;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px">' + monthNames[currentMonth] + '</div>';
        html += '<div style="font-size:28px;color:#666;margin-bottom:4px">' + currentMonthData.length + ' dagar</div>';
        html += '<div style="font-size:48px;font-weight:700;color:#C41E3A">' + currentTotal + ' kr</div>';
        html += '</div>';

        html += '</div>';

        // Data table
        if (allData.length > 0) {
            html += VR.buildSRTable();
        } else {
            html += '<div style="background:#fff;border-radius:20px;padding:40px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,0.08)">';
            html += '<div style="font-size:48px;margin-bottom:16px">🇩🇰</div>';
            html += '<div style="font-size:18px;color:#666">Klicka på knapparna ovan för att ladda SR-Tillägg</div>';
            if (VR.detectedSRRate) {
                html += '<div style="font-size:14px;color:#999;margin-top:8px">' + VR.detectedSRRate + ' kr per dag (' + (VR.userRole || 'Okänd roll') + ')</div>';
            } else {
                html += '<div style="font-size:14px;color:#999;margin-top:8px">Rate detekteras automatiskt från turnummer</div>';
            }
            html += '</div>';
        }

        VR.showView('', '', html);
    };

    // ===== BUILD SR TABLE =====
    VR.buildSRTable = function() {
        var rate = VR.detectedSRRate || 0;
        var allData = VR.getSRDataArray();

        var html = '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Header
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:10px;padding:20px 24px;background:#1C1C1E">';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Datum</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff">Tur</div>';
        html += '<div style="font-size:28px;font-weight:600;color:#fff;text-align:right">Kr</div>';
        html += '</div>';

        // Sort by date descending
        var sorted = allData.slice().sort(function(a, b) {
            return new Date(b.year, b.month, b.day) - new Date(a.year, a.month, a.day);
        });

        for (var i = 0; i < sorted.length; i++) {
            var row = sorted[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';
            var sourceIcon = row.source === 'tour' ? ' 🇩🇰' : (row.source === 'expanded' ? ' 📍' : '');

            html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:10px;padding:18px 24px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:30px;color:#333">' + row.dateStr + '</div>';
            html += '<div style="font-size:30px;color:#333">' + row.tur + sourceIcon + '</div>';
            html += '<div style="font-size:30px;font-weight:600;color:#C41E3A;text-align:right">' + rate + ' kr</div>';
            html += '</div>';
        }

        // Total row
        var total = allData.length * rate;
        html += '<div style="display:grid;grid-template-columns:1fr 1.5fr 0.8fr;gap:10px;padding:20px 24px;background:#F0F0F5;border-top:2px solid #E5E5EA">';
        html += '<div style="font-size:32px;font-weight:700;color:#333">Totalt</div>';
        html += '<div style="font-size:32px;color:#666">' + allData.length + ' dagar</div>';
        html += '<div style="font-size:32px;font-weight:700;color:#C41E3A;text-align:right">' + total + ' kr</div>';
        html += '</div>';

        html += '</div>';
        return html;
    };

    console.log('VR: SR-Tillägg loaded');
})();
