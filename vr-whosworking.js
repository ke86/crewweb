// VR CrewWeb - Who's Working Today
(function() {
    'use strict';

    var VR = window.VR;

    // ===== STATE =====
    VR.whosWorkingMonth = null;
    VR.whosWorkingYear = null;

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

        // Check if user info exists
        var user = VR.getFirebaseUser();
        if (!user || !user.anstNr) {
            VR.showWhosWorkingSetup();
            return;
        }

        // Show the main view
        VR.showWhosWorkingView();
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

    // ===== SETUP SCREEN (first time) =====
    VR.showWhosWorkingSetup = function() {
        var html = '<div style="background:#fff;border-radius:27px;padding:40px;box-shadow:0 5px 20px rgba(0,0,0,0.08);max-width:400px;margin:0 auto">';
        html += '<div style="text-align:center;margin-bottom:30px">';
        html += '<div style="font-size:60px;margin-bottom:16px">👤</div>';
        html += '<div style="font-size:28px;font-weight:700;color:#333">Vem är du?</div>';
        html += '<div style="font-size:18px;color:#888;margin-top:8px">Fyll i dina uppgifter (en gång)</div>';
        html += '</div>';

        html += '<div style="margin-bottom:16px">';
        html += '<label style="font-size:16px;color:#666;margin-bottom:6px;display:block">Anställningsnummer</label>';
        html += '<input type="text" id="vrFbAnstNr" placeholder="t.ex. 302113" style="width:100%;padding:16px;font-size:20px;border:2px solid #E5E5E5;border-radius:14px;box-sizing:border-box">';
        html += '</div>';

        html += '<div style="margin-bottom:24px">';
        html += '<label style="font-size:16px;color:#666;margin-bottom:6px;display:block">Ditt namn</label>';
        html += '<input type="text" id="vrFbNamn" placeholder="t.ex. Kenny Eriksson" style="width:100%;padding:16px;font-size:20px;border:2px solid #E5E5E5;border-radius:14px;box-sizing:border-box">';
        html += '</div>';

        html += '<button id="vrFbSetupBtn" style="width:100%;padding:18px;font-size:22px;font-weight:600;color:#fff;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border:none;border-radius:14px;cursor:pointer">Spara</button>';
        html += '</div>';

        VR.showView('', '', html);

        // Bind events
        setTimeout(function() {
            var anstNrInput = document.getElementById('vrFbAnstNr');
            var namnInput = document.getElementById('vrFbNamn');
            var setupBtn = document.getElementById('vrFbSetupBtn');

            if (setupBtn) {
                setupBtn.onclick = function() {
                    var anstNr = anstNrInput ? anstNrInput.value.trim() : '';
                    var namn = namnInput ? namnInput.value.trim() : '';

                    if (anstNr && namn) {
                        VR.setFirebaseUser(anstNr, namn);
                        VR.doWhosWorking(); // Reload
                    }
                };
            }

            if (anstNrInput) anstNrInput.focus();
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
                    VR.renderWhosWorkingView(schedules, todayStr);
                }, 200);
            });
        });
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

        // Header with navigation
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:20px 28px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">';
        html += '<span id="vrWwPrev" style="font-size:32px;color:#fff;cursor:pointer;padding:8px 12px">◀</span>';
        html += '<div style="text-align:center">';
        html += '<div style="font-size:24px;font-weight:700;color:#fff">' + (isToday ? 'Idag' : weekday) + '</div>';
        html += '<div style="font-size:18px;color:rgba(255,255,255,0.7)">' + dayNum + ' ' + monthName + ' ' + year + '</div>';
        html += '</div>';
        html += '<span id="vrWwNext" style="font-size:32px;color:#fff;cursor:pointer;padding:8px 12px">▶</span>';
        html += '</div>';

        // Month selector
        html += '<div style="display:flex;gap:10px;margin-bottom:16px;overflow-x:auto;padding:4px 0">';
        html += '<button id="vrWwToday" style="padding:10px 18px;border-radius:12px;border:none;background:' + (isToday ? 'linear-gradient(180deg,#1a1a2e 0%,#16213e 100%)' : 'rgba(0,0,0,0.08)') + ';color:' + (isToday ? '#fff' : '#333') + ';font-size:16px;font-weight:600;cursor:pointer;white-space:nowrap">Idag</button>';
        html += '<button id="vrWwMonth" style="padding:10px 18px;border-radius:12px;border:none;background:rgba(0,0,0,0.08);color:#333;font-size:16px;font-weight:600;cursor:pointer;white-space:nowrap">📅 Hela månaden</button>';
        html += '</div>';

        // Schedules list
        html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        if (schedules.length === 0) {
            html += '<div style="padding:40px;text-align:center">';
            html += '<div style="font-size:50px;margin-bottom:16px">📭</div>';
            html += '<div style="font-size:22px;color:#888">Inga kollegor har laddat upp schema ännu</div>';
            html += '</div>';
        } else {
            // Sort: working first, then fridag, then no data
            schedules.sort(function(a, b) {
                if (a.noData && !b.noData) return 1;
                if (!a.noData && b.noData) return -1;
                if (a.isFriday && !b.isFriday) return 1;
                if (!a.isFriday && b.isFriday) return -1;
                return (a.namn || '').localeCompare(b.namn || '');
            });

            for (var i = 0; i < schedules.length; i++) {
                var s = schedules[i];
                var bgCol = i % 2 === 0 ? '#fff' : '#F8F8F8';

                // Determine icon and color
                var icon = '👤';
                var statusColor = '#333';
                var statusText = '';

                if (s.noData) {
                    icon = '⏳';
                    statusColor = '#999';
                    statusText = 'Ej laddat';
                } else if (s.isFriday) {
                    icon = '🏖️';
                    statusColor = '#34C759';
                    statusText = 'Ledig';
                } else if (s.tur) {
                    // Check role from tour number
                    var c3 = s.tur.length >= 3 ? s.tur.charAt(2) : '';
                    if (c3 === '1' || c3 === '2') icon = '🚂';
                    else if (c3 === '3' || c3 === '4') icon = '🎫';

                    // Check country flag
                    var flag = '';
                    if (c3 === '1' || c3 === '3') flag = '🇸🇪';
                    else if (c3 === '2' || c3 === '4') flag = '🇩🇰';

                    statusText = s.tur + (flag ? ' ' + flag : '');
                }

                html += '<div style="display:flex;justify-content:space-between;align-items:center;padding:18px 24px;background:' + bgCol + ';border-bottom:1px solid #E5E5EA">';
                html += '<div style="display:flex;align-items:center;gap:14px">';
                html += '<span style="font-size:32px">' + icon + '</span>';
                html += '<div>';
                html += '<div style="font-size:22px;font-weight:600;color:' + (s.noData ? '#999' : '#333') + '">' + (s.namn || 'Okänd') + '</div>';
                if (s.tid && !s.isFriday && !s.noData) {
                    html += '<div style="font-size:16px;color:#666">' + s.tid + '</div>';
                }
                html += '</div>';
                html += '</div>';
                html += '<div style="font-size:18px;color:' + statusColor + ';font-weight:500">' + statusText + '</div>';
                html += '</div>';
            }
        }

        html += '</div>';

        // Upload button
        html += '<div style="margin-top:20px;text-align:center">';
        html += '<button id="vrWwUpload" style="padding:18px 36px;font-size:20px;font-weight:600;color:#fff;background:linear-gradient(180deg,#34C759 0%,#28a745 100%);border:none;border-radius:16px;cursor:pointer;box-shadow:0 4px 12px rgba(52,199,89,0.3)">';
        html += '<span style="margin-right:8px">📤</span> Ladda upp mitt schema</button>';
        html += '</div>';

        // Info text
        var user = VR.getFirebaseUser();
        if (user) {
            html += '<div style="margin-top:16px;text-align:center;color:#8E8E93;font-size:16px">';
            html += 'Inloggad som ' + user.namn + ' (' + user.anstNr + ')';
            html += '</div>';
        }

        VR.showView('', '', html);
        VR.bindWhosWorkingEvents(dateStr);
    };

    // ===== BIND EVENTS =====
    VR.bindWhosWorkingEvents = function(currentDateStr) {
        setTimeout(function() {
            var prevBtn = document.getElementById('vrWwPrev');
            var nextBtn = document.getElementById('vrWwNext');
            var todayBtn = document.getElementById('vrWwToday');
            var monthBtn = document.getElementById('vrWwMonth');
            var uploadBtn = document.getElementById('vrWwUpload');

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

            if (todayBtn) {
                todayBtn.onclick = function() {
                    var today = new Date();
                    var todayStr = ('0' + today.getDate()).slice(-2) + '-' +
                                   ('0' + (today.getMonth() + 1)).slice(-2) + '-' +
                                   today.getFullYear();
                    VR.loadWhosWorkingDate(todayStr);
                };
            }

            if (monthBtn) {
                monthBtn.onclick = function() {
                    VR.showWhosWorkingMonth();
                };
            }

            if (uploadBtn) {
                uploadBtn.onclick = function() {
                    VR.uploadMySchedule();
                };
            }
        }, 100);
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
            VR.renderWhosWorkingView(schedules, dateStr);
        });
    };

    // ===== UPLOAD MY SCHEDULE =====
    VR.uploadMySchedule = function() {
        // Check if we have schema data
        if (!VR.allSchemaData || Object.keys(VR.allSchemaData).length === 0) {
            VR.showUploadError('Du har inget schema laddat. Gå till Schema först för att ladda ditt schema.');
            return;
        }

        VR.showLoader('Laddar upp');
        VR.updateLoader(30, 'Ansluter...');

        VR.initFirebase(function(success) {
            if (!success) {
                VR.hideLoader();
                VR.showUploadError('Kunde inte ansluta till Firebase');
                return;
            }

            VR.updateLoader(60, 'Laddar upp schema...');

            VR.uploadSchemaToFirebase(function(success, message) {
                VR.hideLoader();

                if (success) {
                    VR.showUploadSuccess(message);
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

    // ===== MONTH VIEW =====
    VR.showWhosWorkingMonth = function() {
        VR.showLoader('Laddar månad');
        VR.updateLoader(30, 'Hämtar scheman...');

        var now = new Date();
        var year = VR.whosWorkingYear || now.getFullYear();
        var month = VR.whosWorkingMonth !== null ? VR.whosWorkingMonth : now.getMonth();

        VR.getSchedulesForMonth(year, month, function(allSchedules) {
            VR.hideLoader();
            VR.renderMonthView(allSchedules, year, month);
        });
    };

    // ===== RENDER MONTH VIEW =====
    VR.renderMonthView = function(allSchedules, year, month) {
        var monthName = VR.MONTHS[month];

        var html = '';

        // Header with navigation
        html += '<div style="display:flex;justify-content:space-between;align-items:center;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border-radius:20px;padding:20px 28px;margin-bottom:16px;box-shadow:0 4px 12px rgba(0,0,0,0.15)">';
        html += '<span id="vrWwMonthPrev" style="font-size:32px;color:#fff;cursor:pointer;padding:8px 12px">◀</span>';
        html += '<div style="font-size:28px;font-weight:700;color:#fff">' + monthName + ' ' + year + '</div>';
        html += '<span id="vrWwMonthNext" style="font-size:32px;color:#fff;cursor:pointer;padding:8px 12px">▶</span>';
        html += '</div>';

        // Back button
        html += '<button id="vrWwBackToDay" style="margin-bottom:16px;padding:12px 20px;border-radius:12px;border:none;background:rgba(0,0,0,0.08);color:#333;font-size:16px;font-weight:600;cursor:pointer">← Tillbaka till dagvy</button>';

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
            // Build calendar grid
            var daysInMonth = new Date(year, month + 1, 0).getDate();

            html += '<div style="background:#fff;border-radius:27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08);overflow-x:auto">';
            html += '<table style="width:100%;border-collapse:collapse;min-width:600px">';

            // Header row with dates
            html += '<tr style="background:#1C1C1E">';
            html += '<th style="padding:12px 16px;color:#fff;font-size:16px;text-align:left;position:sticky;left:0;background:#1C1C1E">Namn</th>';

            for (var d = 1; d <= daysInMonth; d++) {
                var dateObj = new Date(year, month, d);
                var isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
                html += '<th style="padding:12px 8px;color:' + (isWeekend ? '#FF9500' : '#fff') + ';font-size:14px;text-align:center;min-width:40px">' + d + '</th>';
            }
            html += '</tr>';

            // Row per user
            for (var u = 0; u < userList.length; u++) {
                var user = userList[u];
                var rowBg = u % 2 === 0 ? '#fff' : '#F8F8F8';

                html += '<tr style="background:' + rowBg + '">';
                html += '<td style="padding:12px 16px;font-size:16px;font-weight:600;position:sticky;left:0;background:' + rowBg + '">' + user.namn + '</td>';

                for (var day = 1; day <= daysInMonth; day++) {
                    var dayStr = ('0' + day).slice(-2) + '-' + ('0' + (month + 1)).slice(-2) + '-' + year;
                    var schedule = usersByDate[dayStr] ? usersByDate[dayStr][user.anstNr] : null;

                    var cellContent = '';
                    var cellBg = 'transparent';

                    if (schedule) {
                        if (schedule.isFriday) {
                            cellContent = '🏖️';
                            cellBg = 'rgba(52,199,89,0.2)';
                        } else if (schedule.tur) {
                            var c3 = schedule.tur.length >= 3 ? schedule.tur.charAt(2) : '';
                            if (c3 === '2' || c3 === '4') {
                                cellContent = '🇩🇰';
                            } else {
                                cellContent = '🇸🇪';
                            }
                        }
                    }

                    html += '<td style="padding:8px;text-align:center;background:' + cellBg + ';font-size:16px">' + cellContent + '</td>';
                }

                html += '</tr>';
            }

            html += '</table>';
            html += '</div>';
        }

        VR.showView('', '', html);

        // Bind events
        setTimeout(function() {
            var prevBtn = document.getElementById('vrWwMonthPrev');
            var nextBtn = document.getElementById('vrWwMonthNext');
            var backBtn = document.getElementById('vrWwBackToDay');

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

            if (backBtn) {
                backBtn.onclick = function() {
                    VR.doWhosWorking();
                };
            }
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
