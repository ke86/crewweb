// VR CrewWeb - Export to Firebase - V.1.39
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

    // ===== EXPORT VIEW =====
    VR.doExport = function() {
        VR.stopTimer();
        VR.closeOverlay();

        var user = VR.getFirebaseUser ? VR.getFirebaseUser() : null;
        var anstNr = user ? user.anstNr : (VR.anstNr || '');
        var namn = user ? user.namn : (VR.userName || '');

        // Check if we have schema data
        var schemaCount = VR.allSchemaData ? Object.keys(VR.allSchemaData).length : 0;
        var fpfpvCount = VR.fpfpvData ? VR.fpfpvData.length : 0;

        var html = '<style>\
.vr-export-container{max-width:600px;margin:0 auto}\
.vr-export-card{background:#fff;border-radius:20px;padding:24px;margin-bottom:16px;box-shadow:0 2px 12px rgba(0,0,0,0.08)}\
.vr-export-title{font-size:24px;font-weight:700;color:#1a1a2e;margin-bottom:8px}\
.vr-export-subtitle{font-size:16px;color:#666;margin-bottom:20px}\
.vr-export-stat{display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid #f0f0f0}\
.vr-export-stat:last-child{border-bottom:none}\
.vr-export-stat-label{font-size:16px;color:#666}\
.vr-export-stat-value{font-size:16px;font-weight:600;color:#1a1a2e}\
.vr-export-stat-value.missing{color:#FF3B30}\
.vr-export-stat-value.ok{color:#34C759}\
.vr-export-btn{width:100%;padding:18px;border:none;border-radius:14px;font-size:18px;font-weight:600;cursor:pointer;margin-top:12px;transition:all 0.2s}\
.vr-export-btn.primary{background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#fff}\
.vr-export-btn.primary:disabled{background:#ccc;cursor:not-allowed}\
.vr-export-btn.secondary{background:#f0f0f0;color:#666}\
.vr-export-btn.danger{background:#FF3B30;color:#fff}\
.vr-export-status{text-align:center;padding:20px;font-size:16px;color:#666}\
.vr-export-input{width:100%;padding:14px;border:2px solid #e0e0e0;border-radius:12px;font-size:16px;margin-bottom:12px;box-sizing:border-box}\
.vr-export-input:focus{border-color:#667eea;outline:none}\
.vr-export-label{font-size:14px;font-weight:600;color:#666;margin-bottom:6px;display:block}\
.vr-export-success{background:#E8F5E9;border-radius:12px;padding:16px;text-align:center;color:#2E7D32}\
.vr-export-error{background:#FFEBEE;border-radius:12px;padding:16px;text-align:center;color:#C62828}\
</style>';

        html += '<div class="vr-export-container">';

        // User info card
        html += '<div class="vr-export-card">';
        html += '<div class="vr-export-title">📤 Exportera till Firebase</div>';
        html += '<div class="vr-export-subtitle">Ladda upp ditt schema så att det kan delas</div>';

        html += '<label class="vr-export-label">Anställningsnummer</label>';
        html += '<input type="text" id="vrExportAnstNr" class="vr-export-input" value="' + anstNr + '" placeholder="T.ex. 302113">';

        html += '<label class="vr-export-label">Namn</label>';
        html += '<input type="text" id="vrExportNamn" class="vr-export-input" value="' + namn + '" placeholder="T.ex. Kenny Eriksson">';

        html += '</div>';

        // Data status card
        html += '<div class="vr-export-card">';
        html += '<div class="vr-export-title">📊 Data att exportera</div>';

        html += '<div class="vr-export-stat">';
        html += '<span class="vr-export-stat-label">Schema-dagar</span>';
        html += '<span class="vr-export-stat-value ' + (schemaCount > 0 ? 'ok' : 'missing') + '">' + (schemaCount > 0 ? schemaCount + ' dagar' : 'Ej laddat') + '</span>';
        html += '</div>';

        html += '<div class="vr-export-stat">';
        html += '<span class="vr-export-stat-label">FP/FPV-dagar</span>';
        html += '<span class="vr-export-stat-value ' + (fpfpvCount > 0 ? 'ok' : 'missing') + '">' + (fpfpvCount > 0 ? fpfpvCount + ' dagar' : 'Ej laddat') + '</span>';
        html += '</div>';

        if (schemaCount === 0) {
            html += '<button class="vr-export-btn secondary" onclick="VR.doSchema()">Ladda Schema först</button>';
        }
        if (fpfpvCount === 0) {
            html += '<button class="vr-export-btn secondary" onclick="VR.doFPFPV()">Ladda FP/FPV först</button>';
        }

        html += '</div>';

        // Export button card
        html += '<div class="vr-export-card">';
        html += '<div id="vrExportStatus"></div>';

        var canExport = schemaCount > 0 || fpfpvCount > 0;
        html += '<button id="vrExportBtn" class="vr-export-btn primary" ' + (canExport ? '' : 'disabled') + ' onclick="VR.executeExport()">📤 Exportera till Firebase</button>';

        html += '<button class="vr-export-btn secondary" onclick="VR.downloadCSV()" style="margin-top:8px">💾 Ladda ner som CSV</button>';

        html += '</div>';

        // Delete data card
        html += '<div class="vr-export-card">';
        html += '<div class="vr-export-title">🗑️ Ta bort min data</div>';
        html += '<div class="vr-export-subtitle">Radera all din data från Firebase</div>';
        html += '<button class="vr-export-btn danger" onclick="VR.confirmDeleteFirebaseData()">Ta bort all min data</button>';
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

        if (!anstNr) {
            statusEl.innerHTML = '<div class="vr-export-error">Ange anställningsnummer</div>';
            return;
        }

        if (!namn) {
            statusEl.innerHTML = '<div class="vr-export-error">Ange namn</div>';
            return;
        }

        // Save user info
        if (VR.setFirebaseUser) {
            VR.setFirebaseUser(anstNr, namn);
        }

        statusEl.innerHTML = '<div class="vr-export-status">⏳ Ansluter till Firebase...</div>';
        btnEl.disabled = true;

        // Initialize Firebase
        VR.initFirebase(function(success) {
            if (!success) {
                statusEl.innerHTML = '<div class="vr-export-error">Kunde inte ansluta till Firebase</div>';
                btnEl.disabled = false;
                return;
            }

            statusEl.innerHTML = '<div class="vr-export-status">⏳ Laddar upp data...</div>';

            // Upload combined data
            VR.uploadAllDataToFirebase(anstNr, namn, function(success, message) {
                if (success) {
                    statusEl.innerHTML = '<div class="vr-export-success">✅ ' + message + '</div>';
                } else {
                    statusEl.innerHTML = '<div class="vr-export-error">❌ ' + message + '</div>';
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

    console.log('VR: Export module loaded (V.1.39)');
})();
