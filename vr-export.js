// VR CrewWeb - Export to Firebase - V.1.45
(function() {
    'use strict';

    var VR = window.VR;

    // ===== MONTH NAMES FOR PARSING =====
    var MONTH_NAMES = ['Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

    // ===== BADGE TYPE HELPER =====
    VR.getBadgeType = function(service, cd) {
        var s = (service || '').toUpperCase();
        var c = (cd || '').toUpperCase();

        if (s === 'FP' || c === 'FRIDAG' || s === 'FRIDAG') return 'fp';
        if (s === 'FPV' || s === 'FV' || s === 'FP2' || s === 'FP-V' || s.indexOf('FP-V') > -1) return 'fpv';
        if (s === 'SEMESTER' || s.indexOf('SEMESTER') > -1) return 'semester';
        if (s === 'FRÅNVARANDE' || s.indexOf('SJUK') > -1) return 'franvarande';
        if (s.indexOf('FÖRÄLDRA') > -1) return 'foraldraledighet';
        if (s === 'AFD') return 'afd';
        if (s === 'RESERV' || s === 'RESERVSTAM' || s.indexOf('RESERV') > -1) return 'reserv';
        return 'dag';
    };

    // ===== GENERATE INITIALS =====
    VR.getInitials = function(name) {
        if (!name) return '??';
        var parts = name.trim().split(/\s+/);
        var initials = parts.map(function(n) { return n[0] || ''; }).join('').substring(0, 2).toUpperCase();
        return initials || '??';
    };

    // ===== CAPTURE USER INFO FROM PAGE =====
    VR._exportUserInfo = { anstNr: '', namn: '' };

    VR.captureUserInfo = function() {
        console.log('VR: Capturing user info from page...');

        // 1. AnstNr from div.CurrentUser (always present, contains "3021132026-02-0613:20:33")
        if (!VR._exportUserInfo.anstNr) {
            var currentUserDiv = document.querySelector('div.CurrentUser');
            if (currentUserDiv) {
                var cuText = (currentUserDiv.textContent || '').trim();
                var match6 = cuText.match(/^(\d{6})/);
                if (match6) {
                    VR._exportUserInfo.anstNr = match6[1];
                    console.log('VR: Got anstNr from CurrentUser div:', match6[1]);
                }
            }
        }

        // 2. Namn from "Anställds namn:" label (only visible on Arbetsdag page)
        if (!VR._exportUserInfo.namn) {
            var allDivs = document.querySelectorAll('div, span, label');
            for (var i = 0; i < allDivs.length; i++) {
                var el = allDivs[i];
                var text = (el.textContent || '').trim();
                if (text.length > 40) continue;

                var textLower = text.toLowerCase();
                if (textLower === 'anställds namn:' || textLower === 'anställds namn') {
                    var nextEl = el.nextElementSibling;
                    if (nextEl) {
                        var namnVal = (nextEl.value || nextEl.textContent || '').trim();
                        if (namnVal && namnVal.length >= 3 && namnVal.length <= 50 && namnVal.indexOf(':') === -1) {
                            VR._exportUserInfo.namn = namnVal;
                            console.log('VR: Got namn from label sibling:', namnVal);
                            break;
                        }
                    }
                }
            }
        }

        // 3. Fallback: anstNr from "Anställd nr.:" label
        if (!VR._exportUserInfo.anstNr) {
            var allEls = document.querySelectorAll('div, span, label');
            for (var j = 0; j < allEls.length; j++) {
                var el2 = allEls[j];
                var text2 = (el2.textContent || '').trim().toLowerCase();
                if (text2.length > 30) continue;
                if (text2 === 'anställd nr.:' || text2 === 'anställd nr:' || text2 === 'anställd nr.' || text2 === 'anställd nr') {
                    var nextEl2 = el2.nextElementSibling;
                    if (nextEl2) {
                        var nrVal = (nextEl2.value || nextEl2.textContent || '').trim();
                        var nrMatch = nrVal.match(/(\d{6})/);
                        if (nrMatch) {
                            VR._exportUserInfo.anstNr = nrMatch[1];
                            console.log('VR: Got anstNr from label sibling:', nrMatch[1]);
                            break;
                        }
                    }
                }
            }
        }

        // Save to Firebase user if both found
        if (VR._exportUserInfo.anstNr && VR._exportUserInfo.namn && VR.setFirebaseUser) {
            VR.setFirebaseUser(VR._exportUserInfo.anstNr, VR._exportUserInfo.namn);
        }

        // Save to localStorage for future sessions
        if (VR.saveSettings) {
            var toSave = {};
            if (VR._exportUserInfo.anstNr) toSave.anstNr = VR._exportUserInfo.anstNr;
            if (VR._exportUserInfo.namn) toSave.namn = VR._exportUserInfo.namn;
            VR.saveSettings(toSave);
        }

        console.log('VR: Captured user info - anstNr:', VR._exportUserInfo.anstNr, 'namn:', VR._exportUserInfo.namn);
    };

    // ===== PIN CODE =====
    var EXPORT_PIN = '8612';

    VR.showPinScreen = function() {
        VR.stopTimer();
        VR.closeOverlay();

        var html = '<style>\
.vr-pin-container{width:100%;padding:0 16px;box-sizing:border-box;display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:60vh}\
.vr-pin-header{background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:40px 28px;margin-bottom:32px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);width:100%}\
.vr-pin-icon{font-size:56px;margin-bottom:16px}\
.vr-pin-title{font-size:32px;font-weight:700;color:#fff;margin-bottom:8px}\
.vr-pin-sub{font-size:18px;color:rgba(255,255,255,0.6)}\
.vr-pin-fields{display:flex;gap:16px;justify-content:center;margin-bottom:28px}\
.vr-pin-field{width:68px;height:80px;border:3px solid #ddd;border-radius:16px;text-align:center;font-size:36px;font-weight:700;color:#1a1a2e;background:#fff;outline:none;transition:border-color 0.2s;-webkit-appearance:none;appearance:none}\
.vr-pin-field:focus{border-color:#667eea;box-shadow:0 0 0 4px rgba(102,126,234,0.2)}\
.vr-pin-field.error{border-color:#FF3B30;animation:vrPinShake 0.4s ease}\
.vr-pin-error{color:#FF3B30;font-size:18px;font-weight:600;text-align:center;min-height:28px;margin-bottom:8px}\
@keyframes vrPinShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}\
</style>';

        html += '<div class="vr-pin-container">';
        html += '<div class="vr-pin-header">';
        html += '<div class="vr-pin-icon">🔒</div>';
        html += '<div class="vr-pin-title">Exportera</div>';
        html += '<div class="vr-pin-sub">Ange PIN-kod för att fortsätta</div>';
        html += '</div>';

        html += '<div class="vr-pin-fields">';
        html += '<input type="tel" class="vr-pin-field" id="vrPin1" maxlength="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off">';
        html += '<input type="tel" class="vr-pin-field" id="vrPin2" maxlength="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off">';
        html += '<input type="tel" class="vr-pin-field" id="vrPin3" maxlength="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off">';
        html += '<input type="tel" class="vr-pin-field" id="vrPin4" maxlength="1" inputmode="numeric" pattern="[0-9]*" autocomplete="off">';
        html += '</div>';

        html += '<div class="vr-pin-error" id="vrPinError"></div>';
        html += '</div>';

        VR.showView('', '', html);

        // Setup PIN input behavior after render
        setTimeout(function() { VR.setupPinInputs(); }, 100);
    };

    VR.setupPinInputs = function() {
        var fields = [
            document.getElementById('vrPin1'),
            document.getElementById('vrPin2'),
            document.getElementById('vrPin3'),
            document.getElementById('vrPin4')
        ];

        if (!fields[0]) return;

        fields.forEach(function(field, i) {
            field.addEventListener('input', function() {
                // Only allow digits
                this.value = this.value.replace(/[^0-9]/g, '');
                if (this.value.length === 1 && i < 3) {
                    fields[i + 1].focus();
                }
                // Check if all filled
                if (i === 3 && this.value.length === 1) {
                    var pin = fields[0].value + fields[1].value + fields[2].value + fields[3].value;
                    VR.checkPin(pin, fields);
                }
            });

            field.addEventListener('keydown', function(e) {
                if (e.key === 'Backspace' && this.value === '' && i > 0) {
                    fields[i - 1].focus();
                    fields[i - 1].value = '';
                }
            });

            // Handle paste
            field.addEventListener('paste', function(e) {
                e.preventDefault();
                var pasted = (e.clipboardData || window.clipboardData).getData('text').replace(/[^0-9]/g, '');
                if (pasted.length >= 4) {
                    for (var j = 0; j < 4; j++) {
                        fields[j].value = pasted[j];
                    }
                    var pin = pasted.substring(0, 4);
                    VR.checkPin(pin, fields);
                }
            });
        });

        // Auto-focus first field
        fields[0].focus();
    };

    VR.checkPin = function(pin, fields) {
        if (pin === EXPORT_PIN) {
            // Correct PIN - proceed to export
            fields.forEach(function(f) {
                f.style.borderColor = '#34C759';
                f.disabled = true;
            });
            document.getElementById('vrPinError').textContent = '';
            setTimeout(function() { VR.doExportAfterPin(); }, 300);
        } else {
            // Wrong PIN
            var errorEl = document.getElementById('vrPinError');
            errorEl.textContent = 'Fel PIN-kod';
            fields.forEach(function(f) {
                f.classList.add('error');
                f.value = '';
            });
            setTimeout(function() {
                fields.forEach(function(f) { f.classList.remove('error'); });
                fields[0].focus();
            }, 500);
        }
    };

    // ===== EXPORT VIEW (with auto-load) =====
    VR.doExport = function() {
        VR.showPinScreen();
    };

    VR.doExportAfterPin = function() {
        var schemaCount = VR.allSchemaData ? Object.keys(VR.allSchemaData).length : 0;
        var fpfpvCount = VR.fpfpvData ? VR.fpfpvData.length : 0;

        // If data is missing, auto-load it
        if (schemaCount === 0 || fpfpvCount === 0) {
            VR.showLoader('Förbereder Export');
            VR.updateLoader(5, 'Laddar data...');
            VR.autoLoadForExport();
            return;
        }

        // Data already loaded, show export view
        VR.showExportView();
    };

    // ===== AUTO LOAD DATA FOR EXPORT =====
    VR.autoLoadForExport = function() {
        var schemaCount = VR.allSchemaData ? Object.keys(VR.allSchemaData).length : 0;
        var fpfpvCount = VR.fpfpvData ? VR.fpfpvData.length : 0;

        // Step 1: Load Schema if missing
        if (schemaCount === 0) {
            VR.updateLoader(10, 'Laddar Schema...');
            VR.loadSchemaForExport(function() {
                // Step 2: Load FP/FPV if missing
                if (fpfpvCount === 0) {
                    VR.updateLoader(50, 'Laddar FP/FPV...');
                    VR.loadFPFPVForExport(function() {
                        VR.updateLoader(100, 'Klar!');
                        setTimeout(function() {
                            VR.hideLoader();
                            VR.showExportView();
                        }, 300);
                    });
                } else {
                    VR.updateLoader(100, 'Klar!');
                    setTimeout(function() {
                        VR.hideLoader();
                        VR.showExportView();
                    }, 300);
                }
            });
        } else if (fpfpvCount === 0) {
            // Only need FP/FPV
            VR.updateLoader(50, 'Laddar FP/FPV...');
            VR.loadFPFPVForExport(function() {
                VR.updateLoader(100, 'Klar!');
                setTimeout(function() {
                    VR.hideLoader();
                    VR.showExportView();
                }, 300);
            });
        }
    };

    // ===== LOAD SCHEMA FOR EXPORT (silent) =====
    VR.loadSchemaForExport = function(callback) {
        // Check if already on workdays page
        var tbl = document.querySelector('#workdays table');
        if (tbl) {
            VR.updateLoader(20, 'Sidan redan laddad...');
            VR.fetchSchemaDataForExport(callback);
            return;
        }

        // Open folder menu and find Arbetsdag
        VR.clickFolder();
        setTimeout(function() {
            var n = 0;
            var findTimer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('Arbetsdag');
                if (el) {
                    clearInterval(findTimer);
                    VR.updateLoader(25, 'Öppnar Arbetsdag...');
                    el.click();
                    VR.waitForSchemaForExport(callback);
                } else if (n > 20) {
                    clearInterval(findTimer);
                    console.log('VR: Could not find Arbetsdag menu');
                    if (callback) callback();
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR SCHEMA FOR EXPORT =====
    VR.waitForSchemaForExport = function(callback) {
        var n = 0;
        var waitTimer = setInterval(function() {
            n++;
            VR.updateLoader(30 + Math.min(n, 15), 'Väntar på sidan...');
            var tbl = document.querySelector('#workdays table');
            if (tbl) {
                clearInterval(waitTimer);
                VR.fetchSchemaDataForExport(callback);
            } else if (n > 30) {
                clearInterval(waitTimer);
                console.log('VR: Timeout waiting for workdays');
                if (callback) callback();
            }
        }, 400);
    };

    // ===== FETCH SCHEMA DATA FOR EXPORT =====
    VR.fetchSchemaDataForExport = function(callback) {
        // Capture user info NOW while on Arbetsdag page (namn is visible here)
        VR.captureUserInfo();

        var now = new Date();
        var startDate = new Date(2025, 11, 14);
        var endDate = new Date(now.getFullYear(), 11, 31);

        var d1 = startDate.getDate() + '-' + ('0' + (startDate.getMonth() + 1)).slice(-2) + '-' + startDate.getFullYear();
        var d2 = endDate.getDate() + '-' + ('0' + (endDate.getMonth() + 1)).slice(-2) + '-' + endDate.getFullYear();

        VR.updateLoader(35, 'Sätter datum...');
        VR.setDates(d1, d2);
        VR.clickFetch();

        var lastRowCount = 0;
        var stableCount = 0;
        var n = 0;

        var dataTimer = setInterval(function() {
            n++;
            VR.updateLoader(35 + Math.min(n, 10), 'Laddar schema...');

            var rows = document.querySelectorAll('#workdays table tr');
            var rowCount = rows.length;

            if (rowCount === lastRowCount && rowCount > 10) {
                stableCount++;
            } else {
                stableCount = 0;
            }
            lastRowCount = rowCount;

            if (stableCount >= 3 || n > 50) {
                clearInterval(dataTimer);
                VR.parseSchemaDataForExport();
                if (callback) callback();
            }
        }, 400);
    };

    // ===== PARSE SCHEMA DATA FOR EXPORT =====
    VR.parseSchemaDataForExport = function() {
        var tbl = VR.findLargestTable();
        if (!tbl) return;

        var rows = tbl.querySelectorAll('tr');
        var dd = {};
        var currentDate = '';

        for (var i = 1; i < rows.length; i++) {
            var c = rows[i].querySelectorAll('td');
            if (c.length < 4) continue;

            var dt = c[2] ? c[2].textContent.trim() : '';
            if (dt && dt.indexOf('-') > -1) {
                currentDate = dt;
            }
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

            if (!dd[currentDate]) dd[currentDate] = [];
            dd[currentDate].push(en);
        }

        VR.allSchemaData = dd;
        console.log('VR: Parsed', Object.keys(dd).length, 'dates for export');
    };

    // ===== LOAD FP/FPV FOR EXPORT =====
    VR.loadFPFPVForExport = function(callback) {
        // Store the callback for when parsing is done
        VR.exportFPCallback = callback;

        // Navigate to FP/FPV page using same method as VR.doFPFPV
        VR.navigateToFranvaro(function() {
            VR.updateLoader(60, 'Väntar på FP-data...');
            VR.waitForFPFPVForExport();
        });
    };

    // ===== WAIT FOR FP/FPV FOR EXPORT =====
    VR.waitForFPFPVForExport = function() {
        var n = 0;
        var waitTimer = setInterval(function() {
            n++;
            VR.updateLoader(60 + Math.min(n, 25), 'Letar efter data...');

            // Look for GridCell elements (same as VR.waitForFranvaroGrid)
            var cells = document.querySelectorAll('.GridCell');
            console.log('VR Export: Found', cells.length, 'GridCells');

            if (cells.length > 10) {
                clearInterval(waitTimer);
                VR.updateLoader(90, 'Parsar FP-data...');
                setTimeout(function() {
                    VR.parseFPFPVForExport();
                    if (VR.exportFPCallback) VR.exportFPCallback();
                }, 500);
            } else if (n > 30) {
                clearInterval(waitTimer);
                console.log('VR Export: Timeout waiting for FP/FPV data');
                if (VR.exportFPCallback) VR.exportFPCallback();
            }
        }, 400);
    };

    // ===== PARSE FP/FPV FOR EXPORT (same logic as VR.parseAndShowFPFPV) =====
    VR.parseFPFPVForExport = function() {
        var allCells = document.querySelectorAll('.GridCell');
        var months = {};
        var days = {};
        var values = [];

        allCells.forEach(function(cell) {
            var text = cell.textContent.trim();
            var style = cell.getAttribute('style') || '';
            var topMatch = style.match(/top:\s*([\d.]+)px/);
            var leftMatch = style.match(/left:\s*([\d.]+)px/);
            var top = topMatch ? parseFloat(topMatch[1]) : 0;
            var left = leftMatch ? parseFloat(leftMatch[1]) : 0;

            if (MONTH_NAMES.indexOf(text) > -1) {
                months[top] = text;
            } else if (/^\d{1,2}$/.test(text) && top === 0) {
                days[left] = parseInt(text);
            } else if (text === 'FRI' || text === 'afd') {
                values.push({ top: top, left: left, type: text });
            }
        });

        var ledigheter = [];
        var monthTops = Object.keys(months).map(Number).sort(function(a, b) { return a - b; });
        var dayLefts = Object.keys(days).map(Number).sort(function(a, b) { return a - b; });

        console.log('VR Export: FP/FPV parsing - months:', Object.keys(months).length, 'days:', Object.keys(days).length, 'values:', values.length);

        if (monthTops.length > 0 && dayLefts.length > 0 && values.length > 0) {
            values.forEach(function(v) {
                var monthTop = monthTops.reduce(function(prev, curr) {
                    return Math.abs(curr - v.top) < Math.abs(prev - v.top) ? curr : prev;
                });
                var dayLeft = dayLefts.reduce(function(prev, curr) {
                    return Math.abs(curr - v.left) < Math.abs(prev - v.left) ? curr : prev;
                });

                var entry = {
                    manad: months[monthTop],
                    dag: days[dayLeft],
                    typ: v.type,
                    ar: 2026,
                    visas: v.type === 'FRI' ? 'FP' : 'FPV'
                };
                ledigheter.push(entry);
            });

            ledigheter.sort(function(a, b) {
                var monthDiff = MONTH_NAMES.indexOf(a.manad) - MONTH_NAMES.indexOf(b.manad);
                return monthDiff !== 0 ? monthDiff : a.dag - b.dag;
            });
        }

        VR.fpfpvData = ledigheter;
        console.log('VR Export: Parsed', ledigheter.length, 'FP/FPV days');
    };

    // ===== SHOW EXPORT VIEW =====
    VR.showExportView = function() {
        // Primary source: captured during page loading
        var anstNr = VR._exportUserInfo.anstNr || '';
        var namn = VR._exportUserInfo.namn || '';

        // Fallback 1: Firebase user
        if (!anstNr || !namn) {
            var user = VR.getFirebaseUser ? VR.getFirebaseUser() : null;
            if (user) {
                if (!anstNr && user.anstNr) anstNr = user.anstNr;
                if (!namn && user.namn) namn = user.namn;
            }
        }

        // Fallback 2: getUserInfoFromCrewWeb (vr-whosworking.js)
        if ((!anstNr || !namn) && VR.getUserInfoFromCrewWeb) {
            var crewWebInfo = VR.getUserInfoFromCrewWeb();
            if (crewWebInfo) {
                if (!anstNr && crewWebInfo.anstNr) anstNr = crewWebInfo.anstNr;
                if (!namn && crewWebInfo.namn) namn = crewWebInfo.namn;
            }
        }

        // Fallback 3: Saved settings (localStorage)
        if (!anstNr || !namn) {
            if (VR.getSetting) {
                if (!anstNr) anstNr = VR.getSetting('anstNr') || '';
                if (!namn) namn = VR.getSetting('namn') || '';
            }
        }

        // Fallback 4: VR properties
        if (!anstNr) anstNr = VR.anstNr || '';
        if (!namn) namn = VR.userName || VR.anstNamn || '';

        // Try one more capture from CurrentUser div for anstNr
        if (!anstNr) {
            var cuDiv = document.querySelector('div.CurrentUser');
            if (cuDiv) {
                var cuMatch = (cuDiv.textContent || '').match(/^(\d{6})/);
                if (cuMatch) anstNr = cuMatch[1];
            }
        }

        console.log('VR: Export view user info - anstNr:', anstNr, 'namn:', namn);

        var schemaCount = VR.allSchemaData ? Object.keys(VR.allSchemaData).length : 0;
        var fpfpvCount = VR.fpfpvData ? VR.fpfpvData.length : 0;

        var html = '<style>\
.vr-export-container{width:100%;padding:0 16px;box-sizing:border-box}\
.vr-export-header{background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:40px 28px;margin-bottom:24px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)}\
.vr-export-header-title{font-size:38px;font-weight:700;color:#fff;margin-bottom:12px}\
.vr-export-header-sub{font-size:20px;color:rgba(255,255,255,0.7)}\
.vr-export-user{display:flex;align-items:center;gap:20px;background:#fff;border-radius:20px;padding:28px;margin-bottom:20px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}\
.vr-export-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#fff;flex-shrink:0}\
.vr-export-user-info{flex:1;min-width:0}\
.vr-export-user-name{font-size:26px;font-weight:700;color:#1a1a2e;word-wrap:break-word}\
.vr-export-user-id{font-size:18px;color:#666;margin-top:6px}\
.vr-export-stats{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}\
.vr-export-stat-card{background:#fff;border-radius:20px;padding:28px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06)}\
.vr-export-stat-icon{font-size:48px;margin-bottom:12px}\
.vr-export-stat-num{font-size:44px;font-weight:700;color:#1a1a2e}\
.vr-export-stat-label{font-size:18px;color:#666;margin-top:8px}\
.vr-export-actions{background:#fff;border-radius:20px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:20px}\
.vr-export-btn{width:100%;padding:22px;border:none;border-radius:16px;font-size:20px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:12px}\
.vr-export-btn.primary{background:linear-gradient(135deg,#34C759 0%,#30D158 100%);color:#fff;margin-bottom:16px}\
.vr-export-btn.primary:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(52,199,89,0.4)}\
.vr-export-btn.secondary{background:#f0f0f0;color:#666}\
.vr-export-btn.secondary:hover{background:#e5e5e5}\
.vr-export-btn.danger{background:linear-gradient(135deg,#FF3B30 0%,#FF453A 100%);color:#fff}\
.vr-export-status{text-align:center;padding:20px;font-size:18px;border-radius:14px;margin-bottom:16px}\
.vr-export-status.success{background:#E8F5E9;color:#2E7D32}\
.vr-export-status.error{background:#FFEBEE;color:#C62828}\
.vr-export-status.loading{background:#E3F2FD;color:#1565C0}\
.vr-export-danger-zone{background:#fff;border-radius:20px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:2px solid #FFEBEE}\
</style>';

        html += '<div class="vr-export-container">';

        // Header
        html += '<div class="vr-export-header">';
        html += '<div class="vr-export-header-title">📤 Exportera</div>';
        html += '<div class="vr-export-header-sub">Dela ditt schema med kollegor</div>';
        html += '</div>';

        // User info (non-editable)
        html += '<div class="vr-export-user">';
        html += '<div class="vr-export-avatar">' + VR.getInitials(namn) + '</div>';
        html += '<div class="vr-export-user-info">';
        html += '<div class="vr-export-user-name">' + (namn || 'Okänt namn') + '</div>';
        html += '<div class="vr-export-user-id">Anst.nr: ' + (anstNr || '—') + '</div>';
        html += '</div>';
        html += '</div>';

        // Hidden inputs for export functions
        html += '<input type="hidden" id="vrExportAnstNr" value="' + anstNr + '">';
        html += '<input type="hidden" id="vrExportNamn" value="' + namn + '">';

        // Stats
        html += '<div class="vr-export-stats">';
        html += '<div class="vr-export-stat-card">';
        html += '<div class="vr-export-stat-icon">📅</div>';
        html += '<div class="vr-export-stat-num">' + schemaCount + '</div>';
        html += '<div class="vr-export-stat-label">Schemadagar</div>';
        html += '</div>';
        html += '<div class="vr-export-stat-card">';
        html += '<div class="vr-export-stat-icon">🏖️</div>';
        html += '<div class="vr-export-stat-num">' + fpfpvCount + '</div>';
        html += '<div class="vr-export-stat-label">FP/FPV-dagar</div>';
        html += '</div>';
        html += '</div>';

        // Export actions
        html += '<div class="vr-export-actions">';
        html += '<div id="vrExportStatus"></div>';
        html += '<button id="vrExportBtn" class="vr-export-btn primary" onclick="VR.executeExport()">';
        html += '<span>🚀</span> Exportera till Vem jobbar idag?</button>';
        html += '<button class="vr-export-btn secondary" onclick="VR.downloadCSV()">';
        html += '<span>💾</span> Exportera manuellt (CSV)</button>';
        html += '</div>';

        // Delete data button
        html += '<div class="vr-export-danger-zone">';
        html += '<button class="vr-export-btn danger" onclick="VR.confirmDeleteFirebaseData()">';
        html += '<span>🗑️</span> Radera din uppladdade data</button>';
        html += '</div>';

        html += '</div>';

        VR.showView('', '', html);
    };

    // ===== EXECUTE EXPORT =====
    VR.executeExport = function() {
        var anstNr = document.getElementById('vrExportAnstNr').value.trim();
        var namn = document.getElementById('vrExportNamn').value.trim();
        var statusEl = document.getElementById('vrExportStatus');
        var btnEl = document.getElementById('vrExportBtn');

        if (!anstNr || !namn) {
            statusEl.innerHTML = '<div class="vr-export-status error">Användardata saknas</div>';
            return;
        }

        // Save user info
        if (VR.setFirebaseUser) {
            VR.setFirebaseUser(anstNr, namn);
        }

        statusEl.innerHTML = '<div class="vr-export-status loading">⏳ Ansluter till Firebase...</div>';
        btnEl.disabled = true;

        // Initialize Firebase
        VR.initFirebase(function(success) {
            if (!success) {
                statusEl.innerHTML = '<div class="vr-export-status error">❌ Kunde inte ansluta till Firebase</div>';
                btnEl.disabled = false;
                return;
            }

            statusEl.innerHTML = '<div class="vr-export-status loading">⏳ Laddar upp data...</div>';

            // Upload combined data
            VR.uploadAllDataToFirebase(anstNr, namn, function(success, message) {
                if (success) {
                    statusEl.innerHTML = '<div class="vr-export-status success">✅ ' + message + '</div>';
                } else {
                    statusEl.innerHTML = '<div class="vr-export-status error">❌ ' + message + '</div>';
                }
                btnEl.disabled = false;
            });
        });
    };

    // ===== UPLOAD ALL DATA (Vem jobbar idag? format) =====
    VR.uploadAllDataToFirebase = function(anstNr, namn, callback) {
        if (!VR.firebaseReady || !VR.firebaseDb) {
            if (callback) callback(false, 'Firebase ej redo');
            return;
        }

        try {
            // Prepare combined schedule data grouped by ISO date
            var scheduleByDate = {}; // { "2026-02-01": { time, badge, badgeText }, ... }

            // Add schema data
            if (VR.allSchemaData) {
                for (var dateKey in VR.allSchemaData) {
                    if (VR.allSchemaData.hasOwnProperty(dateKey)) {
                        var entries = VR.allSchemaData[dateKey];
                        if (entries && entries.length > 0) {
                            // Find the header entry (has isHeader flag) or first entry with data
                            var entry = null;
                            for (var i = 0; i < entries.length; i++) {
                                if (entries[i].isHeader) {
                                    entry = entries[i];
                                    break;
                                }
                            }
                            if (!entry) entry = entries[0];

                            // Get tur from tn, fallback to ps
                            var tur = entry.tn || entry.ps || '';
                            var tid = entry.pr || '-';

                            // Convert DD-MM-YYYY to YYYY-MM-DD
                            var parts = dateKey.split('-');
                            var isoDate = parts[2] + '-' + parts[1] + '-' + parts[0];

                            scheduleByDate[isoDate] = {
                                time: tid,
                                badge: VR.getBadgeType(tur, entry.cd),
                                badgeText: tur
                            };
                        }
                    }
                }
            }

            // Add FP/FPV data (overwrite schema if exists)
            if (VR.fpfpvData) {
                var monthToNum = {
                    'Januari': '01', 'Februari': '02', 'Mars': '03', 'April': '04',
                    'Maj': '05', 'Juni': '06', 'Juli': '07', 'Augusti': '08',
                    'September': '09', 'Oktober': '10', 'November': '11', 'December': '12'
                };

                VR.fpfpvData.forEach(function(fp) {
                    var year = fp.ar || 2026;
                    var monthNum = monthToNum[fp.manad] || '01';
                    var dayNum = ('0' + fp.dag).slice(-2);
                    var isoDate = year + '-' + monthNum + '-' + dayNum;

                    scheduleByDate[isoDate] = {
                        time: '-',
                        badge: VR.getBadgeType(fp.visas, ''),
                        badgeText: fp.visas
                    };
                });
            }

            var dates = Object.keys(scheduleByDate);
            console.log('VR: Uploading', dates.length, 'days to Firebase (Vem jobbar idag? format)');

            // Step 1: Save employee
            var employeeRef = VR.firebaseDb.collection('employees').doc(anstNr);
            employeeRef.set({
                employeeId: anstNr,
                name: namn,
                initials: VR.getInitials(namn),
                color: 'blue'
            }).then(function() {
                console.log('VR: Employee saved');

                // Step 2: Upload each day's schedule
                var completed = 0;
                var errors = [];

                dates.forEach(function(isoDate) {
                    var dayData = scheduleByDate[isoDate];
                    var scheduleRef = VR.firebaseDb.collection('schedules').doc(isoDate);

                    // Get existing shifts, merge with new
                    scheduleRef.get().then(function(doc) {
                        var shifts = doc.exists ? (doc.data().shifts || []) : [];

                        // Remove old shifts for this employee
                        shifts = shifts.filter(function(s) { return s.employeeId !== anstNr; });

                        // Add new shift
                        shifts.push({
                            employeeId: anstNr,
                            time: dayData.time,
                            badge: dayData.badge,
                            badgeText: dayData.badgeText
                        });

                        // Save back
                        return scheduleRef.set({ shifts: shifts });
                    }).then(function() {
                        completed++;
                        if (completed === dates.length) {
                            if (errors.length > 0) {
                                if (callback) callback(false, 'Delvis fel: ' + errors.join(', '));
                            } else {
                                console.log('VR: Upload successful');
                                if (callback) callback(true, dates.length + ' dagar uppladdade');
                            }
                        }
                    }).catch(function(error) {
                        console.log('VR: Error uploading', isoDate, error);
                        errors.push(isoDate);
                        completed++;
                        if (completed === dates.length) {
                            if (callback) callback(false, 'Fel vid uppladdning: ' + errors.length + ' dagar misslyckades');
                        }
                    });
                });

                // Handle empty schedule
                if (dates.length === 0) {
                    if (callback) callback(true, 'Anställd sparad (inget schema)');
                }

            }).catch(function(error) {
                console.log('VR: Error saving employee:', error);
                if (callback) callback(false, 'Kunde inte spara anställd: ' + (error.message || error));
            });

        } catch (e) {
            console.log('VR: Export exception:', e);
            if (callback) callback(false, 'Fel: ' + (e.message || e));
        }
    };

    // ===== DOWNLOAD AS CSV =====
    VR.downloadCSV = function() {
        var anstNr = document.getElementById('vrExportAnstNr').value.trim() || 'unknown';
        var namn = document.getElementById('vrExportNamn').value.trim() || 'Unknown';

        var csv = 'Anställningsnr: ' + anstNr + '\n';
        csv += 'Namn: ' + namn + '\n\n';
        csv += 'Datum;Tjänst;Tid\n';

        var rows = [];

        // Add schema data
        if (VR.allSchemaData) {
            for (var dateKey in VR.allSchemaData) {
                if (VR.allSchemaData.hasOwnProperty(dateKey)) {
                    var entries = VR.allSchemaData[dateKey];
                    if (entries && entries.length > 0) {
                        // Find the header entry (has isHeader flag) or first entry with data
                        var entry = null;
                        for (var i = 0; i < entries.length; i++) {
                            if (entries[i].isHeader) {
                                entry = entries[i];
                                break;
                            }
                        }
                        if (!entry) entry = entries[0];

                        // Convert DD-MM-YYYY to YYYY-MM-DD
                        var parts = dateKey.split('-');
                        var isoDate = parts[2] + '-' + parts[1] + '-' + parts[0];

                        // tn = turnummer (kolumn 9), ps = sträcka, pr = tid
                        // Fallback: if tn empty, try ps
                        var tur = entry.tn || entry.ps || '';

                        rows.push({
                            date: isoDate,
                            tjanst: tur,
                            tid: entry.pr || ''
                        });
                    }
                }
            }
        }

        // Add FP/FPV data
        if (VR.fpfpvData) {
            var monthToNum = {
                'Januari': '01', 'Februari': '02', 'Mars': '03', 'April': '04',
                'Maj': '05', 'Juni': '06', 'Juli': '07', 'Augusti': '08',
                'September': '09', 'Oktober': '10', 'November': '11', 'December': '12'
            };

            VR.fpfpvData.forEach(function(fp) {
                var year = fp.ar || 2026;
                var monthNum = monthToNum[fp.manad] || '01';
                var dayNum = ('0' + fp.dag).slice(-2);
                var isoDate = year + '-' + monthNum + '-' + dayNum;

                // Check if already exists
                var exists = rows.some(function(r) { return r.date === isoDate; });

                if (!exists) {
                    rows.push({
                        date: isoDate,
                        tjanst: fp.visas,
                        tid: ''
                    });
                } else {
                    // Update existing
                    rows.forEach(function(r) {
                        if (r.date === isoDate) {
                            r.tjanst = fp.visas;
                        }
                    });
                }
            });
        }

        // Sort by date
        rows.sort(function(a, b) {
            return a.date.localeCompare(b.date);
        });

        // Build CSV
        rows.forEach(function(r) {
            csv += r.date + ';' + r.tjanst + ';' + r.tid + '\n';
        });

        // Download
        var blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'schema-' + anstNr + '.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('VR: Downloaded CSV with', rows.length, 'rows');
    };

    // ===== CONFIRM DELETE =====
    VR.confirmDeleteFirebaseData = function() {
        var modal = document.createElement('div');
        modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999999;display:flex;align-items:center;justify-content:center;padding:20px';
        modal.innerHTML = '\
            <div style="background:#fff;border-radius:20px;padding:30px;max-width:400px;text-align:center">\
                <div style="font-size:48px;margin-bottom:16px">⚠️</div>\
                <div style="font-size:22px;font-weight:700;color:#1a1a2e;margin-bottom:12px">Ta bort all data?</div>\
                <div style="font-size:16px;color:#666;margin-bottom:24px">Detta tar bort ditt schema och all data från Firebase. Åtgärden kan inte ångras.</div>\
                <div style="display:flex;gap:12px">\
                    <button onclick="this.closest(\'div[style*=fixed]\').remove()" style="flex:1;padding:14px;border:none;border-radius:12px;font-size:16px;font-weight:600;background:#f0f0f0;color:#666;cursor:pointer">Avbryt</button>\
                    <button onclick="VR.executeDeleteFirebaseData();this.closest(\'div[style*=fixed]\').remove()" style="flex:1;padding:14px;border:none;border-radius:12px;font-size:16px;font-weight:600;background:#FF3B30;color:#fff;cursor:pointer">Ta bort</button>\
                </div>\
            </div>';
        document.body.appendChild(modal);
    };

    // ===== EXECUTE DELETE =====
    VR.executeDeleteFirebaseData = function() {
        var statusEl = document.getElementById('vrExportStatus');
        if (statusEl) {
            statusEl.innerHTML = '<div class="vr-export-status">⏳ Tar bort data...</div>';
        }

        VR.initFirebase(function(success) {
            if (!success) {
                if (statusEl) statusEl.innerHTML = '<div class="vr-export-error">Kunde inte ansluta till Firebase</div>';
                return;
            }

            VR.deleteMyFirebaseData(function(success, message) {
                if (statusEl) {
                    if (success) {
                        statusEl.innerHTML = '<div class="vr-export-success">✅ ' + message + '</div>';
                    } else {
                        statusEl.innerHTML = '<div class="vr-export-error">❌ ' + message + '</div>';
                    }
                }
            });
        });
    };

    console.log('VR: Export module loaded (V.1.47)');
})();
