// VR CrewWeb - Who's Working Today
(function() {
    'use strict';

    var VR = window.VR;

    // ===== STATE =====
    VR.whosWorkingMonth = null;
    VR.whosWorkingYear = null;
    VR.whosWorkingViewMode = 'day'; // 'day' or 'month'

    // ===== MAIN ENTRY POINT =====
    VR.doWhosWorking = function() {
        VR.stopTimer();
        VR.closeOverlay();
        VR.closeMenu();

        // Initialize to current month
        var now = new Date();
        VR.whosWorkingMonth = now.getMonth();
        VR.whosWorkingYear = now.getFullYear();

        // Check if authenticated
        if (!VR.isFirebaseAuthenticated()) {
            VR.showWhosWorkingLogin();
            return;
        }

        // Auto-register user if we have data from CrewWeb
        VR.autoRegisterUser();

        // Show the main view
        VR.showWhosWorkingView();
    };

    // ===== AUTO REGISTER USER =====
    VR.autoRegisterUser = function() {
        var user = VR.getFirebaseUser();

        // If already registered, check if we need to update
        if (user && user.anstNr) {
            // Update name if we have a better one from CrewWeb
            if (VR.anstNamn && VR.anstNamn !== user.namn) {
                VR.setFirebaseUser(user.anstNr, VR.anstNamn);
            }
            return;
        }

        // Auto-register from CrewWeb data
        var anstNr = VR.anstNr || '';
        var namn = VR.anstNamn || '';

        if (anstNr && namn) {
            VR.setFirebaseUser(anstNr, namn);
            console.log('VR: Auto-registered user:', namn, '(' + anstNr + ')');
        }
    };

    // ===== FP/FP-V BADGE HELPERS =====
    VR.isFPV = function(ps) {
        if (!ps) return false;
        var p = ps.toUpperCase();
        return p === 'FV' || p === 'FP2' || p === 'FP-V' ||
               p.indexOf('FP-V') > -1 || p.indexOf('FP2') > -1;
    };

    VR.getFPBadgeHtml = function(ps, size) {
        var isFPV = VR.isFPV(ps);
        var text = isFPV ? 'FP-V' : 'FP';

        if (size === 'mini') {
            return '<span style="display:inline-block;background:#16A34A;color:#fff;font-size:12px;font-weight:700;padding:2px 6px;border-radius:5px">' + text + '</span>';
        } else if (size === 'small') {
            return '<span style="display:inline-block;background:#16A34A;color:#fff;font-size:14px;font-weight:700;padding:3px 8px;border-radius:6px">' + text + '</span>';
        } else if (size === 'medium') {
            return '<span style="display:inline-block;background:#16A34A;color:#fff;font-size:18px;font-weight:700;padding:6px 14px;border-radius:8px">' + text + '</span>';
        }
        // Default/large
        return '<span style="display:inline-block;background:#16A34A;color:#fff;font-size:22px;font-weight:700;padding:8px 16px;border-radius:10px">' + text + '</span>';
    };

    VR.getFPTypeText = function(ps) {
        if (VR.isFPV(ps)) {
            return 'Semester (FP-V)';
        }
        return 'Fridag (FP)';
    };

    // ===== PARSE START TIME FOR SORTING =====
    VR.parseStartTime = function(tid) {
        if (!tid) return 9999; // No time = sort last among workers
        var match = tid.match(/(\d{2}):(\d{2})/);
        if (match) {
            return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
        }
        return 9999;
    };

    // ===== LOGIN SCREEN =====
    VR.showWhosWorkingLogin = function() {
        var html = '<div style="background:#fff;border-radius:27px;padding:40px;box-shadow:0 5px 20px rgba(0,0,0,0.08);max-width:400px;margin:0 auto">';
        html += '<div style="text-align:center;margin-bottom:30px">';
        html += '<div style="font-size:60px;margin-bottom:16px">🔐</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#333">Vem jobbar idag?</div>';
        html += '<div style="font-size:18px;color:#888;margin-top:8px">Ange lösenord för att fortsätta</div>';
        html += '</div>';

        html += '<div style="margin-bottom:20px">';
        html += '<input type="password" id="vrFbPassword" placeholder="Lösenord" style="width:100%;padding:16px;font-size:20px;border:2px solid #E5E5E5;border-radius:14px;box-sizing:border-box">';
        html += '</div>';

        html += '<div id="vrFbLoginError" style="color:#FF3B30;font-size:16px;text-align:center;margin-bottom:16px;display:none">Fel lösenord</div>';

        html += '<button id="vrFbLoginBtn" style="width:100%;padding:18px;font-size:22px;font-weight:600;color:#fff;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border:none;border-radius:14px;cursor:pointer">Logga in</button>';
        html += '</div>';

        VR.showView('', '', html);

        // Bind events
        setTimeout(function() {
            var passInput = document.getElementById('vrFbPassword');
            var loginBtn = document.getElementById('vrFbLoginBtn');
            var errorEl = document.getElementById('vrFbLoginError');

            if (loginBtn) {
                loginBtn.onclick = function() {
                    var password = passInput ? passInput.value : '';
                    if (VR.authenticateFirebase(password)) {
                        VR.doWhosWorking(); // Reload
                    } else {
                        if (errorEl) errorEl.style.display = 'block';
                        if (passInput) passInput.style.borderColor = '#FF3B30';
                    }
                };
            }

            if (passInput) {
                passInput.onkeypress = function(e) {
                    if (e.key === 'Enter') {
                        loginBtn.click();
                    }
                };
                passInput.focus();
            }
        }, 100);
    };

    // ===== MAIN VIEW =====
    VR.showWhosWorkingView = function() {
        VR.showLoader('Laddar kollegor');
        VR.updateLoader(20, 'Ansluter till Firebase...');

        // Initialize Firebase
        VR.initFirebase(function(success) {
            if (!success) {
                VR.hideLoader();
                VR.showWhosWorkingError('Kunde inte ansluta till Firebase');
                return;
            }

            VR.updateLoader(50, 'Hämtar scheman...');

            // Get today's date string
            var today = new Date();
            var todayStr = ('0' + today.getDate()).slice(-2) + '-' +
                           ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                           today.getFullYear();

            // Get schedules for today
            VR.getSchedulesForDate(todayStr, function(schedules) {
                VR.updateLoader(90, 'Bygger vy...');

                setTimeout(function() {
                    VR.hideLoader();
                    VR.whosWorkingViewMode = 'day';
                    VR.renderWhosWorkingView(schedules, todayStr);
                }, 200);
            });
        });
    };

    // ===== GET CURRENT USER NAME =====
    VR.getCurrentUserName = function() {
        // Priority: 1. Firebase user, 2. Try to find from CrewWeb page, 3. Cache
        var user = VR.getFirebaseUser();
        if (user && user.namn) {
            return user.namn;
        }

        // Try to find user name from CrewWeb page (look in topbar or employee data)
        try {
            // Look for employee name in page - often in a specific element
            var allLabels = document.querySelectorAll('label, span, div');
            for (var i = 0; i < allLabels.length; i++) {
                var el = allLabels[i];
                var text = el.textContent || '';
                // CrewWeb often shows "Namn: Förnamn Efternamn" or similar
                if (text.indexOf('Namn:') > -1 || text.indexOf('Name:') > -1) {
                    var match = text.match(/(?:Namn|Name):\s*([A-ZÅÄÖa-zåäö]+ [A-ZÅÄÖa-zåäö]+)/);
                    if (match && match[1]) {
                        return match[1];
                    }
                }
            }

            // Look in input fields that might have the user's name
            var inputs = document.querySelectorAll('input[readonly], input[disabled]');
            for (var j = 0; j < inputs.length; j++) {
                var input = inputs[j];
                var val = input.value || '';
                // Check if it looks like a name (two words, capitalized)
                if (/^[A-ZÅÄÖ][a-zåäö]+ [A-ZÅÄÖ][a-zåäö]+$/.test(val)) {
                    return val;
                }
            }
        } catch (e) {
            console.log('VR: Error finding user name from page', e);
        }

        return 'Okänd';
    };

    // ===== RENDER HEADER BAR (iOS style) =====
    VR.renderWhosWorkingHeader = function(isMonthView) {
        var userName = VR.getCurrentUserName();

        // Shorten name to first name + initial
        var shortName = userName;
        var nameParts = userName.split(' ');
        if (nameParts.length > 1) {
            shortName = nameParts[0] + ' ' + nameParts[1].charAt(0) + '.';
        }

        var html = '';
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:#fff;border-radius:16px;padding:12px 16px;margin-bottom:16px;box-shadow:0 2px 8px rgba(0,0,0,0.08);flex-wrap:wrap;gap:10px">';

        // Left: User info
        html += '<div style="display:flex;align-items:center;gap:8px">';
        html += '<span style="font-size:20px">👤</span>';
        html += '<span style="font-size:16px;font-weight:600;color:#333">' + shortName + '</span>';
        html += '</div>';

        // Center: iOS segmented control
        html += '<div style="display:flex;background:#E5E5EA;border-radius:10px;padding:3px">';
        html += '<button id="vrWwDayTab" style="padding:8px 20px;border-radius:8px;border:none;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;' +
                (!isMonthView ? 'background:#fff;color:#333;box-shadow:0 1px 3px rgba(0,0,0,0.1)' : 'background:transparent;color:#666') + '">Idag</button>';
        html += '<button id="vrWwMonthTab" style="padding:8px 20px;border-radius:8px;border:none;font-size:15px;font-weight:600;cursor:pointer;transition:all 0.2s;' +
                (isMonthView ? 'background:#fff;color:#333;box-shadow:0 1px 3px rgba(0,0,0,0.1)' : 'background:transparent;color:#666') + '">Månad</button>';
        html += '</div>';

        // Right: Upload and Delete buttons
        html += '<div style="display:flex;gap:10px">';
        html += '<button id="vrWwUploadBtn" style="display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:12px;border:none;background:linear-gradient(180deg,#34C759 0%,#28a745 100%);color:#fff;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(52,199,89,0.35)">';
        html += '<span style="font-size:18px">📤</span><span>Ladda upp</span>';
        html += '</button>';
        html += '<button id="vrWwDeleteBtn" style="display:flex;align-items:center;gap:8px;padding:12px 18px;border-radius:12px;border:none;background:linear-gradient(180deg,#2C2C3E 0%,#1a1a2e 100%);color:#FF3B30;font-size:15px;font-weight:600;cursor:pointer;box-shadow:0 3px 10px rgba(0,0,0,0.25);border:2px solid rgba(255,59,48,0.3)">';
        html += '<span style="font-size:18px">🗑️</span><span>Radera</span>';
        html += '</button>';
        html += '</div>';

        html += '</div>';

        return html;
    };

    // ===== RENDER MAIN VIEW =====
    VR.renderWhosWorkingView = function(schedules, dateStr) {
        var today = new Date();
        var isToday = dateStr === (('0' + today.getDate()).slice(-2) + '-' +
                                   ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                                   today.getFullYear());

        // Parse date for display
        var parts = dateStr.split('-');
        var dayNum = parseInt(parts[0], 10);
        var monthIdx = parseInt(parts[1], 10) - 1;
        var year = parseInt(parts[2], 10);
        var dateObj = new Date(year, monthIdx, dayNum);
        var weekday = VR.WEEKDAYS[dateObj.getDay()];
        var monthName = VR.MONTHS[monthIdx];

        var html = '';

        // iOS-style header bar
        html += VR.renderWhosWorkingHeader(false);

        // Date navigation header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:16px 24px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">';
        html += '<span id="vrWwPrev" style="font-size:28px;color:#fff;cursor:pointer;padding:8px 12px">◀</span>';
        html += '<div style="text-align:center">';
        html += '<div style="font-size:22px;font-weight:700;color:#fff">' + (isToday ? 'Idag' : weekday) + '</div>';
        html += '<div style="font-size:16px;color:rgba(255,255,255,0.7)">' + dayNum + ' ' + monthName + ' ' + year + '</div>';
        html += '</div>';
        html += '<span id="vrWwNext" style="font-size:28px;color:#fff;cursor:pointer;padding:8px 12px">▶</span>';
        html += '</div>';

        // Schedules list
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        // Add test persons if less than 3 people (for demo purposes)
        if (schedules.length > 0 && schedules.length < 3) {
            schedules.push({
                anstNr: 'TEST001',
                namn: 'Anna Testsson',
                tur: '1124',
                tid: '06:00-15:00',
                ps: 'ARB',
                isFriday: false,
                isTest: true
            });
            schedules.push({
                anstNr: 'TEST002',
                namn: 'Erik Demoberg',
                tur: '1133',
                tid: '14:00-22:30',
                ps: 'ARB',
                isFriday: false,
                isTest: true
            });
        }

        if (schedules.length === 0) {
            html += '<div style="padding:50px;text-align:center">';
            html += '<div style="font-size:60px;margin-bottom:20px">📭</div>';
            html += '<div style="font-size:26px;color:#888">Inga kollegor har laddat upp schema ännu</div>';
            html += '</div>';
        } else {
            // NEW SORTING: Working (by start time) -> Fridag (alphabetically) -> No data
            schedules.sort(function(a, b) {
                // No data always last
                if (a.noData && !b.noData) return 1;
                if (!a.noData && b.noData) return -1;
                if (a.noData && b.noData) return (a.namn || '').localeCompare(b.namn || '');

                // Fridag after working
                if (a.isFriday && !b.isFriday) return 1;
                if (!a.isFriday && b.isFriday) return -1;

                // Both fridag: alphabetically
                if (a.isFriday && b.isFriday) {
                    return (a.namn || '').localeCompare(b.namn || '');
                }

                // Both working: sort by start time
                var timeA = VR.parseStartTime(a.tid);
                var timeB = VR.parseStartTime(b.tid);
                if (timeA !== timeB) return timeA - timeB;

                // Same start time: alphabetically
                return (a.namn || '').localeCompare(b.namn || '');
            });

            for (var i = 0; i < schedules.length; i++) {
                var s = schedules[i];
                var bgCol = i % 2 === 0 ? '#fff' : '#F5F5F7';

                // BIGGER ROW - 100% larger for mobile
                html += '<div style="display:flex;align-items:center;padding:24px 20px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA;gap:12px">';

                if (s.noData) {
                    // No data row - BIGGER
                    html += '<div style="flex:1;font-size:24px;font-weight:600;color:#999">' + (s.namn || 'Okänd') + '</div>';
                    html += '<div style="font-size:20px;color:#999">Ej laddat</div>';
                } else if (s.isFriday) {
                    // Fridag row - BIGGER with FP/FP-V badge
                    html += '<div style="flex:1;font-size:24px;font-weight:700;color:#333">' + (s.namn || 'Okänd') + '</div>';
                    html += '<div style="font-size:20px;color:#16A34A;margin-right:8px">Ledig</div>';
                    html += VR.getFPBadgeHtml(s.ps, 'medium');
                } else {
                    // Working row - NEW LAYOUT: Namn | Tid | Ikon | Turnr - BIGGER
                    var turVal = s.tur || '';
                    var tidVal = s.tid || '';
                    var c3 = turVal.length >= 3 ? turVal.charAt(2) : '';
                    var roleIcon = '';
                    var flagIcon = '';

                    if (c3 === '1' || c3 === '2') roleIcon = '🚂';
                    else if (c3 === '3' || c3 === '4') roleIcon = '🎫';

                    if (c3 === '1' || c3 === '3') flagIcon = '🇸🇪';
                    else if (c3 === '2' || c3 === '4') flagIcon = '🇩🇰';

                    // Namn (flex:1)
                    html += '<div style="flex:1;font-size:24px;font-weight:700;color:#1a1a2e">' + (s.namn || 'Okänd') + '</div>';

                    if (turVal || tidVal) {
                        // Tid - BIG and prominent
                        html += '<div style="font-size:22px;font-weight:700;color:#333;min-width:110px;text-align:center">' + tidVal + '</div>';
                        // Ikoner
                        html += '<div style="font-size:26px;min-width:60px;text-align:center">' + roleIcon + flagIcon + '</div>';
                        // Turnr
                        html += '<div style="font-size:20px;font-weight:600;color:#666;min-width:55px;text-align:right">' + turVal + '</div>';
                    } else {
                        // No tur or tid - show ps if available
                        html += '<div style="font-size:20px;color:#666">' + (s.ps || 'Ingen info') + '</div>';
                    }
                }

                html += '</div>';
            }
        }

        html += '</div>';

        VR.showView('', '', html);
        VR.bindWhosWorkingEvents(dateStr);
    };

    // ===== BIND EVENTS =====
    VR.bindWhosWorkingEvents = function(currentDateStr) {
        setTimeout(function() {
            var prevBtn = document.getElementById('vrWwPrev');
            var nextBtn = document.getElementById('vrWwNext');
            var dayTab = document.getElementById('vrWwDayTab');
            var monthTab = document.getElementById('vrWwMonthTab');
            var uploadBtn = document.getElementById('vrWwUploadBtn');
            var deleteBtn = document.getElementById('vrWwDeleteBtn');

            if (prevBtn) {
                prevBtn.onclick = function() {
                    VR.navigateWhosWorkingDay(currentDateStr, -1);
                };
            }

            if (nextBtn) {
                nextBtn.onclick = function() {
                    VR.navigateWhosWorkingDay(currentDateStr, 1);
                };
            }

            if (dayTab) {
                dayTab.onclick = function() {
                    if (VR.whosWorkingViewMode !== 'day') {
                        var today = new Date();
                        var todayStr = ('0' + today.getDate()).slice(-2) + '-' +
                                       ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                                       today.getFullYear();
                        VR.loadWhosWorkingDate(todayStr);
                    }
                };
            }

            if (monthTab) {
                monthTab.onclick = function() {
                    VR.showWhosWorkingMonth();
                };
            }

            if (uploadBtn) {
                uploadBtn.onclick = function() {
                    VR.showUploadConfirmation();
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = function() {
                    VR.showDeleteConfirmation();
                };
            }
        }, 100);
    };

    // ===== DELETE CONFIRMATION =====
    VR.showDeleteConfirmation = function() {
        var overlay = document.createElement('div');
        overlay.id = 'vrDeleteOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:999999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:24px;padding:36px;max-width:340px;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.5);margin:20px';

        modal.innerHTML = '<div style="font-size:56px;margin-bottom:20px">🗑️</div>' +
            '<div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:14px">Ta bort data?</div>' +
            '<div style="font-size:17px;color:rgba(255,255,255,0.7);margin-bottom:28px;line-height:1.5">All din uppladdade schemainfo kommer att tas bort från Firebase.</div>' +
            '<div style="display:flex;gap:14px;justify-content:center">' +
            '<button id="vrDeleteCancel" style="flex:1;padding:16px 24px;border-radius:14px;border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:18px;font-weight:600;cursor:pointer">Avbryt</button>' +
            '<button id="vrDeleteConfirm" style="flex:1;padding:16px 24px;border-radius:14px;border:none;background:linear-gradient(180deg,#FF3B30 0%,#D32F2F 100%);color:#fff;font-size:18px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(255,59,48,0.4)">Ta bort</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(function() {
            var cancelBtn = document.getElementById('vrDeleteCancel');
            var confirmBtn = document.getElementById('vrDeleteConfirm');

            if (cancelBtn) {
                cancelBtn.onclick = function() {
                    overlay.remove();
                };
            }

            if (confirmBtn) {
                confirmBtn.onclick = function() {
                    overlay.remove();
                    VR.deleteMyData();
                };
            }

            overlay.onclick = function(e) {
                if (e.target === overlay) {
                    overlay.remove();
                }
            };
        }, 50);
    };

    // ===== DELETE MY DATA =====
    VR.deleteMyData = function() {
        VR.showLoader('Tar bort');
        VR.updateLoader(30, 'Ansluter...');

        VR.initFirebase(function(success) {
            if (!success) {
                VR.hideLoader();
                VR.showUploadError('Kunde inte ansluta till Firebase');
                return;
            }

            VR.updateLoader(60, 'Tar bort data...');

            VR.deleteMyFirebaseData(function(success, message) {
                VR.hideLoader();

                if (success) {
                    VR.showDeleteSuccess(message);
                    // Reload view after short delay
                    setTimeout(function() {
                        VR.doWhosWorking();
                    }, 2000);
                } else {
                    VR.showUploadError(message);
                }
            });
        });
    };

    VR.showDeleteSuccess = function(message) {
        var popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(180deg,#FF3B30 0%,#D32F2F 100%);color:#fff;padding:32px;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:99999;text-align:center';
        popup.innerHTML = '<div style="font-size:50px;margin-bottom:12px">✅</div><div style="font-size:22px;font-weight:600">Data borttagen!</div><div style="font-size:16px;margin-top:8px;opacity:0.9">' + message + '</div>';
        popup.onclick = function() { popup.remove(); };
        document.body.appendChild(popup);
        setTimeout(function() { if (popup.parentNode) popup.remove(); }, 3000);
    };

    // ===== NAVIGATE DAY =====
    VR.navigateWhosWorkingDay = function(currentDateStr, offset) {
        var parts = currentDateStr.split('-');
        var date = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
        date.setDate(date.getDate() + offset);

        var newDateStr = ('0' + date.getDate()).slice(-2) + '-' +
                         ('0' + (date.getMonth() + 1)).slice(-2) + '-' +
                         date.getFullYear();

        VR.loadWhosWorkingDate(newDateStr);
    };

    // ===== LOAD SPECIFIC DATE =====
    VR.loadWhosWorkingDate = function(dateStr) {
        VR.showLoader('Laddar');
        VR.updateLoader(50, 'Hämtar scheman...');

        VR.getSchedulesForDate(dateStr, function(schedules) {
            VR.hideLoader();
            VR.whosWorkingViewMode = 'day';
            VR.renderWhosWorkingView(schedules, dateStr);
        });
    };

    // ===== UPLOAD CONFIRMATION =====
    VR.showUploadConfirmation = function() {
        // Check if we have schema data first
        if (!VR.allSchemaData || Object.keys(VR.allSchemaData).length === 0) {
            VR.showUploadError('Du har inget schema laddat. Gå till Schema först för att ladda ditt schema.');
            return;
        }

        var dayCount = Object.keys(VR.allSchemaData).length;

        var overlay = document.createElement('div');
        overlay.id = 'vrUploadOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:999999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:24px;padding:36px;max-width:340px;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.5);margin:20px';

        modal.innerHTML = '<div style="font-size:56px;margin-bottom:20px">📤</div>' +
            '<div style="font-size:24px;font-weight:700;color:#fff;margin-bottom:14px">Ladda upp schema?</div>' +
            '<div style="font-size:17px;color:rgba(255,255,255,0.7);margin-bottom:28px;line-height:1.5">Ditt schema med <strong style="color:#34C759">' + dayCount + ' dagar</strong> kommer att delas med dina kollegor.</div>' +
            '<div style="display:flex;gap:14px;justify-content:center">' +
            '<button id="vrUploadCancel" style="flex:1;padding:16px 24px;border-radius:14px;border:none;background:rgba(255,255,255,0.15);color:#fff;font-size:18px;font-weight:600;cursor:pointer">Nej</button>' +
            '<button id="vrUploadConfirm" style="flex:1;padding:16px 24px;border-radius:14px;border:none;background:linear-gradient(180deg,#34C759 0%,#28a745 100%);color:#fff;font-size:18px;font-weight:600;cursor:pointer;box-shadow:0 4px 16px rgba(52,199,89,0.4)">Ja</button>' +
            '</div>';

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(function() {
            var cancelBtn = document.getElementById('vrUploadCancel');
            var confirmBtn = document.getElementById('vrUploadConfirm');

            if (cancelBtn) {
                cancelBtn.onclick = function() {
                    overlay.remove();
                };
            }

            if (confirmBtn) {
                confirmBtn.onclick = function() {
                    overlay.remove();
                    VR.uploadMySchedule();
                };
            }

            overlay.onclick = function(e) {
                if (e.target === overlay) {
                    overlay.remove();
                }
            };
        }, 50);
    };

    // ===== GET USER INFO FROM CREWWEB =====
    VR.getUserInfoFromCrewWeb = function() {
        // Try to find anställningsnummer and namn from CrewWeb page
        var anstNr = null;
        var namn = null;

        // Words to exclude from name matching (these are not person names)
        var excludeWords = [
            'lokförare', 'tågvärd', 'malmö', 'stockholm', 'göteborg', 'distrikt', 'avdelning', 'enhet',
            'crew', 'web', 'meny', 'arbetsdag', 'anställd', 'meddelanden', 'ankomst', 'redovisning',
            'löne', 'tidsregistrering', 'lösenord', 'e-post', 'arbetsschema', 'lista', 'frånvaro',
            'rapport', 'link', 'schema', 'företag', 'öresundståg', 'skånetrafiken', 'sj', 'mtr'
        ];

        try {
            // Look through all DIV, SPAN, LABEL, TD elements
            var allLabels = document.querySelectorAll('label, span, div, td');

            for (var i = 0; i < allLabels.length; i++) {
                var el = allLabels[i];
                var text = (el.textContent || '').trim();
                var textLower = text.toLowerCase();

                // Skip if element text is too long (probably container with lots of text)
                if (text.length > 30) continue;

                // Look for "Anställd nr" or "Anställd nr.:" label
                if (!anstNr && (textLower === 'anställd nr.:' || textLower === 'anställd nr:' ||
                    textLower === 'anställd nr.' || textLower === 'anställd nr' ||
                    textLower.indexOf('anställd nr') === 0)) {

                    console.log('VR: Found anstNr label:', text);

                    // Check next sibling
                    var nextEl = el.nextElementSibling;
                    if (nextEl) {
                        var nextText = (nextEl.value || nextEl.textContent || '').trim();
                        var match = nextText.match(/(\d{6})/);
                        if (match) {
                            anstNr = match[1];
                            console.log('VR: Found anstNr from nextSibling:', anstNr);
                        }
                    }

                    // Check parent's children
                    if (!anstNr && el.parentElement) {
                        var siblings = el.parentElement.children;
                        for (var s = 0; s < siblings.length; s++) {
                            var sib = siblings[s];
                            if (sib !== el) {
                                var sibText = (sib.value || sib.textContent || '').trim();
                                var sibMatch = sibText.match(/^(\d{6})$/);
                                if (sibMatch) {
                                    anstNr = sibMatch[1];
                                    console.log('VR: Found anstNr from sibling:', anstNr);
                                    break;
                                }
                            }
                        }
                    }
                }

                // Look for "Anställds namn" label
                if (!namn && (textLower === 'anställds namn:' || textLower === 'anställds namn' ||
                    textLower.indexOf('anställds namn') === 0)) {

                    console.log('VR: Found namn label:', text);

                    // Check next sibling
                    var nextEl2 = el.nextElementSibling;
                    if (nextEl2) {
                        var nextVal = (nextEl2.value || nextEl2.textContent || '').trim();
                        if (nextVal && nextVal.length >= 3 && nextVal.length <= 50 && !VR.isExcludedName(nextVal, excludeWords)) {
                            namn = nextVal;
                            console.log('VR: Found namn from nextSibling:', namn);
                        }
                    }

                    // Check parent's children
                    if (!namn && el.parentElement) {
                        var siblings2 = el.parentElement.children;
                        for (var s2 = 0; s2 < siblings2.length; s2++) {
                            var sib2 = siblings2[s2];
                            if (sib2 !== el) {
                                var sibVal = (sib2.value || sib2.textContent || '').trim();
                                // Must look like a name (has space, reasonable length)
                                if (sibVal && sibVal.length >= 3 && sibVal.length <= 50 &&
                                    sibVal.indexOf(' ') > 0 && !VR.isExcludedName(sibVal, excludeWords)) {
                                    namn = sibVal;
                                    console.log('VR: Found namn from sibling:', namn);
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            // Fallback: Look for 6-digit anstNr pattern in inputs
            if (!anstNr) {
                var inputs = document.querySelectorAll('input[readonly], input[disabled]');
                for (var j = 0; j < inputs.length; j++) {
                    var val = inputs[j].value || '';
                    if (/^\d{6}$/.test(val.trim())) {
                        anstNr = val.trim();
                        console.log('VR: Found anstNr from input fallback:', anstNr);
                        break;
                    }
                }
            }

            // Fallback for namn: look in readonly inputs but ONLY accept proper name format
            if (!namn) {
                var inputs2 = document.querySelectorAll('input[readonly], input[disabled]');
                for (var k = 0; k < inputs2.length; k++) {
                    var inputVal2 = (inputs2[k].value || '').trim();
                    // STRICT: Must be exactly "Förnamn Efternamn" format, 5-40 chars total
                    if (inputVal2.length >= 5 && inputVal2.length <= 40 &&
                        /^[A-ZÅÄÖ][a-zåäö]+(-[A-ZÅÄÖ][a-zåäö]+)? [A-ZÅÄÖ][a-zåäö]+(-[A-ZÅÄÖ][a-zåäö]+)?$/.test(inputVal2)) {
                        if (!VR.isExcludedName(inputVal2, excludeWords)) {
                            namn = inputVal2;
                            console.log('VR: Found namn from input fallback:', namn);
                            break;
                        }
                    }
                }
            }

            console.log('VR: Final user info - anstNr:', anstNr, 'namn:', namn);
        } catch (e) {
            console.log('VR: Error getting user info from CrewWeb', e);
        }

        return { anstNr: anstNr, namn: namn };
    };

    // Helper to check if a name should be excluded
    VR.isExcludedName = function(name, excludeWords) {
        if (!name) return true;
        // Reject if too long (probably menu/page text)
        if (name.length > 50) return true;
        // Reject if contains colon (probably a label like "Företag:Öresundståg")
        if (name.indexOf(':') > -1) return true;
        var lower = name.toLowerCase();
        for (var i = 0; i < excludeWords.length; i++) {
            if (lower.indexOf(excludeWords[i]) > -1) {
                return true;
            }
        }
        return false;
    };

    // ===== UPLOAD MY SCHEDULE =====
    VR.uploadMySchedule = function() {
        console.log('VR: uploadMySchedule called');

        // Check if we have user data, try to get from CrewWeb if missing
        var user = VR.getFirebaseUser();
        console.log('VR: Current user from storage:', user);

        if (!user || !user.anstNr) {
            // Try to get from CrewWeb page
            var crewWebInfo = VR.getUserInfoFromCrewWeb();
            console.log('VR: CrewWeb info:', crewWebInfo);

            if (crewWebInfo.anstNr && crewWebInfo.namn) {
                // Register user with found info
                VR.setFirebaseUser(crewWebInfo.anstNr, crewWebInfo.namn);
                user = { anstNr: crewWebInfo.anstNr, namn: crewWebInfo.namn };
                console.log('VR: Auto-registered user from CrewWeb:', user.namn, '(' + user.anstNr + ')');
            } else if (crewWebInfo.anstNr) {
                // We have anstNr but no namn - use anstNr as fallback name
                VR.setFirebaseUser(crewWebInfo.anstNr, 'Anställd ' + crewWebInfo.anstNr);
                user = { anstNr: crewWebInfo.anstNr, namn: 'Anställd ' + crewWebInfo.anstNr };
                console.log('VR: Registered with fallback name:', user.namn);
            } else {
                VR.showUploadError('Kunde inte hitta dina anställningsuppgifter.\n\n1. Gå till Anställddata i menyn\n2. Vänta tills sidan laddat\n3. Klicka på Ladda upp igen');
                return;
            }
        }

        // Ensure user has both anstNr and namn
        if (!user.namn) {
            user.namn = 'Anställd ' + user.anstNr;
            VR.setFirebaseUser(user.anstNr, user.namn);
        }

        VR.showLoader('Laddar upp');
        VR.updateLoader(30, 'Ansluter till Firebase...');

        // Check if Firebase SDK is loaded
        if (typeof firebase === 'undefined') {
            console.log('VR: Firebase SDK not loaded');
            VR.hideLoader();
            VR.showUploadError('Firebase SDK kunde inte laddas. Kontrollera din internetanslutning.');
            return;
        }

        VR.initFirebase(function(success) {
            console.log('VR: initFirebase callback, success:', success);
            if (!success) {
                VR.hideLoader();
                VR.showUploadError('Kunde inte ansluta till Firebase');
                return;
            }

            VR.updateLoader(60, 'Laddar upp schema...');

            VR.uploadSchemaToFirebase(function(uploadSuccess, message) {
                console.log('VR: uploadSchemaToFirebase callback, success:', uploadSuccess, 'message:', message);
                VR.hideLoader();

                if (uploadSuccess) {
                    VR.showUploadSuccess(message);
                    // Reload view after short delay
                    setTimeout(function() {
                        VR.doWhosWorking();
                    }, 2000);
                } else {
                    VR.showUploadError(message || 'Okänt fel vid uppladdning');
                }
            });
        });
    };

    // ===== MONTH VIEW =====
    VR.showWhosWorkingMonth = function() {
        VR.showLoader('Laddar månad');
        VR.updateLoader(30, 'Hämtar scheman...');

        var now = new Date();
        var year = VR.whosWorkingYear || now.getFullYear();
        var month = VR.whosWorkingMonth !== null ? VR.whosWorkingMonth : now.getMonth();

        VR.getSchedulesForMonth(year, month, function(allSchedules) {
            VR.hideLoader();
            VR.whosWorkingViewMode = 'month';
            VR.renderMonthView(allSchedules, year, month);
        });
    };

    // ===== FORMAT SHORT TIME =====
    VR.formatShortTime = function(tid) {
        if (!tid) return '';
        // tid is like "05:42-14:18", we want "05-14"
        var match = tid.match(/(\d{2}):\d{2}-(\d{2}):\d{2}/);
        if (match) {
            return match[1] + '-' + match[2];
        }
        return '';
    };

    // ===== SHOW SCHEDULE DETAIL POPUP =====
    VR.showScheduleDetailPopup = function(schedule, dateStr) {
        // Parse date
        var parts = dateStr.split('-');
        var dayNum = parseInt(parts[0], 10);
        var monthIdx = parseInt(parts[1], 10) - 1;
        var year = parseInt(parts[2], 10);
        var dateObj = new Date(year, monthIdx, dayNum);
        var weekday = VR.WEEKDAYS[dateObj.getDay()];
        var monthName = VR.MONTHS[monthIdx];

        var overlay = document.createElement('div');
        overlay.id = 'vrDetailOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:99998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)';

        var modal = document.createElement('div');
        modal.style.cssText = 'background:linear-gradient(180deg,#fff 0%,#f8f9fa 100%);border-radius:24px;padding:28px 32px;max-width:340px;width:90%;text-align:center;box-shadow:0 12px 48px rgba(0,0,0,0.3)';

        var html = '';

        if (schedule.isFriday) {
            // FP/FP-V popup
            html += '<div style="margin-bottom:16px">' + VR.getFPBadgeHtml(schedule.ps, 'large') + '</div>';
            html += '<div style="font-size:20px;font-weight:600;color:#16A34A;margin-bottom:20px">' + VR.getFPTypeText(schedule.ps) + '</div>';

            html += '<div style="text-align:left;font-size:17px;color:#333;line-height:2.2;background:#fff;padding:16px 20px;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">';
            html += '<div>👤 ' + (schedule.namn || 'Okänd') + '</div>';
            html += '<div>📅 ' + weekday + ' ' + dayNum + ' ' + monthName + ' ' + year + '</div>';
            if (schedule.ps) {
                html += '<div>📋 ' + schedule.ps + '</div>';
            }
            html += '</div>';
        } else {
            // Working popup - handle with or without tur
            var turVal = schedule.tur || '';
            var c3 = turVal.length >= 3 ? turVal.charAt(2) : '';
            var icon = '👤';
            var role = '';
            var flag = '';
            var country = '';

            if (c3 === '1' || c3 === '2') {
                icon = '🚂';
                role = 'Lokförare';
            } else if (c3 === '3' || c3 === '4') {
                icon = '🎫';
                role = 'Tågvärd';
            }
            if (c3 === '1' || c3 === '3') {
                flag = '🇸🇪';
                country = 'Sverige';
            } else if (c3 === '2' || c3 === '4') {
                flag = '🇩🇰';
                country = 'Danmark';
            }

            // Header with icon and tur
            html += '<div style="font-size:48px;margin-bottom:8px">' + icon + '</div>';
            if (turVal) {
                html += '<div style="font-size:26px;font-weight:700;color:#1a1a2e;margin-bottom:16px">Tur ' + turVal + '</div>';
            } else {
                html += '<div style="font-size:22px;font-weight:600;color:#666;margin-bottom:16px">Arbetsdag</div>';
            }

            // Details card
            html += '<div style="text-align:left;font-size:17px;color:#333;line-height:2.2;background:#fff;padding:16px 20px;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">';
            html += '<div>👤 ' + (schedule.namn || 'Okänd') + '</div>';
            html += '<div>📅 ' + weekday + ' ' + dayNum + ' ' + monthName + ' ' + year + '</div>';

            if (schedule.tid) {
                html += '<div style="font-weight:600;color:#1a1a2e">⏰ ' + schedule.tid + '</div>';
            }

            if (role) {
                html += '<div>' + icon + ' ' + role + '</div>';
            }

            if (flag && country) {
                html += '<div>' + flag + ' ' + country + '</div>';
            }

            if (schedule.ps) {
                html += '<div>📋 ' + schedule.ps + '</div>';
            }

            html += '</div>';
        }

        html += '<button id="vrDetailClose" style="margin-top:24px;padding:14px 40px;border-radius:14px;border:none;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);color:#fff;font-size:17px;font-weight:600;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.2)">Stäng</button>';

        modal.innerHTML = html;
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        setTimeout(function() {
            var closeBtn = document.getElementById('vrDetailClose');
            if (closeBtn) {
                closeBtn.onclick = function() {
                    overlay.remove();
                };
            }
            overlay.onclick = function(e) {
                if (e.target === overlay) {
                    overlay.remove();
                }
            };
        }, 50);
    };

    // ===== RENDER MONTH VIEW =====
    VR.renderMonthView = function(allSchedules, year, month) {
        var monthName = VR.MONTHS[month];

        var html = '';

        // iOS-style header bar
        html += VR.renderWhosWorkingHeader(true);

        // Month navigation header
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:16px 24px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">';
        html += '<span id="vrWwMonthPrev" style="font-size:28px;color:#fff;cursor:pointer;padding:8px 12px">◀</span>';
        html += '<div style="font-size:24px;font-weight:700;color:#fff">' + monthName + ' ' + year + '</div>';
        html += '<span id="vrWwMonthNext" style="font-size:28px;color:#fff;cursor:pointer;padding:8px 12px">▶</span>';
        html += '</div>';

        // Get all users who have schedules
        var usersByDate = {};
        var allUsers = {};

        for (var dateStr in allSchedules) {
            if (allSchedules.hasOwnProperty(dateStr)) {
                var schedules = allSchedules[dateStr];
                for (var i = 0; i < schedules.length; i++) {
                    var s = schedules[i];
                    allUsers[s.anstNr] = s.namn;

                    if (!usersByDate[dateStr]) {
                        usersByDate[dateStr] = {};
                    }
                    usersByDate[dateStr][s.anstNr] = s;
                }
            }
        }

        var userList = Object.keys(allUsers).map(function(anstNr) {
            return { anstNr: anstNr, namn: allUsers[anstNr] };
        }).sort(function(a, b) {
            return (a.namn || '').localeCompare(b.namn || '');
        });

        if (userList.length === 0) {
            html += '<div style="background:#fff;border-radius:27px;padding:40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
            html += '<div style="font-size:50px;margin-bottom:16px">📭</div>';
            html += '<div style="font-size:22px;color:#888">Inga scheman för denna månad</div>';
            html += '</div>';
        } else {
            // Build calendar grid - calculate cell width to show 7 days
            // Need wider cells for full time format (05:00-12:00)
            var daysInMonth = new Date(year, month + 1, 0).getDate();
            var nameColWidth = 90; // Name column width
            var availableWidth = Math.max(window.innerWidth - 32, 320); // Screen width minus padding
            var cellWidth = Math.floor((availableWidth - nameColWidth) / 7);
            cellWidth = Math.max(cellWidth, 85); // Minimum 85px per cell for full time
            var tableMinWidth = nameColWidth + (daysInMonth * cellWidth);

            html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08);overflow-x:auto;-webkit-overflow-scrolling:touch">';
            html += '<table style="width:100%;border-collapse:collapse;min-width:' + tableMinWidth + 'px">';

            // Header row with dates
            html += '<tr style="background:#1C1C1E">';
            html += '<th style="padding:14px 12px;color:#fff;font-size:15px;text-align:left;position:sticky;left:0;background:#1C1C1E;min-width:' + nameColWidth + 'px;z-index:2">Namn</th>';

            for (var d = 1; d <= daysInMonth; d++) {
                var dateObj = new Date(year, month, d);
                var isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                var dayName = VR.DAYS_SHORT ? VR.DAYS_SHORT[dateObj.getDay()] : '';
                html += '<th style="padding:10px 4px;color:' + (isWeekend ? '#FF9500' : '#fff') + ';font-size:13px;text-align:center;width:' + cellWidth + 'px;min-width:' + cellWidth + 'px">';
                html += '<div style="font-size:11px;opacity:0.7">' + dayName + '</div>';
                html += '<div style="font-size:16px;font-weight:700">' + d + '</div>';
                html += '</th>';
            }
            html += '</tr>';

            // Row per user
            for (var u = 0; u < userList.length; u++) {
                var user = userList[u];
                var rowBg = u % 2 === 0 ? '#fff' : '#F5F5F7';

                html += '<tr style="background:' + rowBg + '">';
                html += '<td style="padding:14px 12px;font-size:15px;font-weight:600;position:sticky;left:0;background:' + rowBg + ';white-space:nowrap;z-index:1;border-right:1px solid #eee">' + user.namn + '</td>';

                for (var day = 1; day <= daysInMonth; day++) {
                    var dayStr = ('0' + day).slice(-2) + '-' + ('0' + (month + 1)).slice(-2) + '-' + year;
                    var schedule = usersByDate[dayStr] ? usersByDate[dayStr][user.anstNr] : null;

                    var cellContent = '';
                    var cellBg = 'transparent';
                    var cellStyle = '';

                    if (schedule) {
                        if (schedule.isFriday) {
                            // FP/FP-V badge
                            var fpText = VR.isFPV(schedule.ps) ? 'FP-V' : 'FP';
                            cellContent = '<div style="font-size:13px;font-weight:700;background:#16A34A;color:#fff;padding:6px 8px;border-radius:6px;display:inline-block">' + fpText + '</div>';
                            cellBg = 'rgba(22,163,74,0.08)';
                        } else {
                            // Working day - show FULL time (e.g. 05:00-12:00)
                            var tidVal = schedule.tid || '';

                            // Debug: log first few schedules to see what data we have
                            if (u === 0 && day <= 3) {
                                console.log('VR Month: day ' + day + ', tid="' + tidVal + '", tur="' + schedule.tur + '", ps="' + schedule.ps + '"');
                            }

                            if (tidVal) {
                                // Show full time - big and clear
                                cellContent = '<div style="font-size:12px;font-weight:700;color:#1a1a2e;white-space:nowrap">' + tidVal + '</div>';
                                cellBg = 'rgba(59,130,246,0.08)';
                            } else if (schedule.tur) {
                                // No time - show tur as fallback
                                cellContent = '<div style="font-size:11px;font-weight:600;color:#666">' + schedule.tur + '</div>';
                                cellBg = 'rgba(59,130,246,0.05)';
                            } else if (schedule.ps) {
                                // Show PS code as last fallback
                                cellContent = '<div style="font-size:10px;color:#888">' + schedule.ps + '</div>';
                            }
                        }
                        cellStyle = 'cursor:pointer';
                    }

                    html += '<td class="vrMonthCell" data-date="' + dayStr + '" data-user="' + user.anstNr + '" style="padding:12px 6px;text-align:center;background:' + cellBg + ';vertical-align:middle;border-bottom:1px solid #f0f0f0;' + cellStyle + '">' + cellContent + '</td>';
                }

                html += '</tr>';
            }

            html += '</table>';
            html += '</div>';
        }

        // Store data for click handler
        VR.monthViewData = { usersByDate: usersByDate, allUsers: allUsers };

        VR.showView('', '', html);
        VR.bindMonthViewEvents();
    };

    // ===== BIND MONTH VIEW EVENTS =====
    VR.bindMonthViewEvents = function() {
        setTimeout(function() {
            var prevBtn = document.getElementById('vrWwMonthPrev');
            var nextBtn = document.getElementById('vrWwMonthNext');
            var dayTab = document.getElementById('vrWwDayTab');
            var monthTab = document.getElementById('vrWwMonthTab');
            var uploadBtn = document.getElementById('vrWwUploadBtn');
            var deleteBtn = document.getElementById('vrWwDeleteBtn');

            if (prevBtn) {
                prevBtn.onclick = function() {
                    VR.whosWorkingMonth--;
                    if (VR.whosWorkingMonth < 0) {
                        VR.whosWorkingMonth = 11;
                        VR.whosWorkingYear--;
                    }
                    VR.showWhosWorkingMonth();
                };
            }

            if (nextBtn) {
                nextBtn.onclick = function() {
                    VR.whosWorkingMonth++;
                    if (VR.whosWorkingMonth > 11) {
                        VR.whosWorkingMonth = 0;
                        VR.whosWorkingYear++;
                    }
                    VR.showWhosWorkingMonth();
                };
            }

            if (dayTab) {
                dayTab.onclick = function() {
                    var today = new Date();
                    var todayStr = ('0' + today.getDate()).slice(-2) + '-' +
                                   ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                                   today.getFullYear();
                    VR.loadWhosWorkingDate(todayStr);
                };
            }

            if (uploadBtn) {
                uploadBtn.onclick = function() {
                    VR.showUploadConfirmation();
                };
            }

            if (deleteBtn) {
                deleteBtn.onclick = function() {
                    VR.showDeleteConfirmation();
                };
            }

            // Bind cell clicks
            var cells = document.querySelectorAll('.vrMonthCell');
            cells.forEach(function(cell) {
                cell.onclick = function() {
                    var dateStr = cell.getAttribute('data-date');
                    var userAnstNr = cell.getAttribute('data-user');

                    if (VR.monthViewData && VR.monthViewData.usersByDate[dateStr] && VR.monthViewData.usersByDate[dateStr][userAnstNr]) {
                        var schedule = VR.monthViewData.usersByDate[dateStr][userAnstNr];
                        VR.showScheduleDetailPopup(schedule, dateStr);
                    }
                };
            });
        }, 100);
    };

    // ===== ERROR/SUCCESS POPUPS =====
    VR.showWhosWorkingError = function(message) {
        var html = '<div style="background:#fff;border-radius:27px;padding:40px;text-align:center;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';
        html += '<div style="font-size:60px;margin-bottom:16px">❌</div>';
        html += '<div style="font-size:24px;font-weight:600;color:#FF3B30;margin-bottom:12px">Fel</div>';
        html += '<div style="font-size:18px;color:#666">' + message + '</div>';
        html += '<button onclick="VR.doWhosWorking()" style="margin-top:24px;padding:14px 28px;font-size:18px;font-weight:600;color:#fff;background:#007AFF;border:none;border-radius:12px;cursor:pointer">Försök igen</button>';
        html += '</div>';
        VR.showView('', '', html);
    };

    VR.showUploadError = function(message) {
        var popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:32px;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:99999;text-align:center;max-width:300px';
        popup.innerHTML = '<div style="font-size:50px;margin-bottom:12px">⚠️</div><div style="font-size:18px;color:#333">' + message + '</div>';
        popup.onclick = function() { popup.remove(); };
        document.body.appendChild(popup);
        setTimeout(function() { if (popup.parentNode) popup.remove(); }, 4000);
    };

    VR.showUploadSuccess = function(message) {
        var popup = document.createElement('div');
        popup.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:linear-gradient(180deg,#34C759 0%,#28a745 100%);color:#fff;padding:32px;border-radius:20px;box-shadow:0 8px 32px rgba(0,0,0,0.3);z-index:99999;text-align:center';
        popup.innerHTML = '<div style="font-size:50px;margin-bottom:12px">✅</div><div style="font-size:22px;font-weight:600">Schema uppladdat!</div><div style="font-size:16px;margin-top:8px;opacity:0.9">' + message + '</div>';
        popup.onclick = function() { popup.remove(); };
        document.body.appendChild(popup);
        setTimeout(function() { if (popup.parentNode) popup.remove(); }, 3000);
    };

    console.log('VR: WhosWorking module loaded');
})();
