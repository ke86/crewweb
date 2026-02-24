// VR CrewWeb - Förväntat Schema (V.1.55 - GitHub-push, inställningsknapp i header)
(function() {
    'use strict';

    var VR = window.VR;
    var BASE = atob('aHR0cHM6Ly9rZTg2LmdpdGh1Yi5pby9jcmV3d2ViLw==');
    var PIN_HASH = '900cb8e36b717b81b9dbbb51cfae997cf5236c36afea5ba7100d005ad52d1cbc';
    var GH_REPO = atob('a2U4Ni9jcmV3d2Vi'); // ke86/crewweb
    var GH_FILE = 'turer-malmo-2026.json';
    var LS_TOKEN_KEY = 'VR_ghToken';

    // SHA-256 hash helper (async)
    function hashPIN(pin) {
        var encoder = new TextEncoder();
        var data = encoder.encode(pin);
        return crypto.subtle.digest('SHA-256', data).then(function(buffer) {
            var arr = new Uint8Array(buffer);
            var hex = '';
            for (var i = 0; i < arr.length; i++) {
                hex += ('0' + arr[i].toString(16)).slice(-2);
            }
            return hex;
        });
    }

    // ===== FIXED TIMES FOR SPECIAL TOURS =====
    var RESERV_TIDER = {
        'Reserv1': { start: '05:00', slut: '13:00' },
        'Reserv2': { start: '07:00', slut: '15:00' },
        'Reserv3': { start: '13:00', slut: '19:00' },
        'Reserv4': { start: '14:30', slut: '22:30' }
    };

    var SUFFIX_TIDER = {
        '291': { start: '03:45', slut: '11:00' },
        '281': { start: '05:00', slut: '12:00' }
    };

    // ===== LOCALSTORAGE HELPERS =====
    function lsGet(key) {
        try { return localStorage.getItem(key); }
        catch (e) { return null; }
    }

    function lsSet(key, value) {
        try { localStorage.setItem(key, value); return true; }
        catch (e) { return false; }
    }

    function lsRemove(key) {
        try { localStorage.removeItem(key); }
        catch (e) { /* ignore */ }
    }

    // ===== VALIDATE TURER JSON =====
    function validateTurerJSON(data) {
        if (!data || typeof data !== 'object') return 'Ogiltig JSON-struktur';
        if (!Array.isArray(data.turer)) return 'Saknar "turer"-array';
        if (data.turer.length === 0) return '"turer"-arrayen \u00e4r tom';

        var required = ['dag', 'datum', 'turnr', 'start', 'slut'];
        for (var i = 0; i < Math.min(data.turer.length, 5); i++) {
            var t = data.turer[i];
            for (var j = 0; j < required.length; j++) {
                if (!t[required[j]] && t[required[j]] !== 0) {
                    return 'Tur ' + (i + 1) + ' saknar f\u00e4ltet "' + required[j] + '"';
                }
            }
        }
        return null;
    }

    // ===== GITHUB API: PUSH FILE =====
    function pushToGitHub(token, jsonContent, statusEl) {
        var apiBase = 'https://api.github.com/repos/' + GH_REPO + '/contents/' + GH_FILE;

        statusEl.innerHTML = '<div style="font-size:18px;color:#FFD60A;padding:14px;background:rgba(255,214,10,0.1);border-radius:12px">\u23f3 H\u00e4mtar nuvarande fil fr\u00e5n GitHub...</div>';

        // Step 1: GET current file to get SHA
        var xhr1 = new XMLHttpRequest();
        xhr1.open('GET', apiBase, true);
        xhr1.setRequestHeader('Authorization', 'Bearer ' + token);
        xhr1.setRequestHeader('Accept', 'application/vnd.github.v3+json');
        xhr1.onload = function() {
            var sha = '';
            if (xhr1.status === 200) {
                try {
                    var resp = JSON.parse(xhr1.responseText);
                    sha = resp.sha;
                } catch (e) { /* new file */ }
            } else if (xhr1.status === 401 || xhr1.status === 403) {
                statusEl.innerHTML = '<div style="font-size:18px;color:#FF3B30;padding:14px;background:rgba(255,59,48,0.1);border-radius:12px">\u274c Ogiltig token \u2014 kontrollera din GitHub-token</div>';
                return;
            }

            statusEl.innerHTML = '<div style="font-size:18px;color:#FFD60A;padding:14px;background:rgba(255,214,10,0.1);border-radius:12px">\u23f3 Laddar upp till GitHub...</div>';

            // Step 2: PUT new content
            var body = {
                message: 'Uppdatera turdata via CrewWeb',
                content: btoa(unescape(encodeURIComponent(jsonContent)))
            };
            if (sha) body.sha = sha;

            var xhr2 = new XMLHttpRequest();
            xhr2.open('PUT', apiBase, true);
            xhr2.setRequestHeader('Authorization', 'Bearer ' + token);
            xhr2.setRequestHeader('Accept', 'application/vnd.github.v3+json');
            xhr2.setRequestHeader('Content-Type', 'application/json');
            xhr2.onload = function() {
                if (xhr2.status === 200 || xhr2.status === 201) {
                    // Clear session cache so fresh data is loaded next time
                    VR._turerData = null;
                    var data = JSON.parse(jsonContent);
                    statusEl.innerHTML = '<div style="font-size:18px;color:#4CD964;padding:14px;background:rgba(76,217,100,0.1);border-radius:12px">\u2705 ' + data.turer.length + ' turer uppladdade till GitHub!<br><span style="font-size:14px;color:rgba(76,217,100,0.6)">GitHub Pages uppdateras inom ~1 min</span></div>';
                } else if (xhr2.status === 401 || xhr2.status === 403) {
                    statusEl.innerHTML = '<div style="font-size:18px;color:#FF3B30;padding:14px;background:rgba(255,59,48,0.1);border-radius:12px">\u274c Ingen beh\u00f6righet \u2014 kontrollera att din token har "Contents: Read and write"</div>';
                } else if (xhr2.status === 404) {
                    statusEl.innerHTML = '<div style="font-size:18px;color:#FF3B30;padding:14px;background:rgba(255,59,48,0.1);border-radius:12px">\u274c Repo hittades inte \u2014 kontrollera repo-namn</div>';
                } else {
                    var errMsg = '';
                    try { errMsg = JSON.parse(xhr2.responseText).message; } catch (e) { errMsg = 'Status ' + xhr2.status; }
                    statusEl.innerHTML = '<div style="font-size:18px;color:#FF3B30;padding:14px;background:rgba(255,59,48,0.1);border-radius:12px">\u274c Fel: ' + errMsg + '</div>';
                }
            };
            xhr2.onerror = function() {
                statusEl.innerHTML = '<div style="font-size:18px;color:#FF3B30;padding:14px;background:rgba(255,59,48,0.1);border-radius:12px">\u274c N\u00e4tverksfel \u2014 kunde inte n\u00e5 GitHub</div>';
            };
            xhr2.send(JSON.stringify(body));
        };
        xhr1.onerror = function() {
            statusEl.innerHTML = '<div style="font-size:18px;color:#FF3B30;padding:14px;background:rgba(255,59,48,0.1);border-radius:12px">\u274c N\u00e4tverksfel \u2014 kunde inte n\u00e5 GitHub</div>';
        };
        xhr1.send();
    }

    // ===== DETERMINE NEXT UNRELEASED MONTH =====
    VR.getNextUnreleasedMonth = function() {
        var today = new Date();
        var day = today.getDate();
        var month = today.getMonth();
        var year = today.getFullYear();

        if (day < 16) { month += 1; } else { month += 2; }
        if (month > 11) { month -= 12; year += 1; }

        return { month: month, year: year };
    };

    // ===== ICON LOGIC FOR FORVANTAD =====
    VR.getForvantadIcons = function(tn) {
        if (!tn) return '';
        var tnU = tn.toUpperCase();
        var icons = '';

        if (/^\d{6}-\d{6}/.test(tn)) {
            icons += '<span style="display:inline-block;background:#DC2626;color:#fff;font-size:16px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:6px;vertical-align:middle">R</span>';
            icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:14px;font-weight:700;padding:3px 7px;border-radius:6px;margin-left:4px;vertical-align:middle">\u00c4ndrad</span>';
            return icons;
        }

        if (tnU.indexOf('RESERV') === 0) {
            icons += '<span style="display:inline-block;background:#9333EA;color:#fff;font-size:16px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:6px;vertical-align:middle">R</span>';
            if (tnU.indexOf('TP') > -1) {
                icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:14px;font-weight:700;padding:3px 7px;border-radius:6px;margin-left:4px;vertical-align:middle">\u00c4ndrad</span>';
            }
            return icons;
        }

        var c4 = tn.length >= 4 ? tn.charAt(3) : '';
        if (c4 === '8' || c4 === '9') {
            icons += '<span style="display:inline-block;background:#DC2626;color:#fff;font-size:16px;font-weight:700;padding:3px 8px;border-radius:6px;margin-left:6px;vertical-align:middle">R</span>';
            if (tnU.indexOf('TP') > -1) {
                icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:14px;font-weight:700;padding:3px 7px;border-radius:6px;margin-left:4px;vertical-align:middle">\u00c4ndrad</span>';
            }
            return icons;
        }

        var c3 = tn.length >= 3 ? tn.charAt(2) : '';
        var c6 = tn.length >= 6 ? tn.charAt(5) : '';

        if (c3 === '1' || c3 === '3') {
            icons += '<span style="margin-left:5px;font-size:20px;vertical-align:middle">\ud83c\uddf8\ud83c\uddea</span>';
        } else if (c3 === '2' || c3 === '4') {
            icons += '<span style="margin-left:5px;font-size:20px;vertical-align:middle">\ud83c\udde9\ud83c\uddf0</span>';
        }

        if (c6.toUpperCase() === 'A') {
            icons += '<span style="display:inline-block;background:#fff;color:#222;font-size:14px;font-weight:700;padding:4px 8px 6px 8px;margin-left:4px;vertical-align:middle;clip-path:polygon(0 0,100% 0,100% 75%,85% 100%,70% 75%,50% 100%,30% 75%,15% 100%,0 75%);box-shadow:0 1px 3px rgba(0,0,0,0.2)">1</span>';
        } else if (c6.toUpperCase() === 'B') {
            icons += '<span style="display:inline-block;background:#fff;color:#222;font-size:14px;font-weight:700;padding:6px 8px 4px 8px;margin-left:4px;vertical-align:middle;clip-path:polygon(0 25%,15% 0,30% 25%,50% 0,70% 25%,85% 0,100% 25%,100% 100%,0 100%);box-shadow:0 1px 3px rgba(0,0,0,0.2)">2</span>';
        }

        if (tnU.indexOf('TP') > -1) {
            icons += '<span style="display:inline-block;background:#EAB308;color:#fff;font-size:14px;font-weight:700;padding:3px 7px;border-radius:6px;margin-left:4px;vertical-align:middle">\u00c4ndrad</span>';
        }

        return icons;
    };

    // ===== PIN LOCK DIALOG =====
    VR.showPinDialog = function(callback) {
        if (VR._pinAuthenticated) { callback(); return; }

        var overlay = document.createElement('div');
        overlay.id = 'vrPinOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999990;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';

        var box = document.createElement('div');
        box.style.cssText = 'background:#1C1C1E;border-radius:36px;padding:56px 48px;width:600px;max-width:94vw;text-align:center;box-shadow:0 24px 80px rgba(0,0,0,0.6)';

        box.innerHTML = '\
<div style="font-size:72px;margin-bottom:16px">\ud83d\udd12</div>\
<div style="font-size:36px;font-weight:700;color:#fff;margin-bottom:8px">Inst\u00e4llningar</div>\
<div style="font-size:22px;color:rgba(255,255,255,0.4);margin-bottom:40px">Ange PIN-kod</div>\
<div id="vrPinDots" style="display:flex;gap:24px;justify-content:center;margin-bottom:40px">\
<div class="vrPinDot" style="width:36px;height:36px;border-radius:50%;border:4px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
<div class="vrPinDot" style="width:36px;height:36px;border-radius:50%;border:4px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
<div class="vrPinDot" style="width:36px;height:36px;border-radius:50%;border:4px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
<div class="vrPinDot" style="width:36px;height:36px;border-radius:50%;border:4px solid rgba(255,255,255,0.3);transition:all 0.15s"></div>\
</div>\
<div id="vrPinError" style="font-size:22px;color:#FF3B30;margin-bottom:28px;min-height:28px"></div>\
<div id="vrPinPad" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px;max-width:420px;margin:0 auto"></div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        var enteredPin = '';
        var dots = box.querySelectorAll('.vrPinDot');
        var errorEl = box.querySelector('#vrPinError');
        var padEl = box.querySelector('#vrPinPad');

        var keys = ['1','2','3','4','5','6','7','8','9','','0','\u232b'];
        for (var k = 0; k < keys.length; k++) {
            var btn = document.createElement('div');
            if (keys[k] === '') {
                btn.style.cssText = 'visibility:hidden';
            } else {
                var isBackspace = keys[k] === '\u232b';
                btn.style.cssText = 'width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:' + (isBackspace ? '40px' : '44px') + ';font-weight:500;color:#fff;cursor:pointer;transition:background 0.15s;background:rgba(255,255,255,0.1);margin:0 auto;user-select:none;-webkit-user-select:none';
                btn.setAttribute('data-key', keys[k]);
                btn.onmousedown = function() { this.style.background = 'rgba(255,255,255,0.25)'; };
                btn.onmouseup = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
                btn.onmouseleave = function() { this.style.background = 'rgba(255,255,255,0.1)'; };
                btn.ontouchstart = function(e) { e.preventDefault(); this.style.background = 'rgba(255,255,255,0.25)'; };
                btn.ontouchend = function(e) { e.preventDefault(); this.style.background = 'rgba(255,255,255,0.1)'; handleKey(this.getAttribute('data-key')); };
                btn.onclick = function() { handleKey(this.getAttribute('data-key')); };
            }
            btn.textContent = keys[k];
            padEl.appendChild(btn);
        }

        function updateDots() {
            for (var i = 0; i < 4; i++) {
                if (i < enteredPin.length) { dots[i].style.background = '#9B59B6'; dots[i].style.borderColor = '#9B59B6'; }
                else { dots[i].style.background = 'transparent'; dots[i].style.borderColor = 'rgba(255,255,255,0.3)'; }
            }
        }

        function shakeDots() {
            var container = box.querySelector('#vrPinDots');
            container.style.animation = 'none';
            container.offsetHeight;
            container.style.animation = 'vrPinShake 0.4s ease';
        }

        var style = document.createElement('style');
        style.textContent = '@keyframes vrPinShake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-14px)}40%,80%{transform:translateX(14px)}}';
        document.head.appendChild(style);

        function handleKey(key) {
            errorEl.textContent = '';
            if (key === '\u232b') { if (enteredPin.length > 0) { enteredPin = enteredPin.slice(0, -1); updateDots(); } return; }
            if (enteredPin.length >= 4) return;
            enteredPin += key;
            updateDots();

            if (enteredPin.length === 4) {
                hashPIN(enteredPin).then(function(hashed) {
                    if (hashed === PIN_HASH) {
                        VR._pinAuthenticated = true;
                        for (var i = 0; i < 4; i++) { dots[i].style.background = '#34C759'; dots[i].style.borderColor = '#34C759'; }
                        setTimeout(function() {
                            overlay.style.transition = 'opacity 0.25s'; overlay.style.opacity = '0';
                            setTimeout(function() { overlay.remove(); style.remove(); callback(); }, 250);
                        }, 300);
                    } else {
                        errorEl.textContent = 'Fel PIN-kod'; shakeDots();
                        for (var j = 0; j < 4; j++) { dots[j].style.background = '#FF3B30'; dots[j].style.borderColor = '#FF3B30'; }
                        setTimeout(function() { enteredPin = ''; updateDots(); }, 600);
                    }
                });
            }
        }

        overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); style.remove(); } };
    };

    // ===== SETTINGS OVERLAY =====
    VR.showSettingsOverlay = function() {
        var existing = document.getElementById('vrSettingsOverlay');
        if (existing) { existing.remove(); return; }

        var savedToken = lsGet(LS_TOKEN_KEY) || '';
        var hasToken = savedToken.length > 0;

        var overlay = document.createElement('div');
        overlay.id = 'vrSettingsOverlay';
        overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:99999990;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)';

        var box = document.createElement('div');
        box.style.cssText = 'background:#1C1C1E;border-radius:28px;padding:32px 28px;width:560px;max-width:94vw;max-height:90vh;overflow-y:auto;box-shadow:0 24px 80px rgba(0,0,0,0.6)';

        var tokenStatusText = hasToken
            ? '<span style="color:#4CD964">\u2705 Token sparad</span>'
            : '<span style="color:#FF9500">\u26a0\ufe0f Ingen token</span>';

        box.innerHTML = '\
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">\
<div style="font-size:26px;font-weight:700;color:#fff">\u2699\ufe0f Inst\u00e4llningar</div>\
<div id="vrSettingsClose" style="font-size:28px;color:rgba(255,255,255,0.4);cursor:pointer;padding:4px 8px">\u2715</div>\
</div>\
\
<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:16px">\
<div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:14px">\ud83d\udcc2 Uppdatera turdata</div>\
<div style="font-size:15px;color:rgba(255,255,255,0.5);margin-bottom:16px">Ladda upp en JSON-fil som pushas direkt till GitHub</div>\
<div id="vrGhUploadBtn" style="background:#9B59B6;border-radius:12px;padding:16px;text-align:center;cursor:pointer;user-select:none;-webkit-user-select:none" ontouchstart="this.style.opacity=0.7" ontouchend="this.style.opacity=1" onmousedown="this.style.opacity=0.7" onmouseup="this.style.opacity=1">\
<div style="font-size:18px;font-weight:700;color:#fff">\ud83d\udcc2 V\u00e4lj JSON-fil</div>\
</div>\
<div id="vrGhUploadStatus" style="margin-top:12px;min-height:20px"></div>\
<input type="file" id="vrGhFileInput" accept=".json,application/json" style="display:none">\
</div>\
\
<div style="background:rgba(255,255,255,0.06);border-radius:16px;padding:20px;margin-bottom:16px">\
<div style="font-size:20px;font-weight:700;color:#fff;margin-bottom:14px">\ud83d\udd11 GitHub Token</div>\
<div style="font-size:15px;color:rgba(255,255,255,0.5);margin-bottom:12px">Beh\u00f6vs f\u00f6r att pusha till GitHub \u00b7 ' + tokenStatusText + '</div>\
<input type="password" id="vrTokenInput" placeholder="ghp_xxxxxxxxxxxx" value="' + savedToken + '" style="width:100%;box-sizing:border-box;padding:14px 16px;border-radius:12px;border:2px solid rgba(255,255,255,0.15);background:rgba(255,255,255,0.08);color:#fff;font-size:16px;font-family:monospace;outline:none">\
<div style="display:flex;gap:10px;margin-top:12px">\
<div id="vrTokenSave" style="flex:1;background:#007AFF;border-radius:10px;padding:12px;text-align:center;cursor:pointer;font-size:16px;font-weight:600;color:#fff;user-select:none" ontouchstart="this.style.opacity=0.7" ontouchend="this.style.opacity=1" onmousedown="this.style.opacity=0.7" onmouseup="this.style.opacity=1">Spara token</div>\
<div id="vrTokenClear" style="flex:1;background:rgba(255,59,48,0.15);border-radius:10px;padding:12px;text-align:center;cursor:pointer;font-size:16px;font-weight:600;color:#FF3B30;user-select:none" ontouchstart="this.style.opacity=0.7" ontouchend="this.style.opacity=1" onmousedown="this.style.opacity=0.7" onmouseup="this.style.opacity=1">Rensa token</div>\
</div>\
<div id="vrTokenStatus" style="margin-top:10px;min-height:20px"></div>\
</div>';

        overlay.appendChild(box);
        document.body.appendChild(overlay);

        // Close button
        box.querySelector('#vrSettingsClose').onclick = function() { overlay.remove(); };
        overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };

        // Upload button -> file input
        box.querySelector('#vrGhUploadBtn').onclick = function() {
            box.querySelector('#vrGhFileInput').click();
        };

        // File selected
        box.querySelector('#vrGhFileInput').onchange = function() {
            var statusEl = box.querySelector('#vrGhUploadStatus');
            if (!this.files || this.files.length === 0) return;

            var token = box.querySelector('#vrTokenInput').value.trim();
            if (!token) {
                statusEl.innerHTML = '<div style="font-size:16px;color:#FF9500;padding:12px;background:rgba(255,149,0,0.1);border-radius:10px">\u26a0\ufe0f Ange en GitHub-token f\u00f6rst</div>';
                return;
            }

            var file = this.files[0];
            statusEl.innerHTML = '<div style="font-size:16px;color:#FFD60A;padding:12px;background:rgba(255,214,10,0.1);border-radius:10px">\u23f3 L\u00e4ser ' + file.name + '...</div>';

            var reader = new FileReader();
            reader.onload = function(e) {
                try {
                    var data = JSON.parse(e.target.result);
                    var error = validateTurerJSON(data);
                    if (error) {
                        statusEl.innerHTML = '<div style="font-size:16px;color:#FF3B30;padding:12px;background:rgba(255,59,48,0.1);border-radius:10px">\u274c ' + error + '</div>';
                        return;
                    }

                    // Auto-save token
                    lsSet(LS_TOKEN_KEY, token);

                    // Push to GitHub
                    pushToGitHub(token, e.target.result, statusEl);
                } catch (parseErr) {
                    statusEl.innerHTML = '<div style="font-size:16px;color:#FF3B30;padding:12px;background:rgba(255,59,48,0.1);border-radius:10px">\u274c Ogiltig JSON: ' + parseErr.message + '</div>';
                }
            };
            reader.onerror = function() {
                statusEl.innerHTML = '<div style="font-size:16px;color:#FF3B30;padding:12px;background:rgba(255,59,48,0.1);border-radius:10px">\u274c Kunde inte l\u00e4sa filen</div>';
            };
            reader.readAsText(file);
            this.value = '';
        };

        // Save token
        box.querySelector('#vrTokenSave').onclick = function() {
            var tokenEl = box.querySelector('#vrTokenInput');
            var tokenStatusEl = box.querySelector('#vrTokenStatus');
            var val = tokenEl.value.trim();
            if (!val) {
                tokenStatusEl.innerHTML = '<div style="font-size:14px;color:#FF9500">\u26a0\ufe0f Ange en token</div>';
                return;
            }
            lsSet(LS_TOKEN_KEY, val);
            tokenStatusEl.innerHTML = '<div style="font-size:14px;color:#4CD964">\u2705 Token sparad</div>';
        };

        // Clear token
        box.querySelector('#vrTokenClear').onclick = function() {
            lsRemove(LS_TOKEN_KEY);
            box.querySelector('#vrTokenInput').value = '';
            box.querySelector('#vrTokenStatus').innerHTML = '<div style="font-size:14px;color:#FF3B30">\ud83d\uddd1\ufe0f Token borttagen</div>';
        };
    };

    // ===== LOAD TOUR JSON DATA (session cache > GitHub) =====
    VR.loadTurerJSON = function(callback) {
        if (VR._turerData) { callback(VR._turerData); return; }

        var url = BASE + 'turer-malmo-2026.json?' + Date.now();
        console.log('VR: Fetching tour data from ' + url);

        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.onload = function() {
            if (xhr.status === 200) {
                try {
                    var data = JSON.parse(xhr.responseText);
                    VR._turerData = data;
                    console.log('VR: Loaded ' + (data.turer ? data.turer.length : 0) + ' tours from GitHub');
                    callback(data);
                } catch (e) { console.error('VR: Failed to parse tour JSON', e); callback(null); }
            } else { console.warn('VR: Tour JSON fetch failed, status=' + xhr.status); callback(null); }
        };
        xhr.onerror = function() { console.warn('VR: Tour JSON fetch error'); callback(null); };
        xhr.send();
    };

    // ===== BUILD TOUR LOOKUP MAP =====
    VR.buildTurerLookup = function(turerData) {
        var lookup = {};
        if (!turerData || !turerData.turer) return lookup;

        var weekdayMap = { 'M\u00e5ndag': 'M\u00e5n', 'Tisdag': 'Tis', 'Onsdag': 'Ons', 'Torsdag': 'Tor', 'Fredag': 'Fre', 'L\u00f6rdag': 'L\u00f6r', 'S\u00f6ndag': 'S\u00f6n' };
        VR._weekdayMap = weekdayMap;

        for (var i = 0; i < turerData.turer.length; i++) {
            var t = turerData.turer[i];
            var normTurnr = (t.turnr || '').replace(/\s*-\s*TP$/i, '').trim();
            var key = normTurnr + '_' + t.dag;
            if (!lookup[key]) { lookup[key] = { start: t.start, slut: t.slut, turnr: t.turnr, dag: t.dag }; }
        }

        console.log('VR: Built tour lookup with ' + Object.keys(lookup).length + ' entries');
        return lookup;
    };

    // ===== RESOLVE TOUR TIMES =====
    VR.resolveTourTimes = function(turnr, weekdayFull, weekdayAbbr, lookup) {
        if (!turnr) return null;
        var weekdayMap = VR._weekdayMap || {};
        var abbr = weekdayFull ? (weekdayMap[weekdayFull] || weekdayAbbr) : weekdayAbbr;

        var lookupKey = turnr + '_' + abbr;
        var jsonMatch = lookup[lookupKey] || null;
        if (jsonMatch) return { start: jsonMatch.start, slut: jsonMatch.slut, source: 'json' };

        var turnrNorm = turnr.replace(/\s+/g, '');
        for (var rKey in RESERV_TIDER) {
            if (turnrNorm.toLowerCase() === rKey.toLowerCase()) return { start: RESERV_TIDER[rKey].start, slut: RESERV_TIDER[rKey].slut, source: 'reserv' };
        }

        var digitsOnly = turnr.replace(/\D/g, '');
        if (digitsOnly.length >= 3) {
            var suffix = digitsOnly.slice(-3);
            if (SUFFIX_TIDER[suffix]) return { start: SUFFIX_TIDER[suffix].start, slut: SUFFIX_TIDER[suffix].slut, source: 'suffix' };
        }

        return null;
    };

    // ===== MAIN FUNCTION — direct to schema =====
    VR.doForvantad = function() {
        VR.showPinDialog(function() {
            VR.stopTimer();
            VR.closeOverlay();
            VR.showLoader('F\u00f6rv\u00e4ntat Schema');
            VR.updateLoader(5, 'Ber\u00e4knar period...');

            var target = VR.getNextUnreleasedMonth();
            VR.forvantadStartMonth = target.month;
            VR.forvantadStartYear = target.year;
            VR.forvantadAllDays = {};

            VR.updateLoader(10, 'Navigerar...');
            VR.navigateToLoneredovisningar(function() {
                VR.setupLonePageAndFetch(VR.parseForvantadData);
            });
        });
    };

    // ===== PARSE ALL FUTURE MONTHS =====
    VR.parseForvantadData = function() {
        VR.updateLoader(80, 'Analyserar data...');

        var startMonth = VR.forvantadStartMonth;
        var startYear = VR.forvantadStartYear;
        var currentDateParsed = null;
        var allElements = document.body.querySelectorAll('*');
        var monthsFound = {};

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var text = el.textContent || '';
            var dateMatch = text.match(/^(\d{1,2})-(\d{2})-(\d{4})\s*-\s*(M\u00e5ndag|Tisdag|Onsdag|Torsdag|Fredag|L\u00f6rdag|S\u00f6ndag)(?:\s*-\s*((?:\d{4,6}\w*|[Rr]eserv\s*\d)))?/i);

            if (dateMatch && el.tagName !== 'BODY' && el.tagName !== 'TABLE') {
                var directText = '';
                for (var c = 0; c < el.childNodes.length; c++) { if (el.childNodes[c].nodeType === 3) directText += el.childNodes[c].textContent; }
                if (directText.match(/^\d{1,2}-\d{2}-\d{4}/)) {
                    var parsedMonth = parseInt(dateMatch[2], 10) - 1;
                    var parsedYear = parseInt(dateMatch[3], 10);
                    currentDateParsed = { day: parseInt(dateMatch[1], 10), month: parsedMonth, year: parsedYear, weekday: dateMatch[4], turnr: dateMatch[5] || null };

                    var isRelevant = (parsedYear > startYear) || (parsedYear === startYear && parsedMonth >= startMonth);
                    if (isRelevant) {
                        var monthKey = parsedYear + '-' + ('0' + (parsedMonth + 1)).slice(-2);
                        monthsFound[monthKey] = true;
                        var dayKey = monthKey + '-' + ('0' + currentDateParsed.day).slice(-2);
                        if (!VR.forvantadAllDays[dayKey]) {
                            VR.forvantadAllDays[dayKey] = { day: currentDateParsed.day, month: parsedMonth, year: parsedYear, weekday: currentDateParsed.weekday, turnr: null, fp: null, obMinutes: 0 };
                        }
                        if (currentDateParsed.turnr) VR.forvantadAllDays[dayKey].turnr = currentDateParsed.turnr;
                    }
                }
            }

            if (el.tagName === 'TABLE' && currentDateParsed) {
                var isRelevant2 = (currentDateParsed.year > startYear) || (currentDateParsed.year === startYear && currentDateParsed.month >= startMonth);
                if (isRelevant2) {
                    var mk = currentDateParsed.year + '-' + ('0' + (currentDateParsed.month + 1)).slice(-2);
                    var dk = mk + '-' + ('0' + currentDateParsed.day).slice(-2);
                    var rows = el.querySelectorAll('tr');
                    for (var r = 0; r < rows.length; r++) {
                        var cells = rows[r].querySelectorAll('td, th');
                        if (cells.length < 2) continue;
                        var col1 = cells[0] ? cells[0].textContent.trim() : '';
                        var col2 = cells[1] ? cells[1].textContent.trim() : '';
                        if (col1.toLowerCase() === 'l\u00f6neslag') continue;

                        if (col1.indexOf('S.Fr\u00e5nvaro') > -1 && col1.indexOf('FRIDAG') > -1) { if (VR.forvantadAllDays[dk]) VR.forvantadAllDays[dk].fp = 'FP'; }
                        else if (col1.indexOf('S.Fr\u00e5nvaro') > -1 && (col1.indexOf('FV') > -1 || col1.indexOf('FP2') > -1 || col1.indexOf('FP-V') > -1)) { if (VR.forvantadAllDays[dk]) VR.forvantadAllDays[dk].fp = 'FPV'; }

                        if (col1 === 'L.Hb' || col1 === 'L.Storhelgstill\u00e4gg') {
                            var timeMatch = col2.match(/(\d+):(\d+)/);
                            if (timeMatch && VR.forvantadAllDays[dk]) {
                                VR.forvantadAllDays[dk].obMinutes += parseInt(timeMatch[1], 10) * 60 + parseInt(timeMatch[2], 10);
                            }
                        }
                    }
                }
            }
        }

        console.log('VR: Parsed ' + Object.keys(VR.forvantadAllDays).length + ' days across ' + Object.keys(monthsFound).length + ' months');

        VR.updateLoader(88, 'H\u00e4mtar turdata...');
        VR.loadTurerJSON(function(turerData) {
            VR.forvantadLookup = VR.buildTurerLookup(turerData);
            VR.updateLoader(95, 'Bygger vy...');
            setTimeout(VR.renderForvantad, 300);
        });
    };

    // ===== RENDER FORVANTAD SCHEMA =====
    VR.renderForvantad = function() {
        var monthNames = ['Januari', 'Februari', 'Mars', 'April', 'Maj', 'Juni', 'Juli', 'Augusti', 'September', 'Oktober', 'November', 'December'];
        var weekdayNames = ['S\u00f6n', 'M\u00e5n', 'Tis', 'Ons', 'Tor', 'Fre', 'L\u00f6r'];
        var lookup = VR.forvantadLookup || {};
        var allDays = VR.forvantadAllDays;
        var sortedKeys = Object.keys(allDays).sort();

        if (sortedKeys.length === 0) {
            VR.hideLoader();
            VR.showView('', '', '<div style="padding:40px;text-align:center;color:#999;font-size:22px">Ingen data hittades</div>');
            return;
        }

        var monthsMap = {};
        for (var k = 0; k < sortedKeys.length; k++) {
            var rec = allDays[sortedKeys[k]];
            var mKey = rec.year + '-' + ('0' + (rec.month + 1)).slice(-2);
            if (!monthsMap[mKey]) monthsMap[mKey] = { month: rec.month, year: rec.year };
        }
        var monthKeys = Object.keys(monthsMap).sort();

        var monthGroups = [];
        var matchedCount = 0;
        var totalTurDays = 0;

        for (var mi = 0; mi < monthKeys.length; mi++) {
            var mInfo = monthsMap[monthKeys[mi]];
            var daysInMonth = new Date(mInfo.year, mInfo.month + 1, 0).getDate();
            var monthDays = [];

            for (var d = 1; d <= daysInMonth; d++) {
                var dKey = mInfo.year + '-' + ('0' + (mInfo.month + 1)).slice(-2) + '-' + ('0' + d).slice(-2);
                var dayRec = allDays[dKey] || null;
                var date = new Date(mInfo.year, mInfo.month, d);
                var weekday = date.getDay();
                var isWeekend = (weekday === 0 || weekday === 6);
                var weekdayName = weekdayNames[weekday];
                var hasData = !!dayRec;
                var turnr = dayRec ? dayRec.turnr : null;
                var fp = dayRec ? dayRec.fp : null;
                var obMin = dayRec ? dayRec.obMinutes : 0;

                var resolved = null;
                if (turnr) {
                    totalTurDays++;
                    resolved = VR.resolveTourTimes(turnr, dayRec ? dayRec.weekday : null, weekdayName, lookup);
                    if (resolved) matchedCount++;
                }

                var dayData = { day: d, weekday: weekdayName, isWeekend: isWeekend, hasData: hasData, isFree: !!fp, freeType: fp, hasOB: obMin > 0, obMinutes: obMin, startTime: null, endTime: null, duration: null, turnr: turnr, resolved: resolved };

                if (fp) { /* free */ }
                else if (resolved) {
                    dayData.startTime = resolved.start; dayData.endTime = resolved.slut;
                    var sP = resolved.start.split(':'), eP = resolved.slut.split(':');
                    var sMin = parseInt(sP[0], 10) * 60 + parseInt(sP[1], 10);
                    var eMin = parseInt(eP[0], 10) * 60 + parseInt(eP[1], 10);
                    if (eMin < sMin) eMin += 24 * 60;
                    dayData.duration = eMin - sMin;
                } else if (!hasData) { /* unknown */ }
                else if (isWeekend && obMin > 0) { dayData.duration = obMin; }
                else if (!isWeekend && obMin > 0) {
                    var sm = 6 * 60 - obMin; dayData.startTime = VR.minutesToTime(sm); dayData.endTime = VR.minutesToTime(sm + 8 * 60); dayData.duration = 8 * 60;
                } else if (!isWeekend && hasData && !turnr) { dayData.startTime = '06:00'; dayData.endTime = '16:00'; dayData.duration = 10 * 60; }

                monthDays.push(dayData);
            }
            monthGroups.push({ month: mInfo.month, year: mInfo.year, name: monthNames[mInfo.month], days: monthDays });
        }

        console.log('VR: Resolved ' + matchedCount + '/' + totalTurDays + ' tours');

        var firstMonth = monthGroups[0], lastMonth = monthGroups[monthGroups.length - 1];
        var periodText = monthGroups.length === 1
            ? firstMonth.name + ' ' + firstMonth.year
            : firstMonth.name + ' \u2013 ' + lastMonth.name + ' ' + lastMonth.year;

        var html = VR.buildForvantadHeader(periodText, matchedCount, totalTurDays, monthGroups.length);
        for (var gi = 0; gi < monthGroups.length; gi++) html += VR.buildMonthSection(monthGroups[gi], gi === 0);

        VR.hideLoader();
        VR.showView('', '', html);
    };

    // ===== HELPERS =====
    VR.minutesToTime = function(minutes) {
        if (minutes < 0) minutes += 24 * 60;
        var h = Math.floor(minutes / 60) % 24, m = minutes % 60;
        return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2);
    };

    VR.formatDuration = function(totalMinutes) {
        var h = Math.floor(totalMinutes / 60), m = totalMinutes % 60;
        return m === 0 ? h + 'h' : h + 'h' + ('0' + m).slice(-2) + 'm';
    };

    VR.getSourceLabel = function(source) {
        if (source === 'json') return '';
        if (source === 'reserv') return 'R';
        if (source === 'suffix') return 'S';
        return '';
    };

    // ===== BUILD HEADER (with settings button) =====
    VR.buildForvantadHeader = function(periodText, matchedCount, totalTurDays, monthCount) {
        var matchLine = totalTurDays > 0
            ? '<div style="font-size:16px;color:#4CD964;margin-top:4px">\u2713 ' + matchedCount + '/' + totalTurDays + ' turer matchade</div>'
            : '<div style="font-size:16px;color:#FF9500;margin-top:4px">Ingen turdata tillg\u00e4nglig</div>';

        return '\
<div style="background:#fff;border-radius:20px;padding:18px 24px;margin-bottom:14px;text-align:center;box-shadow:0 4px 14px rgba(0,0,0,0.08);position:relative">\
<div onclick="VR.showSettingsOverlay()" style="position:absolute;top:14px;right:18px;font-size:28px;cursor:pointer;padding:4px;user-select:none;-webkit-user-select:none" title="Inst\u00e4llningar">\u2699\ufe0f</div>\
<div style="font-size:28px;font-weight:700;color:#333">' + periodText + '</div>\
<div style="font-size:16px;color:#8E8E93;margin-top:5px">F\u00f6rv\u00e4ntat schema \u00b7 ' + monthCount + ' m\u00e5nader (ej officiellt)</div>\
' + matchLine + '\
</div>';
    };

    // ===== BUILD MONTH SECTION =====
    VR.buildMonthSection = function(group, isFirst) {
        var html = '';
        html += '<div style="background:#1C1C1E;border-radius:' + (isFirst ? '27px 27px' : '20px 20px') + ' 0 0;padding:18px 20px;margin-top:' + (isFirst ? '0' : '18px') + ';display:flex;justify-content:space-between;align-items:center"><div style="font-size:22px;font-weight:700;color:#fff">' + group.name + ' ' + group.year + '</div><div style="font-size:15px;color:rgba(255,255,255,0.5)">' + group.days.length + ' dagar</div></div>';

        html += '<div style="display:grid;grid-template-columns:1.2fr 0.6fr 0.6fr 0.6fr 1.2fr;gap:8px;padding:12px 20px;background:#2C2C2E">';
        var cols = ['Dag', 'Start', 'Slut', 'Tid', 'Tur'];
        for (var ci = 0; ci < cols.length; ci++) {
            html += '<div style="font-size:14px;font-weight:600;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:0.5px' + (ci === 4 ? ';text-align:right' : '') + '">' + cols[ci] + '</div>';
        }
        html += '</div>';

        html += '<div style="background:#fff;border-radius:0 0 27px 27px;overflow:hidden;box-shadow:0 5px 20px rgba(0,0,0,0.08)">';

        for (var i = 0; i < group.days.length; i++) {
            var day = group.days[i];
            var bgCol = i % 2 === 0 ? '#fff' : '#FAFAFA';
            var noData = !day.hasData && !day.isFree;
            var rowBg;
            if (day.isFree) rowBg = day.freeType === 'FPV' ? '#4CD964' : '#34C759';
            else if (noData) rowBg = '#F0F0F0';
            else rowBg = (day.isWeekend ? 'rgba(255,149,0,0.06)' : '') || bgCol;

            html += '<div style="display:grid;grid-template-columns:1.2fr 0.6fr 0.6fr 0.6fr 1.2fr;gap:8px;padding:14px 20px;background:' + rowBg + ';border-bottom:1px solid #EBEBEB;align-items:center">';

            var dayColor = day.isFree ? '#fff' : (noData ? '#999' : (day.isWeekend ? '#FF9500' : '#333'));
            html += '<div style="color:' + dayColor + '"><div style="font-size:22px;font-weight:700;line-height:1.3">' + day.weekday + ' ' + ('0' + day.day).slice(-2) + '</div>';
            if (day.isFree) html += '<div style="font-size:15px;font-weight:500;opacity:0.85">' + day.freeType + '</div>';
            html += '</div>';

            var startVal = '\u2014', slutVal = '\u2014', tidVal = '\u2014', turVal = '';
            var isResolved = !!day.resolved;

            if (day.isFree) { startVal = ''; slutVal = ''; tidVal = ''; }
            else if (noData) { startVal = '?'; slutVal = '?'; tidVal = '?'; }
            else if (isResolved) { startVal = day.startTime; slutVal = day.endTime; tidVal = VR.formatDuration(day.duration); turVal = day.turnr; }
            else if (day.turnr) {
                turVal = day.turnr;
                if (day.hasOB && day.startTime) { startVal = day.startTime; slutVal = '~'; tidVal = '~'; }
                else if (day.isWeekend && day.hasOB) { startVal = '?'; slutVal = '?'; tidVal = VR.formatDuration(day.duration); }
                else if (day.startTime && day.endTime) { startVal = day.startTime; slutVal = day.endTime; tidVal = '~'; }
            } else if (day.isWeekend && day.hasOB) { startVal = '?'; slutVal = '?'; tidVal = VR.formatDuration(day.duration); }
            else if (day.hasOB && day.startTime) { startVal = day.startTime; slutVal = '~'; tidVal = '~'; }
            else if (day.startTime && day.endTime) { startVal = day.startTime; slutVal = day.endTime; tidVal = '~'; }

            var valColor = day.isFree ? '#fff' : (noData ? '#aaa' : '#333');
            var dimColor = day.isFree ? '#fff' : '#aaa';
            var accentColor = isResolved ? '#007AFF' : valColor;

            var sColor = (startVal === '?' || startVal === '~' || startVal === '\u2014') ? dimColor : accentColor;
            html += '<div style="font-size:22px;font-weight:' + (isResolved ? '700' : '400') + ';color:' + sColor + '">' + startVal + '</div>';

            var eColor = (slutVal === '?' || slutVal === '~' || slutVal === '\u2014') ? dimColor : accentColor;
            html += '<div style="font-size:22px;font-weight:' + (isResolved ? '700' : '400') + ';color:' + eColor + '">' + slutVal + '</div>';

            var tColor = (tidVal === '?' || tidVal === '~' || tidVal === '\u2014') ? dimColor : valColor;
            html += '<div style="font-size:20px;color:' + tColor + '">' + tidVal + '</div>';

            if (turVal) {
                var sourceLabel = day.resolved ? VR.getSourceLabel(day.resolved.source) : '';
                var turIcons = VR.getForvantadIcons(turVal);
                var turBg, turTxtColor;
                if (day.resolved && day.resolved.source === 'json') { turBg = 'rgba(0,122,255,0.1)'; turTxtColor = '#007AFF'; }
                else if (day.resolved && day.resolved.source === 'reserv') { turBg = 'rgba(155,89,182,0.12)'; turTxtColor = '#9B59B6'; }
                else if (day.resolved && day.resolved.source === 'suffix') { turBg = 'rgba(76,217,100,0.12)'; turTxtColor = '#2ECC71'; }
                else { turBg = 'rgba(0,0,0,0.05)'; turTxtColor = '#999'; }
                var badgeText = sourceLabel ? turVal + ' ' + sourceLabel : turVal;
                html += '<div style="text-align:right;line-height:1.4"><span style="font-size:16px;font-weight:600;color:' + turTxtColor + ';background:' + turBg + ';padding:5px 10px;border-radius:8px;display:inline-block">' + badgeText + '</span>' + turIcons + '</div>';
            } else if (day.isFree || noData) { html += '<div></div>'; }
            else { html += '<div style="text-align:right;font-size:16px;color:#ccc">\u2014</div>'; }

            html += '</div>';
        }

        html += '</div>';
        return html;
    };

    console.log('VR: F\u00f6rv\u00e4ntat loaded');
})();
