// VR CrewWeb - Day Detail & Calendar Export
(function() {
    'use strict';

    var VR = window.VR;

    // ===== SWEDISH HOLIDAYS =====
    VR.getSwedishHoliday = function(day, month, year) {
        // Fixed holidays (month is 1-12)
        var fixed = {
            '1-1': 'Nyårsdagen',
            '6-1': 'Trettondag',
            '1-5': 'Första maj',
            '6-6': 'Nationaldagen',
            '24-12': 'Julafton',
            '25-12': 'Juldagen',
            '26-12': 'Annandag jul',
            '31-12': 'Nyårsafton'
        };

        var key = day + '-' + month;
        if (fixed[key]) return fixed[key];

        // Calculate Easter (Meeus/Jones/Butcher algorithm)
        var a = year % 19;
        var b = Math.floor(year / 100);
        var c = year % 100;
        var d = Math.floor(b / 4);
        var e = b % 4;
        var f = Math.floor((b + 8) / 25);
        var g = Math.floor((b - f + 1) / 3);
        var h = (19 * a + b - d - g + 15) % 30;
        var i = Math.floor(c / 4);
        var k = c % 4;
        var l = (32 + 2 * e + 2 * i - h - k) % 7;
        var m = Math.floor((a + 11 * h + 22 * l) / 451);
        var easterMonth = Math.floor((h + l - 7 * m + 114) / 31);
        var easterDay = ((h + l - 7 * m + 114) % 31) + 1;

        var easterDate = new Date(year, easterMonth - 1, easterDay);
        var checkDate = new Date(year, month - 1, day);

        // Easter-based holidays
        var diffDays = Math.round((checkDate - easterDate) / (1000 * 60 * 60 * 24));

        if (diffDays === -2) return 'Långfredagen';
        if (diffDays === 0) return 'Påskdagen';
        if (diffDays === 1) return 'Annandag påsk';
        if (diffDays === 39) return 'Kristi himmelsfärd';
        if (diffDays === 49) return 'Pingstdagen';

        // Midsommar (Saturday between June 20-26)
        if (month === 6 && day >= 20 && day <= 26) {
            var testDate = new Date(year, 5, day);
            if (testDate.getDay() === 6) return 'Midsommardagen';
            if (testDate.getDay() === 5) return 'Midsommarafton';
        }

        // Alla helgons dag (Saturday between Oct 31 - Nov 6)
        if ((month === 10 && day === 31) || (month === 11 && day >= 1 && day <= 6)) {
            var testDate2 = new Date(year, month - 1, day);
            if (testDate2.getDay() === 6) return 'Alla helgons dag';
        }

        return null;
    };

    // ===== OPEN DAY FROM HEADER =====
    VR.openDayFromHeader = function(dateStr) {
        VR.closeOverlay();
        VR.closeDayDetail();

        if (VR.dayData[dateStr] && VR.dayData[dateStr].length > 1) {
            VR.showDayDetail(dateStr);
            return;
        }

        VR.showLoader('Laddar ' + dateStr + '...');
        VR.updateLoader(20, 'Navigerar till Arbetsdag...');

        var tbl = document.querySelector('#workdays table');
        if (tbl) {
            VR.updateLoader(50, 'Sidan laddad...');
            VR.loadDayDataAndShow(dateStr);
            return;
        }

        var el = VR.findMenuItem('Arbetsdag');
        if (el) {
            el.click();
            var n = 0;
            VR.timer = setInterval(function() {
                n++;
                VR.updateLoader(20 + n * 2, 'Väntar på sidan...');
                var tbl2 = document.querySelector('#workdays table');
                if (tbl2) {
                    VR.stopTimer();
                    VR.updateLoader(60, 'Läser data...');
                    VR.loadDayDataAndShow(dateStr);
                } else if (n > 25) {
                    VR.stopTimer();
                    VR.hideLoader();
                }
            }, 400);
        } else {
            VR.hideLoader();
        }
    };

    // ===== LOAD DAY DATA AND SHOW =====
    VR.loadDayDataAndShow = function(dateStr) {
        var tbl = VR.findLargestTable();
        if (!tbl) {
            VR.hideLoader();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        var currentDate = '';

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) currentDate = dt;
            if (!currentDate) continue;

            var en = {
                dt: currentDate,
                ps: c[3] ? c[3].textContent.trim() : '',
                sP: c[4] ? c[4].textContent.trim() : '',
                eP: c[5] ? c[5].textContent.trim() : '',
                ai: c[6] ? c[6].textContent.trim() : '',
                lb: c[7] ? c[7].textContent.trim() : '',
                u1: c[8] ? c[8].textContent.trim() : '',
                tn: c[9] ? c[9].textContent.trim() : '',
                pr: c[10] ? c[10].textContent.trim() : '',
                pt: c[11] ? c[11].textContent.trim() : '',
                cd: c[12] ? c[12].textContent.trim() : '',
                km: c[13] ? c[13].textContent.trim() : '',
                sa: c[14] ? c[14].textContent.trim() : '',
                isHeader: dt && dt.indexOf('-') > -1
            };

            if (!VR.dayData[currentDate]) VR.dayData[currentDate] = [];
            VR.dayData[currentDate].push(en);
        }

        VR.updateLoader(80, 'Expanderar dag...');
        VR.expandDayAndShow(dateStr);
    };

    // ===== SHOW DAY DETAIL =====
    VR.showDayDetail = function(dateStr) {
        if (!VR.dayData[dateStr]) return;

        var es = VR.dayData[dateStr];
        var nonH = 0;
        for (var c = 0; c < es.length; c++) {
            if (!es[c].isHeader) nonH++;
        }

        if (nonH === 0) {
            VR.expandDayAndShow(dateStr);
            return;
        }

        VR.doShowDayDetail(dateStr);
    };

    // ===== EXPAND DAY AND SHOW =====
    VR.expandDayAndShow = function(dateStr) {
        VR.showLoader('Laddar dag...');
        VR.updateLoader(30, 'Letar efter dag...');

        var tbl = VR.findLargestTable();
        if (!tbl) {
            VR.hideLoader();
            return;
        }

        var rows = tbl.querySelectorAll('tr');
        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 3) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt === dateStr) {
                var expandBtn = rows[i].querySelector('button.ExpandRoot');
                if (expandBtn) {
                    VR.updateLoader(50, 'Expanderar...');
                    expandBtn.click();

                    setTimeout(function() {
                        VR.updateLoader(70, 'Läser data...');
                        VR.reloadDayData(dateStr);

                        setTimeout(function() {
                            VR.hideLoader();
                            VR.doShowDayDetail(dateStr);
                        }, 500);
                    }, 800);
                    return;
                }
            }
        }

        VR.hideLoader();
        VR.doShowDayDetail(dateStr);
    };

    // ===== RELOAD DAY DATA =====
    VR.reloadDayData = function(dateStr) {
        var tbl = VR.findLargestTable();
        if (!tbl) return;

        var rows = tbl.querySelectorAll('tr');
        var currentDate = '';
        var newEntries = [];

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) currentDate = dt;

            if (currentDate === dateStr) {
                var en = {
                    dt: currentDate,
                    ps: c[3] ? c[3].textContent.trim() : '',
                    sP: c[4] ? c[4].textContent.trim() : '',
                    eP: c[5] ? c[5].textContent.trim() : '',
                    ai: c[6] ? c[6].textContent.trim() : '',
                    lb: c[7] ? c[7].textContent.trim() : '',
                    u1: c[8] ? c[8].textContent.trim() : '',
                    tn: c[9] ? c[9].textContent.trim() : '',
                    pr: c[10] ? c[10].textContent.trim() : '',
                    pt: c[11] ? c[11].textContent.trim() : '',
                    cd: c[12] ? c[12].textContent.trim() : '',
                    km: c[13] ? c[13].textContent.trim() : '',
                    sa: c[14] ? c[14].textContent.trim() : '',
                    isHeader: dt && dt.indexOf('-') > -1
                };
                newEntries.push(en);
            }
        }

        if (newEntries.length > 0) {
            VR.dayData[dateStr] = newEntries;
        }
    };

    // ===== DO SHOW DAY DETAIL =====
    VR.doShowDayDetail = function(dateStr) {
        if (!VR.dayData[dateStr]) return;

        var es = VR.dayData[dateStr];

        // Sort by start time
        es.sort(function(a, b) {
            var getStart = function(pr) {
                if (!pr) return 9999;
                var m = pr.match(/(\d{1,2}):(\d{2})/);
                return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 9999;
            };
            return getStart(a.pr) - getStart(b.pr);
        });

        // Parse date
        var parts = dateStr.split('-');
        var dateObj = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
        var wd = VR.WEEKDAYS[dateObj.getDay()];
        var dayNum = parseInt(parts[0]);
        var monthNum = parseInt(parts[1]);
        var yearNum = parseInt(parts[2]);
        var monName = VR.MONTHS[monthNum - 1];

        // Check for Swedish holiday
        var holiday = VR.getSwedishHoliday(dayNum, monthNum, yearNum);
        var displayLabel = holiday ? holiday : wd;

        // Find header entry
        var hdr = null;
        for (var h = 0; h < es.length; h++) {
            if (es[h].isHeader) { hdr = es[h]; break; }
        }

        // Remove old detail
        var old = document.getElementById(VR.ID.detail);
        if (old) old.remove();

        // Create detail panel
        var d = document.createElement('div');
        d.id = VR.ID.detail;

        var topPos = VR.getHeaderHeight();
        var html = '<style>#vrDetail{position:fixed;top:' + topPos + ';left:0;right:0;bottom:0;background:#F2F2F7;z-index:9999996;overflow-y:auto;font-family:-apple-system,BlinkMacSystemFont,sans-serif;-webkit-overflow-scrolling:touch}</style>';

        // Header - 50% smaller, weekday/holiday + date on same line
        html += '<div style="padding:25px 36px 180px">';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">';
        html += '<div style="font-size:32px;font-weight:700;color:#000">' + displayLabel + ', ' + dayNum + ' ' + monName + '</div>';
        html += '<button onclick="VR.closeDayDetail()" style="width:50px;height:50px;border-radius:50%;border:none;background:#E5E5EA;color:#000;font-size:24px;cursor:pointer">✕</button>';
        html += '</div>';

        // Summary card
        if (hdr) {
            html += VR.buildDaySummaryCard(hdr, es);
        }

        // Work moments
        var nonHeaders = [];
        for (var x = 0; x < es.length; x++) {
            if (!es[x].isHeader) nonHeaders.push(es[x]);
        }

        html += VR.buildWorkMoments(nonHeaders, dateStr);
        html += '</div>';

        d.innerHTML = html;
        document.body.appendChild(d);
    };

    // ===== BUILD DAY SUMMARY CARD =====
    VR.buildDaySummaryCard = function(hdr, es) {
        // Find unpaid break (RASTO) and paid break (RAST)
        var obetaldRast = '';
        var betaldRast = '';

        for (var rI = 0; rI < es.length; rI++) {
            if (!es[rI].isHeader && es[rI].ai) {
                var aiUp = es[rI].ai.toUpperCase();
                var rPr = es[rI].pr || '';
                var t = VR.parseTimeRange(rPr);

                if (aiUp === 'RASTO' && t && !obetaldRast) {
                    var rMin = t.endMins - t.startMins;
                    if (rMin < 0) rMin += 1440;
                    var rH = Math.floor(rMin / 60);
                    var rMi = rMin % 60;
                    obetaldRast = (rH > 0 ? rH + ':' : '0:') + ('0' + rMi).slice(-2);
                }

                if (aiUp === 'RAST' && t && !betaldRast) {
                    var bMin = t.endMins - t.startMins;
                    if (bMin < 0) bMin += 1440;
                    var bH = Math.floor(bMin / 60);
                    var bMi = bMin % 60;
                    betaldRast = (bH > 0 ? bH + ':' : '0:') + ('0' + bMi).slice(-2);
                }
            }
        }

        // 50% smaller padding and font sizes
        var html = '<div style="background:#fff;border-radius:16px;padding:18px;margin-bottom:20px;box-shadow:0 2px 12px rgba(0,0,0,0.08)">';

        // Pass - 50% smaller
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:12px;border-bottom:1px solid #E5E5EA">';
        html += '<div style="font-size:14px;color:#8E8E93">Pass</div>';
        html += '<div style="font-size:20px;font-weight:600;color:#000">' + hdr.ps + '</div>';
        html += '</div>';

        // Tid (formerly Period) - 50% smaller
        html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #E5E5EA">';
        html += '<div style="font-size:14px;color:#8E8E93">Tid</div>';
        html += '<div style="font-size:20px;font-weight:600;color:#000">' + hdr.pr + '</div>';
        html += '</div>';

        // Paid time - 50% smaller
        if (hdr.pt) {
            html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid #E5E5EA">';
            html += '<div style="font-size:14px;color:#8E8E93">Betald tid</div>';
            html += '<div style="font-size:20px;font-weight:600;color:#34C759">' + hdr.pt + '</div>';
            html += '</div>';
        }

        // Breaks row - side by side (Betald rast left, Obetald rast right)
        if (betaldRast || obetaldRast) {
            html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;padding-top:12px">';

            // Betald rast (left)
            html += '<div style="text-align:center;padding:8px;background:#F8F8F8;border-radius:10px">';
            html += '<div style="font-size:12px;color:#8E8E93;margin-bottom:4px">Betald rast</div>';
            html += '<div style="font-size:18px;font-weight:600;color:#34C759">' + (betaldRast || '—') + '</div>';
            html += '</div>';

            // Obetald rast (right)
            html += '<div style="text-align:center;padding:8px;background:#F8F8F8;border-radius:10px">';
            html += '<div style="font-size:12px;color:#8E8E93;margin-bottom:4px">Obetald rast</div>';
            html += '<div style="font-size:18px;font-weight:600;color:#FF9500">' + (obetaldRast || '—') + '</div>';
            html += '</div>';

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    // ===== BUILD WORK MOMENTS =====
    VR.buildWorkMoments = function(nonHeaders, dateStr) {
        var simpleTypes = ['OMLOPP', 'VÄXLING', 'RASTO', 'RAST', 'PASSRESA', 'RESERV', 'PRODUKTIONSRESERV', 'TJÄNSTETÅG'];

        var html = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:23px">';
        html += '<div style="font-size:32px;font-weight:600;color:#666;padding-left:9px">ARBETSMOMENT (<span id="vrMomentCount">' + nonHeaders.length + '</span> st)</div>';
        html += '<div style="display:flex;background:#E5E5EA;border-radius:18px;overflow:hidden">';
        html += '<button id="vrBtnEnkel" onclick="VR.toggleView(true)" style="padding:18px 32px;border:none;background:transparent;font-size:27px;font-weight:600;color:#666;cursor:pointer">Enkel</button>';
        html += '<button id="vrBtnAllt" onclick="VR.toggleView(false)" style="padding:18px 32px;border:none;background:#007AFF;font-size:27px;font-weight:600;color:#fff;cursor:pointer">Allt</button>';
        html += '</div></div>';

        html += '<div id="vrMomentList" style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 18px rgba(0,0,0,0.08)">';

        // Header row
        html += '<div style="display:grid;grid-template-columns:minmax(150px,1fr) minmax(150px,1.2fr) minmax(120px,1fr) minmax(195px,2fr);padding:23px 27px;background:#1C1C1E;font-size:24px;font-weight:600;color:#fff;text-transform:uppercase;gap:18px">';
        html += '<div>Tid</div><div>Plats</div><div>Tåg</div><div>Arbete</div>';
        html += '</div>';

        // Current time check
        var nowDate = new Date();
        var nowMins = nowDate.getHours() * 60 + nowDate.getMinutes();
        var todayFmt = VR.getTodayStr();
        var isToday = dateStr === todayFmt;

        // Rows
        for (var i = 0; i < nonHeaders.length; i++) {
            var e = nonHeaders[i];
            var isTrain = e.tn || e.u1;
            var isOdd = i % 2 === 1;
            var ai = e.ai ? e.ai.toUpperCase() : '';
            var bgColor = isOdd ? '#FAFAFA' : '#fff';

            var isProdRes = ai.indexOf('PRODUKTIONSRESERV') > -1;
            var isSimple = simpleTypes.indexOf(ai) > -1 || isProdRes;

            // Display name mapping
            var displayAi = e.ai || '—';
            if (ai === 'OMLOPP') displayAi = 'Tåg';
            else if (ai === 'PASSRESA') displayAi = 'Passresa';
            else if (ai === 'VÄXLING') displayAi = 'Växling';
            else if (ai === 'RASTO') displayAi = 'Rast (Obetald)';
            else if (ai === 'RAST') displayAi = 'Rast (Betald)';
            else if (ai === 'RESERV' || isProdRes) displayAi = 'Reserv';
            else if (ai === 'TJÄNSTETÅG') displayAi = 'Tjänstetåg';

            // Current moment highlight
            var isCurrent = false;
            if (isToday && e.pr) {
                var t = VR.parseTimeRange(e.pr);
                if (t) {
                    var endMins = t.endMins;
                    if (endMins < t.startMins) endMins += 1440;
                    if (nowMins >= t.startMins && nowMins < endMins) isCurrent = true;
                }
            }

            var rowStyle = 'display:grid;grid-template-columns:minmax(150px,1fr) minmax(150px,1.2fr) minmax(120px,1fr) minmax(195px,2fr);padding:23px 27px;border-top:1px solid #E0E0E0;gap:18px;align-items:center;';
            if (isCurrent) {
                rowStyle += 'background:linear-gradient(135deg,rgba(0,122,255,0.15),rgba(88,86,214,0.15));border-left:6px solid #007AFF;box-shadow:inset 0 0 20px rgba(0,122,255,0.1);';
            } else {
                rowStyle += 'background:' + bgColor + ';';
            }

            html += '<div class="vrMomentRow" data-simple="' + (isSimple ? '1' : '0') + '" style="' + rowStyle + '">';

            // Time
            html += '<div style="font-size:29px;font-weight:600;color:' + (isCurrent ? '#5856D6' : '#007AFF') + '">' + (e.pr || '—');
            if (isCurrent) {
                html += ' <span style="font-size:18px;background:#007AFF;color:#fff;padding:3px 9px;border-radius:6px;margin-left:9px">NU</span>';
            }
            html += '</div>';

            // Place
            html += '<div style="font-size:27px;color:#333">' + e.sP + '<br><span style="color:#888">→ ' + e.eP + '</span></div>';

            // Train
            html += '<div style="font-size:27px;font-weight:600;color:' + (isTrain ? '#007AFF' : '#ccc') + '">' + (e.tn || e.u1 || '—') + '</div>';

            // Work type
            html += '<div class="vrAiText" data-full="' + (e.ai || '—') + '" data-simple="' + displayAi + '" style="font-size:27px;color:#333">' + (e.ai || '—') + '</div>';

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    // ===== TOGGLE VIEW =====
    VR.toggleView = function(simple) {
        var rows = document.querySelectorAll('.vrMomentRow');
        var count = 0;

        for (var r = 0; r < rows.length; r++) {
            var isS = rows[r].getAttribute('data-simple') === '1';
            if (simple && !isS) {
                rows[r].style.display = 'none';
            } else {
                rows[r].style.display = 'grid';
                count++;
            }

            var aiEl = rows[r].querySelector('.vrAiText');
            if (aiEl) {
                aiEl.textContent = simple ? aiEl.getAttribute('data-simple') : aiEl.getAttribute('data-full');
            }
        }

        document.getElementById('vrMomentCount').textContent = count;
        document.getElementById('vrBtnEnkel').style.background = simple ? '#007AFF' : 'transparent';
        document.getElementById('vrBtnEnkel').style.color = simple ? '#fff' : '#666';
        document.getElementById('vrBtnAllt').style.background = simple ? 'transparent' : '#007AFF';
        document.getElementById('vrBtnAllt').style.color = simple ? '#666' : '#fff';
    };

    // ===== EXPORT TO CALENDAR =====
    VR.exportMonthToCalendar = function() {
        var pad = function(n) { return n < 10 ? '0' + n : n; };
        var events = '';
        var count = 0;

        var ds = Object.keys(VR.dayData);
        for (var i = 0; i < ds.length; i++) {
            var dKey = ds[i];
            var es = VR.dayData[dKey];
            if (!es || es.length === 0) continue;

            // Find header
            var hdr = null;
            for (var h = 0; h < es.length; h++) {
                if (es[h].isHeader) { hdr = es[h]; break; }
            }
            if (!hdr) hdr = es[0];

            // Skip free days
            var cdU = (hdr.cd || '').toUpperCase();
            var psU = (hdr.ps || '').toUpperCase();
            if (cdU === 'FRIDAG' || psU === 'FRI' || psU === 'FP' ||
                psU === 'FV' || psU === 'FP2' || psU === 'FP-V') continue;

            // Parse period
            var period = hdr.pr || '';
            var t = VR.parseTimeRange(period);
            if (!t) continue;

            var parts = dKey.split('-');
            var day = parseInt(parts[0]);
            var month = parseInt(parts[1]);
            var year = parseInt(parts[2]);

            var dtStart = year + pad(month) + pad(day) + 'T' + pad(t.startH) + pad(t.startM) + '00';
            var dtEnd = year + pad(month) + pad(day) + 'T' + pad(t.endH) + pad(t.endM) + '00';

            var title = 'Arbete: ' + (hdr.tn || hdr.ps || 'Pass');
            var desc = 'Period: ' + period + (hdr.pt ? ' | Betald tid: ' + hdr.pt : '');

            events += 'BEGIN:VEVENT\n';
            events += 'UID:' + dKey + '-' + Date.now() + '@vrschema\n';
            events += 'DTSTART:' + dtStart + '\n';
            events += 'DTEND:' + dtEnd + '\n';
            events += 'SUMMARY:' + title + '\n';
            events += 'DESCRIPTION:' + desc + '\n';
            events += 'END:VEVENT\n';
            count++;
        }

        if (count === 0) {
            VR.showToast('Inga arbetsdagar att exportera', '#FF3B30');
            return;
        }

        var ics = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//VR Schema//SV\n' + events + 'END:VCALENDAR';

        var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
        var url = URL.createObjectURL(blob);

        var a = document.createElement('a');
        a.href = url;
        a.download = 'schema_' + VR.MONTHS[VR.schemaMonth] + '_' + VR.schemaYear + '.ics';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        VR.showToast('📅 ' + count + ' dagar exporterade!', '#34C759');
    };

    // ===== TOAST MESSAGE =====
    VR.showToast = function(message, bgColor) {
        var toast = document.createElement('div');
        toast.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:' + bgColor + ';color:#fff;padding:30px 45px;border-radius:18px;font-size:27px;font-weight:600;z-index:9999999';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() { toast.remove(); }, 2000);
    };

    console.log('VR: Day Detail loaded');
})();
