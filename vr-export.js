// VR CrewWeb - Export to Firebase - V.1.40
(function() {
    'use strict';

    var VR = window.VR;

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

    // ===== EXPORT VIEW (with auto-load) =====
    VR.doExport = function() {
        VR.stopTimer();
        VR.closeOverlay();

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
        // Navigate to FP/FPV page
        VR.clickFolder();
        setTimeout(function() {
            var n = 0;
            var findTimer = setInterval(function() {
                n++;
                var el = VR.findMenuItem('FP-förläggning');
                if (el) {
                    clearInterval(findTimer);
                    VR.updateLoader(60, 'Öppnar FP-förläggning...');
                    el.click();
                    VR.waitForFPFPVForExport(callback);
                } else if (n > 20) {
                    clearInterval(findTimer);
                    console.log('VR: Could not find FP-förläggning menu');
                    if (callback) callback();
                }
            }, 400);
        }, 600);
    };

    // ===== WAIT FOR FP/FPV FOR EXPORT =====
    VR.waitForFPFPVForExport = function(callback) {
        var n = 0;
        var waitTimer = setInterval(function() {
            n++;
            VR.updateLoader(65 + Math.min(n, 20), 'Väntar på FP-data...');

            // Look for GridCell elements
            var cells = document.querySelectorAll('.GridCell');
            if (cells.length > 10) {
                clearInterval(waitTimer);
                VR.updateLoader(90, 'Parsar FP-data...');
                setTimeout(function() {
                    VR.parseFPFPVForExport();
                    if (callback) callback();
                }, 500);
            } else if (n > 40) {
                clearInterval(waitTimer);
                console.log('VR: Timeout waiting for FP/FPV data');
                if (callback) callback();
            }
        }, 400);
    };

    // ===== PARSE FP/FPV FOR EXPORT =====
    VR.parseFPFPVForExport = function() {
        var cells = document.querySelectorAll('.GridCell');
        var fpData = [];

        cells.forEach(function(cell) {
            var txt = cell.textContent.trim().toUpperCase();
            if (txt === 'FP' || txt === 'FPV' || txt === 'FV' || txt === 'FP2') {
                var style = cell.getAttribute('style') || '';
                var topMatch = style.match(/top:\s*([\d.]+)px/);
                var leftMatch = style.match(/left:\s*([\d.]+)px/);

                if (topMatch && leftMatch) {
                    var top = parseFloat(topMatch[1]);
                    var left = parseFloat(leftMatch[1]);
                    var row = Math.round((top - 20) / 21);
                    var col = Math.round((left - 3) / 26);

                    if (row >= 0 && row < 12 && col >= 1 && col <= 31) {
                        fpData.push({
                            manad: VR.MONTHS[row],
                            dag: col,
                            ar: 2026,
                            visas: txt === 'FV' ? 'FPV' : txt
                        });
                    }
                }
            }
        });

        VR.fpfpvData = fpData;
        console.log('VR: Parsed', fpData.length, 'FP/FPV days for export');
    };

    // ===== SHOW EXPORT VIEW =====
    VR.showExportView = function() {
        var user = VR.getFirebaseUser ? VR.getFirebaseUser() : null;
        var anstNr = user ? user.anstNr : (VR.anstNr || '');
        var namn = user ? user.namn : (VR.userName || '');

        var schemaCount = VR.allSchemaData ? Object.keys(VR.allSchemaData).length : 0;
        var fpfpvCount = VR.fpfpvData ? VR.fpfpvData.length : 0;

        var html = '<style>\
.vr-export-header{background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:28px;margin-bottom:16px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.15)}\
.vr-export-header-title{font-size:28px;font-weight:700;color:#fff;margin-bottom:8px}\
.vr-export-header-sub{font-size:16px;color:rgba(255,255,255,0.7)}\
.vr-export-user{display:flex;align-items:center;gap:16px;background:#fff;border-radius:16px;padding:20px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,0.06)}\
.vr-export-avatar{width:60px;height:60px;border-radius:50%;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:#fff}\
.vr-export-user-info{flex:1}\
.vr-export-user-name{font-size:20px;font-weight:700;color:#1a1a2e}\
.vr-export-user-id{font-size:14px;color:#666;margin-top:2px}\
.vr-export-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}\
.vr-export-stat-card{background:#fff;border-radius:16px;padding:20px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,0.06)}\
.vr-export-stat-icon{font-size:32px;margin-bottom:8px}\
.vr-export-stat-num{font-size:28px;font-weight:700;color:#1a1a2e}\
.vr-export-stat-label{font-size:14px;color:#666;margin-top:4px}\
.vr-export-actions{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);margin-bottom:12px}\
.vr-export-btn{width:100%;padding:18px;border:none;border-radius:14px;font-size:18px;font-weight:600;cursor:pointer;transition:all 0.2s;display:flex;align-items:center;justify-content:center;gap:10px}\
.vr-export-btn.primary{background:linear-gradient(135deg,#34C759 0%,#30D158 100%);color:#fff;margin-bottom:12px}\
.vr-export-btn.primary:hover{transform:translateY(-2px);box-shadow:0 4px 12px rgba(52,199,89,0.4)}\
.vr-export-btn.secondary{background:#f0f0f0;color:#666}\
.vr-export-btn.secondary:hover{background:#e5e5e5}\
.vr-export-btn.danger{background:linear-gradient(135deg,#FF3B30 0%,#FF453A 100%);color:#fff}\
.vr-export-status{text-align:center;padding:16px;font-size:16px;border-radius:12px;margin-bottom:12px}\
.vr-export-status.success{background:#E8F5E9;color:#2E7D32}\
.vr-export-status.error{background:#FFEBEE;color:#C62828}\
.vr-export-status.loading{background:#E3F2FD;color:#1565C0}\
.vr-export-danger-zone{background:#fff;border-radius:16px;padding:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:2px solid #FFEBEE}\
.vr-export-danger-title{font-size:16px;font-weight:600;color:#C62828;margin-bottom:8px}\
.vr-export-danger-text{font-size:14px;color:#666;margin-bottom:16px}\
</style>';

        html += '<div style="max-width:500px;margin:0 auto">';

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

        // Danger zone
        html += '<div class="vr-export-danger-zone">';
        html += '<div class="vr-export-danger-title">⚠️ Farozon</div>';
        html += '<div class="vr-export-danger-text">Ta bort all din data från Vem jobbar idag?</div>';
        html += '<button class="vr-export-btn danger" onclick="VR.confirmDeleteFirebaseData()">';
        html += '<span>🗑️</span> Ta bort min data</button>';
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

    console.log('VR: Export module loaded (V.1.40)');
})();
